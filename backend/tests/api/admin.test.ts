/**
 * Tests: Admin API routes
 *
 * Covers:
 *  - GET   /api/admin/stats
 *  - GET   /api/admin/applications
 *  - GET   /api/admin/applications/[id]
 *  - PATCH /api/admin/applications/[id]  (approve, reject, review)
 *
 * All admin routes require PLATFORM_ADMIN role.
 * Key business rules:
 *   - Approving creates a Nonprofit record + links OWNER admin
 *   - Cannot approve own application (self-approval guard)
 *   - Sends emails non-blocking (failure never breaks the response)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statsRoute } from "@/app/api/admin/stats/route";
import { GET as appsList } from "@/app/api/admin/applications/route";
import {
  GET as appGet,
  PATCH as appPatch,
} from "@/app/api/admin/applications/[id]/route";
import { GET, PATCH, routeParams, SESSION_DONOR, SESSION_ADMIN, NONPROFIT } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  const $transaction = vi.fn();
  return {
    $transaction,
    user: { count: vi.fn(), findUnique: vi.fn() },
    nonprofit: { count: vi.fn(), create: vi.fn() },
    donation: { aggregate: vi.fn() },
    nonprofitApplication: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    nonprofitAdmin: { upsert: vi.fn() },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── Shared application fixture ───────────────────────────────────────────────

const APPLICATION = {
  id: "app-1",
  orgName: "Local Arts Fund",
  ein: "82-1234567",
  category: "ARTS",
  description: "Supporting local artists.",
  website: null,
  submittedByEmail: "jordan@example.com",
  submittedByName: "Jordan Lee",
  status: "PENDING",
  isClaim: false,
  nonprofitId: null,
  reviewNotes: null,
  reviewedAt: null,
  reviewedByUserId: null,
  createdAt: new Date("2025-03-01"),
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.user.count.mockResolvedValue(250);
    mockPrisma.nonprofit.count.mockResolvedValue(40);
    mockPrisma.donation.aggregate.mockResolvedValue({
      _count: { id: 1200 },
      _sum: { amountCents: 5_000_000 },
    });
    mockPrisma.nonprofitApplication.count.mockResolvedValue(7);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await statsRoute(GET("/api/admin/stats"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not a PLATFORM_ADMIN", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await statsRoute(GET("/api/admin/stats"));
    expect(res.status).toBe(403);
  });

  it("returns all platform statistics for an admin", async () => {
    const res = await statsRoute(GET("/api/admin/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUsers).toBe(250);
    expect(body.totalNonprofits).toBe(40);
    expect(body.totalDonations).toBe(1200);
    expect(body.totalAmountCents).toBe(5_000_000);
    expect(body.pendingApplications).toBe(7);
  });

  it("returns totalAmountCents as 0 when there are no donations", async () => {
    mockPrisma.donation.aggregate.mockResolvedValue({
      _count: { id: 0 },
      _sum: { amountCents: null },
    });
    const res = await statsRoute(GET("/api/admin/stats"));
    const body = await res.json();
    expect(body.totalAmountCents).toBe(0);
    expect(body.totalDonations).toBe(0);
  });
});

// ─── GET /api/admin/applications ─────────────────────────────────────────────

describe("GET /api/admin/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofitApplication.findMany.mockResolvedValue([APPLICATION]);
    mockPrisma.nonprofitApplication.count.mockResolvedValue(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await appsList(GET("/api/admin/applications"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await appsList(GET("/api/admin/applications"));
    expect(res.status).toBe(403);
  });

  it("returns a paginated list of applications for an admin", async () => {
    const res = await appsList(GET("/api/admin/applications"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applications).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("filters by status when a valid status query param is provided", async () => {
    await appsList(GET("/api/admin/applications", { searchParams: { status: "PENDING" } }));
    expect(mockPrisma.nonprofitApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("returns 400 for an invalid status filter", async () => {
    const res = await appsList(GET("/api/admin/applications", { searchParams: { status: "INVALID" } }));
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/admin/applications/[id] ────────────────────────────────────────

describe("GET /api/admin/applications/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(APPLICATION);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await appGet(GET("/api/admin/applications/app-1"), routeParams({ id: "app-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await appGet(GET("/api/admin/applications/app-1"), routeParams({ id: "app-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the application does not exist", async () => {
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(null);
    const res = await appGet(GET("/api/admin/applications/bad"), routeParams({ id: "bad" }));
    expect(res.status).toBe(404);
  });

  it("returns the full application details for an admin", async () => {
    const res = await appGet(GET("/api/admin/applications/app-1"), routeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application.id).toBe("app-1");
    expect(body.application.orgName).toBe(APPLICATION.orgName);
  });
});

// ─── PATCH /api/admin/applications/[id] — REJECTED ───────────────────────────

describe("PATCH /api/admin/applications/[id] — reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(APPLICATION);
    mockPrisma.nonprofitApplication.update.mockResolvedValue({
      ...APPLICATION,
      status: "REJECTED",
      reviewNotes: "EIN could not be verified.",
    });
  });

  it("returns 422 for an invalid status value", async () => {
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "INVALID" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 when the application does not exist", async () => {
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(null);
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "REJECTED" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(404);
  });

  it("marks the application as REJECTED and returns the updated record", async () => {
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", {
        status: "REJECTED",
        reviewNotes: "EIN could not be verified.",
      }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application.status).toBe("REJECTED");
  });

  it("sends a rejection email to the applicant (non-blocking)", async () => {
    const { sendEmail } = await import("@/lib/email");
    await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "REJECTED" }),
      routeParams({ id: "app-1" })
    );
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: APPLICATION.submittedByEmail })
    );
  });

  it("still returns 200 even if the rejection email fails", async () => {
    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP error"));
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "REJECTED" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/admin/applications/[id] — APPROVED ───────────────────────────

describe("PATCH /api/admin/applications/[id] — approve", () => {
  const approvedApp = {
    ...APPLICATION,
    status: "APPROVED",
    nonprofitId: NONPROFIT.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(APPLICATION);

    // Simulate $transaction: runs the callback with the same prisma mock
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
    );
    mockPrisma.nonprofit.create.mockResolvedValue(NONPROFIT);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "submitter-user-1" });
    mockPrisma.nonprofitAdmin.upsert.mockResolvedValue({});
    mockPrisma.nonprofitApplication.update.mockResolvedValue(approvedApp);
  });

  it("returns 409 when trying to approve an already-approved application", async () => {
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue({
      ...APPLICATION,
      status: "APPROVED",
    });
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(409);
  });

  it("prevents an admin from approving their own application", async () => {
    // Submitter email matches the admin's email
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue({
      ...APPLICATION,
      submittedByEmail: SESSION_ADMIN.user.email,
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: SESSION_ADMIN.user.id });
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("own") });
  });

  it("runs approval side-effects inside a transaction", async () => {
    await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("creates a new Nonprofit record on approval", async () => {
    await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(mockPrisma.nonprofit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ein: APPLICATION.ein }),
      })
    );
  });

  it("links the submitter as an OWNER admin", async () => {
    await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(mockPrisma.nonprofitAdmin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: "OWNER" }),
      })
    );
  });

  it("sends an approval email to the applicant (non-blocking)", async () => {
    const { sendEmail } = await import("@/lib/email");
    await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "APPROVED" }),
      routeParams({ id: "app-1" })
    );
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: APPLICATION.submittedByEmail })
    );
  });
});

// ─── PATCH /api/admin/applications/[id] — UNDER_REVIEW ───────────────────────

describe("PATCH /api/admin/applications/[id] — mark under review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofitApplication.findUnique.mockResolvedValue(APPLICATION);
    mockPrisma.nonprofitApplication.update.mockResolvedValue({
      ...APPLICATION,
      status: "UNDER_REVIEW",
    });
  });

  it("updates the status to UNDER_REVIEW without sending any email", async () => {
    const { sendEmail } = await import("@/lib/email");
    const res = await appPatch(
      PATCH("/api/admin/applications/app-1", { status: "UNDER_REVIEW" }),
      routeParams({ id: "app-1" })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });
});
