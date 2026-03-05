/**
 * Tests: Auth-adjacent API routes
 *
 * Covers:
 *  - GET  /api/auth/ein-lookup    (public EIN status check)
 *  - POST /api/auth/claim         (claim an existing nonprofit)
 *  - PATCH /api/users/me/username  (set / change username)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as einLookup } from "@/app/api/auth/ein-lookup/route";
import { POST as claimRoute } from "@/app/api/auth/claim/route";
import { PATCH as usernameRoute } from "@/app/api/users/me/username/route";
import { GET, POST, PATCH, routeParams, SESSION_DONOR, NONPROFIT } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  nonprofit: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  nonprofitAdmin: { count: vi.fn() },
  nonprofitApplication: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── GET /api/auth/ein-lookup ─────────────────────────────────────────────────

describe("GET /api/auth/ein-lookup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when ein param is missing", async () => {
    const res = await einLookup(GET("/api/auth/ein-lookup"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "ein required" });
  });

  it("returns 400 when EIN format is invalid", async () => {
    const res = await einLookup(GET("/api/auth/ein-lookup", { searchParams: { ein: "1234567" } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid EIN format" });
  });

  it("returns { status: 'not_found' } when no nonprofit exists with that EIN", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);
    const res = await einLookup(GET("/api/auth/ein-lookup", { searchParams: { ein: "13-3433452" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "not_found" });
  });

  it("returns { status: 'claimed' } when the nonprofit already has an admin", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue({ ...NONPROFIT });
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(1);
    const res = await einLookup(GET("/api/auth/ein-lookup", { searchParams: { ein: NONPROFIT.ein } }));
    const body = await res.json();
    expect(body.status).toBe("claimed");
    expect(body.nonprofit.name).toBe(NONPROFIT.name);
    // Internal ID must not be exposed
    expect(body.nonprofit.id).toBeUndefined();
  });

  it("returns { status: 'pending' } when a claim is awaiting review", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue({ ...NONPROFIT });
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(0);
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue({ id: "app-1" });
    const res = await einLookup(GET("/api/auth/ein-lookup", { searchParams: { ein: NONPROFIT.ein } }));
    const body = await res.json();
    expect(body.status).toBe("pending");
  });

  it("returns { status: 'unclaimed' } with full details when nonprofit is free to claim", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue({ ...NONPROFIT });
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(0);
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue(null);
    const res = await einLookup(GET("/api/auth/ein-lookup", { searchParams: { ein: NONPROFIT.ein } }));
    const body = await res.json();
    expect(body.status).toBe("unclaimed");
    expect(body.nonprofit.name).toBe(NONPROFIT.name);
    expect(body.nonprofit.description).toBeDefined();
    // Internal ID must NOT be in the public response
    expect(body.nonprofit.id).toBeUndefined();
  });
});

// ─── POST /api/auth/claim ─────────────────────────────────────────────────────

describe("POST /api/auth/claim", () => {
  const validBody = {
    ein: "13-3433452",
    submittedByName: "Jordan Lee",
    submittedByEmail: "jordan@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.nonprofit.findUnique.mockResolvedValue(NONPROFIT);
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(0);
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue(null);
    mockPrisma.nonprofitApplication.create.mockResolvedValue({ id: "app-new-1" });
  });

  it("returns 422 when EIN format is invalid", async () => {
    const res = await claimRoute(POST("/api/auth/claim", { ...validBody, ein: "bad-ein" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when submittedByName is too short", async () => {
    const res = await claimRoute(POST("/api/auth/claim", { ...validBody, submittedByName: "X" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when email is invalid", async () => {
    const res = await claimRoute(POST("/api/auth/claim", { ...validBody, submittedByEmail: "not-an-email" }));
    expect(res.status).toBe(422);
  });

  it("returns 404 when the nonprofit does not exist", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);
    const res = await claimRoute(POST("/api/auth/claim", validBody));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the nonprofit is already claimed", async () => {
    mockPrisma.nonprofitAdmin.count.mockResolvedValue(1);
    const res = await claimRoute(POST("/api/auth/claim", validBody));
    expect(res.status).toBe(409);
  });

  it("returns 409 when a claim is already pending review", async () => {
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue({
      id: "existing-claim",
      status: "PENDING",
    });
    const res = await claimRoute(POST("/api/auth/claim", validBody));
    expect(res.status).toBe(409);
  });

  it("creates a new claim application and returns 201 with applicationId", async () => {
    const res = await claimRoute(POST("/api/auth/claim", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.applicationId).toBe("app-new-1");
    expect(mockPrisma.nonprofitApplication.create).toHaveBeenCalledOnce();
  });

  it("resets a previously rejected claim instead of creating a duplicate", async () => {
    mockPrisma.nonprofitApplication.findFirst.mockResolvedValue({
      id: "old-rejected",
      status: "REJECTED",
    });
    mockPrisma.nonprofitApplication.update.mockResolvedValue({ id: "old-rejected" });
    const res = await claimRoute(POST("/api/auth/claim", validBody));
    expect(res.status).toBe(201);
    expect(mockPrisma.nonprofitApplication.update).toHaveBeenCalledOnce();
    expect(mockPrisma.nonprofitApplication.create).not.toHaveBeenCalled();
  });

  it("sends a claim confirmation email (non-blocking)", async () => {
    const { sendEmail } = await import("@/lib/email");
    await claimRoute(POST("/api/auth/claim", validBody));
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: validBody.submittedByEmail })
    );
  });
});

// ─── PATCH /api/users/me/username ─────────────────────────────────────────────

describe("PATCH /api/users/me/username", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.user.findFirst.mockResolvedValue(null); // no conflict by default
    mockPrisma.user.update.mockResolvedValue({ id: SESSION_DONOR.user.id });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "newuser" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when username is too short (< 3 chars)", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "ab" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when username is too long (> 20 chars)", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "a".repeat(21) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when username contains invalid characters (e.g., hyphens)", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "bad-name" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when username contains spaces", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "bad name" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the username is already taken by another user", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "someone-else" });
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "takenname" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "Username already taken" });
  });

  it("accepts a valid username and returns 200 with usernameSet: true", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "valid_user1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe("valid_user1");
    expect(body.usernameSet).toBe(true);
  });

  it("accepts underscores in usernames", async () => {
    const res = await usernameRoute(PATCH("/api/users/me/username", { username: "user_name_ok" }));
    expect(res.status).toBe(200);
  });

  it("checks uniqueness case-insensitively, excluding the current user", async () => {
    await usernameRoute(PATCH("/api/users/me/username", { username: "Sarah" }));
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { id: SESSION_DONOR.user.id },
        }),
      })
    );
  });
});
