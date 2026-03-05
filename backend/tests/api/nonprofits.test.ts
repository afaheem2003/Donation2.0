/**
 * Tests: Nonprofit API routes
 *
 * Covers:
 *  - GET  /api/nonprofits           (paginated search + filter)
 *  - GET  /api/nonprofits/[id]      (nonprofit detail + stats)
 *  - POST /api/nonprofits/[id]/follow
 *  - POST /api/portal/apply         (submit application)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as nonprofitsList } from "@/app/api/nonprofits/route";
import { GET as nonprofitDetail } from "@/app/api/nonprofits/[id]/route";
import { POST as nonprofitFollow } from "@/app/api/nonprofits/[id]/follow/route";
import { POST as applyRoute } from "@/app/api/portal/apply/route";
import { GET, POST, routeParams, SESSION_DONOR, NONPROFIT } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  nonprofit: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  nonprofitFollow: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  nonprofitApplication: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  donation: { aggregate: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── GET /api/nonprofits ──────────────────────────────────────────────────────

describe("GET /api/nonprofits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.nonprofit.findMany.mockResolvedValue([NONPROFIT]);
    mockPrisma.nonprofit.count.mockResolvedValue(1);
  });

  it("returns a list of nonprofits with pagination metadata", async () => {
    const res = await nonprofitsList(GET("/api/nonprofits"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonprofits).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.pages).toBeDefined();
  });

  it("filters by category when a valid category is provided", async () => {
    await nonprofitsList(GET("/api/nonprofits", { searchParams: { category: "HEALTH" } }));
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "HEALTH" }),
      })
    );
  });

  it("returns 400 for an invalid category", async () => {
    const res = await nonprofitsList(GET("/api/nonprofits", { searchParams: { category: "ANIMAL_WELFARE" } }));
    expect(res.status).toBe(400);
  });

  it("searches name, description, and EIN when a query is provided", async () => {
    await nonprofitsList(GET("/api/nonprofits", { searchParams: { search: "doctors" } }));
    const call = mockPrisma.nonprofit.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.objectContaining({ contains: "doctors" }) }),
      ])
    );
  });

  it("defaults to page 1 with 12 results per page", async () => {
    await nonprofitsList(GET("/api/nonprofits"));
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 12, skip: 0 })
    );
  });

  it("skips 12 results for page 2", async () => {
    await nonprofitsList(GET("/api/nonprofits", { searchParams: { page: "2" } }));
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 12 })
    );
  });

  it("sorts verified nonprofits first", async () => {
    await nonprofitsList(GET("/api/nonprofits"));
    const call = mockPrisma.nonprofit.findMany.mock.calls[0][0];
    const orderBy = call.orderBy;
    const verifiedSort = Array.isArray(orderBy)
      ? orderBy.find((o: Record<string, string>) => o.verified)
      : null;
    expect(verifiedSort?.verified).toBe("desc");
  });
});

// ─── GET /api/nonprofits/[id] ─────────────────────────────────────────────────

describe("GET /api/nonprofits/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockPrisma.nonprofit.findUnique.mockResolvedValue({
      ...NONPROFIT,
      _count: { donations: 10, posts: 5 },
    });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountCents: 150000 } });
    mockPrisma.nonprofitFollow.count.mockResolvedValue(42);
    mockPrisma.nonprofitFollow.findUnique.mockResolvedValue(null);
  });

  it("returns 404 when the nonprofit does not exist", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);
    const res = await nonprofitDetail(GET("/api/nonprofits/bad-id"), routeParams({ id: "bad-id" }));
    expect(res.status).toBe(404);
  });

  it("returns nonprofit with totalRaisedCents and followerCount", async () => {
    const res = await nonprofitDetail(GET(`/api/nonprofits/${NONPROFIT.id}`), routeParams({ id: NONPROFIT.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(NONPROFIT.name);
    expect(body.totalRaisedCents).toBe(150000);
    expect(body.followerCount).toBe(42);
  });

  it("returns totalRaisedCents as 0 when there are no succeeded donations", async () => {
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountCents: null } });
    const res = await nonprofitDetail(GET(`/api/nonprofits/${NONPROFIT.id}`), routeParams({ id: NONPROFIT.id }));
    const body = await res.json();
    expect(body.totalRaisedCents).toBe(0);
  });

  it("returns viewerFollowing: false for unauthenticated visitors", async () => {
    const res = await nonprofitDetail(GET(`/api/nonprofits/${NONPROFIT.id}`), routeParams({ id: NONPROFIT.id }));
    const body = await res.json();
    expect(body.viewerFollowing).toBe(false);
  });

  it("returns viewerFollowing: true when an authenticated user follows the nonprofit", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofitFollow.findUnique.mockResolvedValue({ id: "follow-1" });
    const res = await nonprofitDetail(GET(`/api/nonprofits/${NONPROFIT.id}`), routeParams({ id: NONPROFIT.id }));
    const body = await res.json();
    expect(body.viewerFollowing).toBe(true);
  });
});

// ─── POST /api/nonprofits/[id]/follow ────────────────────────────────────────

describe("POST /api/nonprofits/[id]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofitFollow.findUnique.mockResolvedValue(null);
    mockPrisma.nonprofitFollow.create.mockResolvedValue({});
    mockPrisma.nonprofitFollow.count.mockResolvedValue(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await nonprofitFollow(POST(`/api/nonprofits/${NONPROFIT.id}/follow`), routeParams({ id: NONPROFIT.id }));
    expect(res.status).toBe(401);
  });

  it("creates a follow and returns { following: true } on first follow", async () => {
    const res = await nonprofitFollow(POST(`/api/nonprofits/${NONPROFIT.id}/follow`), routeParams({ id: NONPROFIT.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ following: true, followerCount: 1 });
    expect(mockPrisma.nonprofitFollow.create).toHaveBeenCalledOnce();
  });

  it("deletes the follow and returns { following: false } on unfollow", async () => {
    mockPrisma.nonprofitFollow.findUnique.mockResolvedValue({ id: "nf-1" });
    mockPrisma.nonprofitFollow.delete.mockResolvedValue({});
    mockPrisma.nonprofitFollow.count.mockResolvedValue(0);
    const res = await nonprofitFollow(POST(`/api/nonprofits/${NONPROFIT.id}/follow`), routeParams({ id: NONPROFIT.id }));
    expect(await res.json()).toMatchObject({ following: false, followerCount: 0 });
    expect(mockPrisma.nonprofitFollow.delete).toHaveBeenCalledOnce();
  });
});

// ─── POST /api/portal/apply ───────────────────────────────────────────────────

describe("POST /api/portal/apply", () => {
  const validBody = {
    orgName: "Local Arts Fund",
    ein: "82-1234567",
    category: "ARTS",
    description: "Supporting local artists and cultural institutions in our community.",
    website: "https://localartsfund.org",
    submittedByEmail: "jordan@localartsfund.org",
    submittedByName: "Jordan Lee",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);    // no existing nonprofit
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue(null); // no pending app
    mockPrisma.nonprofitApplication.create.mockResolvedValue({ id: "app-new-99" });
  });

  it("returns 422 when required fields are missing", async () => {
    const res = await applyRoute(POST("/api/portal/apply", { orgName: "Only name" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when EIN is in wrong format", async () => {
    const res = await applyRoute(POST("/api/portal/apply", { ...validBody, ein: "123-456789" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when description is too short (< 20 chars)", async () => {
    const res = await applyRoute(POST("/api/portal/apply", { ...validBody, description: "Too short." }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when an invalid category is provided", async () => {
    const res = await applyRoute(POST("/api/portal/apply", { ...validBody, category: "INVALID_CATEGORY" }));
    expect(res.status).toBe(422);
  });

  it("returns 409 when a nonprofit with that EIN already exists", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue({ id: "existing-np" });
    const res = await applyRoute(POST("/api/portal/apply", validBody));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("already registered") });
  });

  it("returns 409 when an application with that EIN is already under review", async () => {
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue({ id: "pending-app" });
    const res = await applyRoute(POST("/api/portal/apply", validBody));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("already under review") });
  });

  it("creates a PENDING application and returns 201 with applicationId", async () => {
    const res = await applyRoute(POST("/api/portal/apply", validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ applicationId: "app-new-99" });
    expect(mockPrisma.nonprofitApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) })
    );
  });

  it("sends a confirmation email to the applicant (non-blocking)", async () => {
    const { sendEmail } = await import("@/lib/email");
    await applyRoute(POST("/api/portal/apply", validBody));
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: validBody.submittedByEmail })
    );
  });

  it("still returns 201 even if the confirmation email fails", async () => {
    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP error"));
    const res = await applyRoute(POST("/api/portal/apply", validBody));
    expect(res.status).toBe(201);
  });
});
