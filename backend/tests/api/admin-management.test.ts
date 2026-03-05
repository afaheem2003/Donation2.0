/**
 * Tests: Admin management routes (not covered by admin.test.ts)
 *
 * Covers:
 *  - GET   /api/admin/nonprofits          (list, search, verified filter)
 *  - PATCH /api/admin/nonprofits/[id]     (toggle verified status)
 *  - GET   /api/admin/users               (list, search, role filter)
 *  - PATCH /api/admin/users/[id]          (change user role)
 *
 * All routes require PLATFORM_ADMIN role.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as nonprofitsList } from "@/app/api/admin/nonprofits/route";
import { PATCH as nonprofitPatch } from "@/app/api/admin/nonprofits/[id]/route";
import { GET as usersList } from "@/app/api/admin/users/route";
import { PATCH as userPatch } from "@/app/api/admin/users/[id]/route";
import { GET, PATCH, routeParams, SESSION_DONOR, SESSION_ADMIN, NONPROFIT } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  nonprofit: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NP_ROW = {
  id: NONPROFIT.id,
  name: NONPROFIT.name,
  ein: NONPROFIT.ein,
  category: "HEALTH",
  verified: false,
  createdAt: new Date("2025-01-01"),
  _count: { donations: 5, followers: 12 },
};

const USER_ROW = {
  id: "user-1",
  name: "Alice Smith",
  email: "alice@example.com",
  username: "alice",
  role: "DONOR",
  avatarUrl: null,
  createdAt: new Date("2025-02-01"),
  _count: { donations: 3 },
};

// ─── GET /api/admin/nonprofits ────────────────────────────────────────────────

describe("GET /api/admin/nonprofits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofit.findMany.mockResolvedValue([NP_ROW]);
    mockPrisma.nonprofit.count.mockResolvedValue(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await nonprofitsList(GET("/api/admin/nonprofits"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await nonprofitsList(GET("/api/admin/nonprofits"));
    expect(res.status).toBe(403);
  });

  it("returns paginated nonprofits with total", async () => {
    const res = await nonprofitsList(GET("/api/admin/nonprofits"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonprofits).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("filters by verified=true when param is set", async () => {
    await nonprofitsList(
      GET("/api/admin/nonprofits", { searchParams: { verified: "true" } })
    );
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verified: true }),
      })
    );
  });

  it("filters by verified=false when param is set", async () => {
    await nonprofitsList(
      GET("/api/admin/nonprofits", { searchParams: { verified: "false" } })
    );
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verified: false }),
      })
    );
  });

  it("applies search query across name and EIN", async () => {
    await nonprofitsList(
      GET("/api/admin/nonprofits", { searchParams: { q: "doctors" } })
    );
    const call = mockPrisma.nonprofit.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.objectContaining({ contains: "doctors" }) }),
        expect.objectContaining({ ein: expect.objectContaining({ contains: "doctors" }) }),
      ])
    );
  });

  it("defaults to page 1 with 20 per page", async () => {
    await nonprofitsList(GET("/api/admin/nonprofits"));
    expect(mockPrisma.nonprofit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });

  it("caps limit at 100 even when limit param is higher", async () => {
    await nonprofitsList(
      GET("/api/admin/nonprofits", { searchParams: { limit: "999" } })
    );
    const call = mockPrisma.nonprofit.findMany.mock.calls[0][0];
    expect(call.take).toBeLessThanOrEqual(100);
  });
});

// ─── PATCH /api/admin/nonprofits/[id] ────────────────────────────────────────

describe("PATCH /api/admin/nonprofits/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.nonprofit.update.mockResolvedValue({ id: NONPROFIT.id, verified: true });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await nonprofitPatch(
      PATCH("/api/admin/nonprofits/np-1", { verified: true }),
      routeParams({ id: "np-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await nonprofitPatch(
      PATCH("/api/admin/nonprofits/np-1", { verified: true }),
      routeParams({ id: "np-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when verified is not a boolean", async () => {
    const res = await nonprofitPatch(
      PATCH("/api/admin/nonprofits/np-1", { verified: "yes" }),
      routeParams({ id: "np-1" })
    );
    expect(res.status).toBe(422);
  });

  it("sets verified: true and returns the updated nonprofit", async () => {
    const res = await nonprofitPatch(
      PATCH("/api/admin/nonprofits/np-1", { verified: true }),
      routeParams({ id: "np-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonprofit.verified).toBe(true);
    expect(mockPrisma.nonprofit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "np-1" },
        data: { verified: true },
      })
    );
  });

  it("can revoke verification by setting verified: false", async () => {
    mockPrisma.nonprofit.update.mockResolvedValue({ id: NONPROFIT.id, verified: false });
    const res = await nonprofitPatch(
      PATCH("/api/admin/nonprofits/np-1", { verified: false }),
      routeParams({ id: "np-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nonprofit.verified).toBe(false);
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.user.findMany.mockResolvedValue([USER_ROW]);
    mockPrisma.user.count.mockResolvedValue(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await usersList(GET("/api/admin/users"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await usersList(GET("/api/admin/users"));
    expect(res.status).toBe(403);
  });

  it("returns paginated users with total", async () => {
    const res = await usersList(GET("/api/admin/users"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("searches across name, email, and username", async () => {
    await usersList(GET("/api/admin/users", { searchParams: { q: "alice" } }));
    const call = mockPrisma.user.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.objectContaining({ contains: "alice" }) }),
        expect.objectContaining({ email: expect.objectContaining({ contains: "alice" }) }),
        expect.objectContaining({ username: expect.objectContaining({ contains: "alice" }) }),
      ])
    );
  });

  it("filters by role=PLATFORM_ADMIN when provided", async () => {
    await usersList(
      GET("/api/admin/users", { searchParams: { role: "PLATFORM_ADMIN" } })
    );
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "PLATFORM_ADMIN" }),
      })
    );
  });

  it("returns 400 for an invalid role value", async () => {
    const res = await usersList(
      GET("/api/admin/users", { searchParams: { role: "SUPERUSER" } })
    );
    expect(res.status).toBe(400);
  });

  it("defaults to page 1 with 20 per page", async () => {
    await usersList(GET("/api/admin/users"));
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });
});

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_ADMIN);
    mockPrisma.user.update.mockResolvedValue({ id: "user-1", role: "PLATFORM_ADMIN" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await userPatch(
      PATCH("/api/admin/users/user-1", { role: "PLATFORM_ADMIN" }),
      routeParams({ id: "user-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await userPatch(
      PATCH("/api/admin/users/user-1", { role: "PLATFORM_ADMIN" }),
      routeParams({ id: "user-1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for an invalid role value", async () => {
    const res = await userPatch(
      PATCH("/api/admin/users/user-1", { role: "SUPERUSER" }),
      routeParams({ id: "user-1" })
    );
    expect(res.status).toBe(422);
  });

  it("promotes a user to PLATFORM_ADMIN and returns the updated user", async () => {
    const res = await userPatch(
      PATCH("/api/admin/users/user-1", { role: "PLATFORM_ADMIN" }),
      routeParams({ id: "user-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe("PLATFORM_ADMIN");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { role: "PLATFORM_ADMIN" },
      })
    );
  });

  it("demotes a user back to DONOR", async () => {
    mockPrisma.user.update.mockResolvedValue({ id: "user-1", role: "DONOR" });
    const res = await userPatch(
      PATCH("/api/admin/users/user-1", { role: "DONOR" }),
      routeParams({ id: "user-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe("DONOR");
  });
});
