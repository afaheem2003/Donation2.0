/**
 * Tests: Portal API routes
 *
 * Covers:
 *  - GET  /api/portal/me                                           (list orgs the authed user manages)
 *  - GET  /api/portal/invite/[token]                              (validate invite token)
 *  - POST /api/portal/invite/[token]/accept                       (accept invite)
 *  - PATCH /api/portal/nonprofits/[nonprofitId]/profile           (update org profile)
 *  - GET  /api/portal/nonprofits/[nonprofitId]/team               (list admins + pending invites)
 *  - POST /api/portal/nonprofits/[nonprofitId]/team/invite        (send invite, OWNER only)
 *  - PATCH /api/portal/nonprofits/[nonprofitId]/team/[adminId]    (change admin role, OWNER only)
 *  - DELETE /api/portal/nonprofits/[nonprofitId]/team/[adminId]   (remove admin, OWNER only)
 *  - GET  /api/portal/nonprofits/[nonprofitId]/analytics          (donation summary + trends)
 *  - GET  /api/portal/nonprofits/[nonprofitId]/donations          (paginated list + CSV export)
 *
 * Portal access is gated by requirePortalAccess() — mocked to return a
 * PortalSession on success or a 401/403 NextResponse on failure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as portalMeRoute } from "@/app/api/portal/me/route";
import { GET as inviteGetRoute } from "@/app/api/portal/invite/[token]/route";
import { POST as inviteAcceptRoute } from "@/app/api/portal/invite/[token]/accept/route";
import { PATCH as profileRoute } from "@/app/api/portal/nonprofits/[nonprofitId]/profile/route";
import { GET as teamRoute } from "@/app/api/portal/nonprofits/[nonprofitId]/team/route";
import { POST as teamInviteRoute } from "@/app/api/portal/nonprofits/[nonprofitId]/team/invite/route";
import {
  PATCH as teamMemberPatch,
  DELETE as teamMemberDelete,
} from "@/app/api/portal/nonprofits/[nonprofitId]/team/[adminId]/route";
import { GET as analyticsRoute } from "@/app/api/portal/nonprofits/[nonprofitId]/analytics/route";
import { GET as donationsRoute } from "@/app/api/portal/nonprofits/[nonprofitId]/donations/route";
import {
  GET, POST, PATCH, DELETE, routeParams, SESSION_DONOR, SESSION_ADMIN, NONPROFIT, DONATION,
} from "../setup";
import { NextResponse } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  nonprofitAdmin: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  adminInvite: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  nonprofit: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  donation: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

// Mock portalAuth so portal routes don't need a real DB nonprofitAdmin lookup.
// isPortalError uses instanceof — keep it simple: check for NextResponse instance.
vi.mock("@/lib/portalAuth", () => ({
  requirePortalAccess: vi.fn(),
  isPortalError: (result: unknown) => result instanceof NextResponse,
}));

import { getSession } from "@/lib/getSession";
import { requirePortalAccess } from "@/lib/portalAuth";
const mockGetSession = vi.mocked(getSession);
const mockRequirePortalAccess = vi.mocked(requirePortalAccess);

// ─── Shared portal session fixture ────────────────────────────────────────────

const PORTAL_ADMIN: ReturnType<typeof buildPortalSession> = buildPortalSession("ADMIN");
const PORTAL_OWNER: ReturnType<typeof buildPortalSession> = buildPortalSession("OWNER");

function buildPortalSession(role: "ADMIN" | "OWNER") {
  return {
    session: {
      user: {
        id: SESSION_DONOR.user.id,
        username: SESSION_DONOR.user.username,
        role: SESSION_DONOR.user.role,
        email: SESSION_DONOR.user.email,
      },
    },
    adminRole: role,
  };
}

function portal401() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
function portal403() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── GET /api/portal/me ───────────────────────────────────────────────────────

describe("GET /api/portal/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofitAdmin.findMany.mockResolvedValue([
      {
        role: "OWNER",
        nonprofit: {
          id: NONPROFIT.id,
          name: NONPROFIT.name,
          logoUrl: null,
          verified: true,
          stripeConnect: { status: "ACTIVE" },
        },
      },
    ]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await portalMeRoute(GET("/api/portal/me"));
    expect(res.status).toBe(401);
  });

  it("returns the list of nonprofits the user manages", async () => {
    const res = await portalMeRoute(GET("/api/portal/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonprofits).toHaveLength(1);
    expect(body.nonprofits[0].id).toBe(NONPROFIT.id);
    expect(body.nonprofits[0].role).toBe("OWNER");
  });

  it("returns stripeConnectStatus from connected account", async () => {
    const res = await portalMeRoute(GET("/api/portal/me"));
    const body = await res.json();
    expect(body.nonprofits[0].stripeConnectStatus).toBe("ACTIVE");
  });

  it("returns NOT_CONNECTED when no stripeConnect record exists", async () => {
    mockPrisma.nonprofitAdmin.findMany.mockResolvedValue([
      {
        role: "ADMIN",
        nonprofit: {
          id: NONPROFIT.id,
          name: NONPROFIT.name,
          logoUrl: null,
          verified: false,
          stripeConnect: null,
        },
      },
    ]);
    const res = await portalMeRoute(GET("/api/portal/me"));
    const body = await res.json();
    expect(body.nonprofits[0].stripeConnectStatus).toBe("NOT_CONNECTED");
  });

  it("returns an empty array when the user manages no nonprofits", async () => {
    mockPrisma.nonprofitAdmin.findMany.mockResolvedValue([]);
    const res = await portalMeRoute(GET("/api/portal/me"));
    const body = await res.json();
    expect(body.nonprofits).toEqual([]);
  });
});

// ─── GET /api/portal/invite/[token] ──────────────────────────────────────────

describe("GET /api/portal/invite/[token]", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1000);

  const validInvite = {
    id: "inv-1",
    email: "jane@example.com",
    role: "ADMIN",
    expiresAt: futureDate,
    acceptedAt: null,
    nonprofit: { name: NONPROFIT.name },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminInvite.findUnique.mockResolvedValue(validInvite);
  });

  it("returns 404 when the token does not exist", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue(null);
    const res = await inviteGetRoute(
      GET("/api/portal/invite/bad-token"),
      routeParams({ token: "bad-token" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("returns valid: true for a fresh, unaccepted invite", async () => {
    const res = await inviteGetRoute(
      GET("/api/portal/invite/tok-123"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.expired).toBe(false);
    expect(body.alreadyAccepted).toBe(false);
    expect(body.email).toBe("jane@example.com");
    expect(body.nonprofitName).toBe(NONPROFIT.name);
  });

  it("returns expired: true for an expired invite", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      ...validInvite,
      expiresAt: pastDate,
    });
    const res = await inviteGetRoute(
      GET("/api/portal/invite/tok-old"),
      routeParams({ token: "tok-old" })
    );
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.expired).toBe(true);
  });

  it("returns alreadyAccepted: true for a previously accepted invite", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      ...validInvite,
      acceptedAt: new Date("2025-01-01"),
    });
    const res = await inviteGetRoute(
      GET("/api/portal/invite/tok-used"),
      routeParams({ token: "tok-used" })
    );
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.alreadyAccepted).toBe(true);
  });
});

// ─── POST /api/portal/invite/[token]/accept ───────────────────────────────────

describe("POST /api/portal/invite/[token]/accept", () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1000);

  const invite = {
    id: "inv-1",
    email: SESSION_DONOR.user.email,   // matches logged-in user
    role: "ADMIN",
    nonprofitId: NONPROFIT.id,
    expiresAt: futureDate,
    acceptedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.adminInvite.findUnique.mockResolvedValue(invite);
    mockPrisma.nonprofitAdmin.upsert.mockResolvedValue({});
    mockPrisma.adminInvite.update.mockResolvedValue({ id: "inv-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when the invite does not exist", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue(null);
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/bad/accept"),
      routeParams({ token: "bad" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when the invite was already accepted", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      ...invite,
      acceptedAt: new Date("2025-01-01"),
    });
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(409);
  });

  it("returns 410 when the invite has expired", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      ...invite,
      expiresAt: pastDate,
    });
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(410);
  });

  it("returns 403 when the logged-in user's email does not match the invite", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      ...invite,
      email: "someone-else@example.com",
    });
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(403);
  });

  it("creates a NonprofitAdmin record and marks the invite accepted", async () => {
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.nonprofitAdmin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: SESSION_DONOR.user.id,
          nonprofitId: NONPROFIT.id,
          role: "ADMIN",
        }),
      })
    );
    expect(mockPrisma.adminInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
      })
    );
  });

  it("returns nonprofitId and role on success", async () => {
    const res = await inviteAcceptRoute(
      POST("/api/portal/invite/tok-123/accept"),
      routeParams({ token: "tok-123" })
    );
    const body = await res.json();
    expect(body.nonprofitId).toBe(NONPROFIT.id);
    expect(body.role).toBe("ADMIN");
  });
});

// ─── PATCH /api/portal/nonprofits/[id]/profile ────────────────────────────────

describe("PATCH /api/portal/nonprofits/[nonprofitId]/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_ADMIN);
    mockPrisma.nonprofit.update.mockResolvedValue({
      id: NONPROFIT.id,
      name: "Updated Name",
      description: "Updated description.",
      website: "https://example.com",
      category: "HEALTH",
      logoUrl: null,
      verified: false,
    });
  });

  it("returns 401 when requirePortalAccess returns 401", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal401());
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { name: "New Name" }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin of this nonprofit", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal403());
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { name: "New Name" }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when name is an empty string", async () => {
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { name: "" }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when an invalid category is provided", async () => {
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { category: "PETS" }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(422);
  });

  it("returns 400 when no fields are provided", async () => {
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, {}),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(400);
  });

  it("updates the nonprofit and returns the updated record", async () => {
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { name: "Updated Name" }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
    expect(mockPrisma.nonprofit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NONPROFIT.id },
        data: expect.objectContaining({ name: "Updated Name" }),
      })
    );
  });

  it("can nullify website by passing website: null", async () => {
    mockPrisma.nonprofit.update.mockResolvedValue({
      id: NONPROFIT.id, name: NONPROFIT.name,
      description: "desc", website: null, category: "HEALTH",
      logoUrl: null, verified: false,
    });
    const res = await profileRoute(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/profile`, { website: null }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/portal/nonprofits/[id]/team ────────────────────────────────────

describe("GET /api/portal/nonprofits/[nonprofitId]/team", () => {
  const adminRecord = {
    id: "na-1",
    userId: SESSION_DONOR.user.id,
    role: "OWNER",
    createdAt: new Date("2025-01-01"),
    user: { name: "Alice", email: "alice@example.com", avatarUrl: null },
  };

  const pendingInvite = {
    id: "inv-2",
    email: "bob@example.com",
    role: "ADMIN",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date("2025-02-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_OWNER);
    mockPrisma.nonprofitAdmin.findMany.mockResolvedValue([adminRecord]);
    mockPrisma.adminInvite.findMany.mockResolvedValue([pendingInvite]);
  });

  it("returns 401/403 from portal auth guard", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal401());
    const res = await teamRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/team`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(401);
  });

  it("returns admins list and pendingInvites", async () => {
    const res = await teamRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/team`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.admins).toHaveLength(1);
    expect(body.admins[0].role).toBe("OWNER");
    expect(body.pendingInvites).toHaveLength(1);
    expect(body.pendingInvites[0].email).toBe("bob@example.com");
  });

  it("returns empty pendingInvites when there are none", async () => {
    mockPrisma.adminInvite.findMany.mockResolvedValue([]);
    const res = await teamRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/team`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const body = await res.json();
    expect(body.pendingInvites).toEqual([]);
  });
});

// ─── POST /api/portal/nonprofits/[id]/team/invite ────────────────────────────

describe("POST /api/portal/nonprofits/[nonprofitId]/team/invite", () => {
  const inviteBody = { email: "newmember@example.com", role: "ADMIN" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_OWNER);
    mockPrisma.user.findUnique.mockResolvedValue(null);          // user not yet on platform
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue(null); // not already admin
    mockPrisma.adminInvite.findUnique.mockResolvedValue(null);   // no existing invite
    mockPrisma.adminInvite.create.mockResolvedValue({
      id: "inv-new",
      token: "tok-abc",
      email: inviteBody.email,
      role: "ADMIN",
    });
    mockPrisma.nonprofit.findUnique.mockResolvedValue({ name: NONPROFIT.name });
  });

  it("returns 403 when user is ADMIN (not OWNER)", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal403());
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid email", async () => {
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, {
        email: "not-an-email",
        role: "ADMIN",
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 for an invalid role", async () => {
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, {
        email: "user@example.com",
        role: "VIEWER",
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when inviting yourself", async () => {
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, {
        email: SESSION_DONOR.user.email, // same email as the portal owner
        role: "ADMIN",
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(422);
  });

  it("returns 409 when the user is already an admin", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing-user" });
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({ id: "na-existing" });
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 when a pending invite already exists for this email", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      id: "inv-pending",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    });
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(409);
  });

  it("creates a new invite and returns 201 with token and email", async () => {
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBe("tok-abc");
    expect(body.email).toBe(inviteBody.email);
    expect(mockPrisma.adminInvite.create).toHaveBeenCalledOnce();
  });

  it("deletes an expired previous invite before creating a new one", async () => {
    mockPrisma.adminInvite.findUnique.mockResolvedValue({
      id: "inv-expired",
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    mockPrisma.adminInvite.delete.mockResolvedValue({});
    await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(mockPrisma.adminInvite.delete).toHaveBeenCalledOnce();
    expect(mockPrisma.adminInvite.create).toHaveBeenCalledOnce();
  });

  it("sends invite email but still returns 201 if email fails", async () => {
    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP error"));
    const res = await teamInviteRoute(
      POST(`/api/portal/nonprofits/${NONPROFIT.id}/team/invite`, inviteBody),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(201);
  });
});

// ─── PATCH /api/portal/nonprofits/[id]/team/[adminId] ────────────────────────

describe("PATCH /api/portal/nonprofits/[nonprofitId]/team/[adminId]", () => {
  const targetAdmin = {
    id: "na-target",
    userId: "user-other-99",
    nonprofitId: NONPROFIT.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_OWNER);
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue(targetAdmin);
    mockPrisma.nonprofitAdmin.update.mockResolvedValue({
      id: "na-target",
      userId: "user-other-99",
      role: "OWNER",
      createdAt: new Date(),
    });
  });

  it("returns 403 when user is not an OWNER", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal403());
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`, { role: "OWNER" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid role value", async () => {
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`, { role: "VIEWER" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 when the admin record does not exist", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue(null);
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-gone`, { role: "OWNER" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-gone" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when admin belongs to a different nonprofit", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({
      ...targetAdmin,
      nonprofitId: "other-np",
    });
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`, { role: "OWNER" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to change your own role", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({
      ...targetAdmin,
      userId: SESSION_DONOR.user.id, // same as portal owner
    });
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`, { role: "ADMIN" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(400);
  });

  it("updates the role and returns the updated record", async () => {
    const res = await teamMemberPatch(
      PATCH(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`, { role: "OWNER" }),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("OWNER");
  });
});

// ─── DELETE /api/portal/nonprofits/[id]/team/[adminId] ───────────────────────

describe("DELETE /api/portal/nonprofits/[nonprofitId]/team/[adminId]", () => {
  const targetAdmin = {
    id: "na-target",
    userId: "user-other-99",
    nonprofitId: NONPROFIT.id,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_OWNER);
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue(targetAdmin);
    mockPrisma.nonprofitAdmin.delete.mockResolvedValue({});
  });

  it("returns 403 when user is not an OWNER", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal403());
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the admin record does not exist", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue(null);
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-gone`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-gone" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to remove yourself", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({
      ...targetAdmin,
      userId: SESSION_DONOR.user.id, // same as requesting user
    });
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when trying to remove the last OWNER", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({
      ...targetAdmin,
      role: "OWNER",
    });
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(1); // only one owner
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("last owner") });
  });

  it("deletes the admin and returns { success: true }", async () => {
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockPrisma.nonprofitAdmin.delete).toHaveBeenCalledWith({ where: { id: "na-target" } });
  });

  it("can remove an OWNER when there are multiple owners", async () => {
    mockPrisma.nonprofitAdmin.findUnique.mockResolvedValue({
      ...targetAdmin,
      role: "OWNER",
    });
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(2); // two owners, safe to remove
    const res = await teamMemberDelete(
      DELETE(`/api/portal/nonprofits/${NONPROFIT.id}/team/na-target`),
      routeParams({ nonprofitId: NONPROFIT.id, adminId: "na-target" })
    );
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/portal/nonprofits/[id]/analytics ───────────────────────────────

describe("GET /api/portal/nonprofits/[nonprofitId]/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_ADMIN);
    mockPrisma.donation.aggregate.mockResolvedValue({
      _sum: { amountCents: 500000 },
      _count: { id: 100 },
    });
    mockPrisma.donation.groupBy.mockResolvedValue([]);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
  });

  it("returns 401/403 from portal auth guard", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal403());
    const res = await analyticsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/analytics`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with summary, monthlyTrend, topDonors, and campaignComparison", async () => {
    const res = await analyticsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/analytics`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
    expect(body.monthlyTrend).toBeDefined();
    expect(body.topDonors).toBeDefined();
    expect(body.campaignComparison).toBeDefined();
  });

  it("returns totalRaisedCents from aggregate", async () => {
    const res = await analyticsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/analytics`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const body = await res.json();
    expect(body.summary.totalRaisedCents).toBe(500000);
  });

  it("monthlyTrend has 12 entries (one per month)", async () => {
    const res = await analyticsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/analytics`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const body = await res.json();
    expect(body.monthlyTrend).toHaveLength(12);
  });

  it("returns 0 for totalRaisedCents when there are no donations", async () => {
    mockPrisma.donation.aggregate.mockResolvedValue({
      _sum: { amountCents: null },
      _count: { id: 0 },
    });
    const res = await analyticsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/analytics`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const body = await res.json();
    expect(body.summary.totalRaisedCents).toBe(0);
    expect(body.summary.avgDonationCents).toBe(0);
  });
});

// ─── GET /api/portal/nonprofits/[id]/donations ───────────────────────────────

describe("GET /api/portal/nonprofits/[nonprofitId]/donations", () => {
  const donationRow = {
    id: DONATION.id,
    amountCents: 5000,
    currency: "usd",
    status: "SUCCEEDED",
    donatedAt: new Date("2025-06-01"),
    createdAt: new Date("2025-06-01"),
    campaignId: null,
    campaign: null,
    user: { name: "Alice", email: "alice@example.com", username: "alice" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePortalAccess.mockResolvedValue(PORTAL_ADMIN);
    mockPrisma.donation.findMany.mockResolvedValue([donationRow]);
    mockPrisma.donation.count.mockResolvedValue(1);
  });

  it("returns 401/403 from portal auth guard", async () => {
    mockRequirePortalAccess.mockResolvedValue(portal401());
    const res = await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(401);
  });

  it("returns paginated donations with total", async () => {
    const res = await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.donations).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("filters by status when a valid status param is provided", async () => {
    await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`, {
        searchParams: { status: "SUCCEEDED" },
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "SUCCEEDED" }),
      })
    );
  });

  it("ignores invalid status values (no where.status added)", async () => {
    await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`, {
        searchParams: { status: "INVALID" },
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const call = mockPrisma.donation.findMany.mock.calls[0][0];
    expect(call.where.status).toBeUndefined();
  });

  it("defaults to page 1, limit 25", async () => {
    await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 25 })
    );
  });

  it("returns CSV with correct headers when export=csv", async () => {
    const csvDonation = {
      ...donationRow,
      donatedAt: new Date(2025, 5, 1),
      createdAt: new Date(2025, 5, 1),
    };
    mockPrisma.donation.findMany.mockResolvedValue([csvDonation]);
    const res = await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`, {
        searchParams: { export: "csv" },
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Date,Donor Name,Donor Email,Amount,Currency,Status,Campaign");
  });

  it("includes donation data in CSV rows", async () => {
    const csvDonation = {
      ...donationRow,
      donatedAt: new Date(2025, 5, 1),
      createdAt: new Date(2025, 5, 1),
    };
    mockPrisma.donation.findMany.mockResolvedValue([csvDonation]);
    const res = await donationsRoute(
      GET(`/api/portal/nonprofits/${NONPROFIT.id}/donations`, {
        searchParams: { export: "csv" },
      }),
      routeParams({ nonprofitId: NONPROFIT.id })
    );
    const text = await res.text();
    expect(text).toContain("50.00");   // $50.00
    expect(text).toContain("Alice");
  });
});
