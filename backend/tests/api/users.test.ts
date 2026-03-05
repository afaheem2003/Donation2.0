/**
 * Tests: User-related API routes
 *
 * Covers:
 *  - GET  /api/me
 *  - GET  /api/users/me/goal  +  PATCH  /api/users/me/goal
 *  - GET  /api/users/search
 *  - POST /api/users/[username]/follow
 *  - POST /api/posts/[id]/like
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as meRoute } from "@/app/api/me/route";
import { GET as goalGet, PATCH as goalPatch } from "@/app/api/users/me/goal/route";
import { GET as searchRoute } from "@/app/api/users/search/route";
import { POST as followRoute } from "@/app/api/users/[username]/follow/route";
import { POST as likeRoute } from "@/app/api/posts/[id]/like/route";
import { GET, POST, PATCH, routeParams, SESSION_DONOR } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  donation: { aggregate: vi.fn() },
  follow: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  post: { findFirst: vi.fn() },
  like: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
// Rate limiter is side-effectful — always allow in these tests
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockReturnValue(true) }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── GET /api/me ──────────────────────────────────────────────────────────────

describe("GET /api/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns { user: null } when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await meRoute(GET("/api/me"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
  });

  it("returns the current session user when authenticated", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    const res = await meRoute(GET("/api/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(SESSION_DONOR.user.id);
    expect(body.user.email).toBe(SESSION_DONOR.user.email);
    expect(body.user.username).toBe(SESSION_DONOR.user.username);
  });
});

// ─── GET + PATCH /api/users/me/goal ──────────────────────────────────────────

describe("GET /api/users/me/goal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.user.findUnique.mockResolvedValue({ yearlyGoalCents: 50000 });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountCents: 12500 } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await goalGet(GET("/api/users/me/goal"));
    expect(res.status).toBe(401);
  });

  it("returns yearlyGoalCents, totalDonatedThisYearCents, and current year", async () => {
    const res = await goalGet(GET("/api/users/me/goal"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yearlyGoalCents).toBe(50000);
    expect(body.totalDonatedThisYearCents).toBe(12500);
    expect(body.year).toBe(new Date().getFullYear());
  });

  it("returns yearlyGoalCents: null when the user has not set a goal yet", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ yearlyGoalCents: null });
    const res = await goalGet(GET("/api/users/me/goal"));
    const body = await res.json();
    expect(body.yearlyGoalCents).toBeNull();
  });

  it("returns 0 for totalDonatedThisYearCents when the user has no donations this year", async () => {
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountCents: null } });
    const res = await goalGet(GET("/api/users/me/goal"));
    const body = await res.json();
    expect(body.totalDonatedThisYearCents).toBe(0);
  });
});

describe("PATCH /api/users/me/goal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.user.findUnique.mockResolvedValue({ yearlyGoalCents: 100000 });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountCents: 0 } });
    mockPrisma.user.update.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 10000 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when goal is below $1 (100 cents)", async () => {
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 99 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal exceeds $1,000,000 (100_000_000 cents)", async () => {
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 100_000_001 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when yearlyGoalCents is not an integer", async () => {
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 100.5 }));
    expect(res.status).toBe(400);
  });

  it("saves a valid goal and returns updated goal data", async () => {
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 100000 }));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SESSION_DONOR.user.id },
        data: { yearlyGoalCents: 100000 },
      })
    );
    const body = await res.json();
    expect(body.yearlyGoalCents).toBe(100000);
  });

  it("accepts the minimum valid goal of exactly $1 (100 cents)", async () => {
    const res = await goalPatch(PATCH("/api/users/me/goal", { yearlyGoalCents: 100 }));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/users/search ────────────────────────────────────────────────────

describe("GET /api/users/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.user.findMany.mockResolvedValue([
      { name: "Sarah Chen", username: "sarah", avatarUrl: null },
    ]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await searchRoute(GET("/api/users/search", { searchParams: { q: "sarah" } }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const { rateLimit } = await import("@/lib/rateLimit");
    vi.mocked(rateLimit).mockReturnValueOnce(false);
    const res = await searchRoute(GET("/api/users/search", { searchParams: { q: "sarah" } }));
    expect(res.status).toBe(429);
  });

  it("returns an empty array when query is less than 2 characters", async () => {
    const res = await searchRoute(GET("/api/users/search", { searchParams: { q: "s" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([]);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty array for an empty query string", async () => {
    const res = await searchRoute(GET("/api/users/search", { searchParams: { q: "" } }));
    const body = await res.json();
    expect(body.users).toEqual([]);
  });

  it("queries both username and name fields (case-insensitive)", async () => {
    await searchRoute(GET("/api/users/search", { searchParams: { q: "sarah" } }));
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("returns at most 5 results", async () => {
    await searchRoute(GET("/api/users/search", { searchParams: { q: "user" } }));
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("only exposes name, username, and avatarUrl (not email or id)", async () => {
    const res = await searchRoute(GET("/api/users/search", { searchParams: { q: "sarah" } }));
    const body = await res.json();
    const user = body.users[0];
    expect(user.name).toBeDefined();
    expect(user.username).toBeDefined();
    expect(user.id).toBeUndefined();
    expect(user.email).toBeUndefined();
  });
});

// ─── POST /api/users/[username]/follow ────────────────────────────────────────

describe("POST /api/users/[username]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-target-99" });
    mockPrisma.follow.findUnique.mockResolvedValue(null);
    mockPrisma.follow.create.mockResolvedValue({});
    mockPrisma.follow.count.mockResolvedValue(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await followRoute(POST("/api/users/sarah/follow"), routeParams({ username: "sarah" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the target user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await followRoute(POST("/api/users/ghost/follow"), routeParams({ username: "ghost" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to follow yourself", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: SESSION_DONOR.user.id });
    const res = await followRoute(POST("/api/users/sarah/follow"), routeParams({ username: "sarah" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Cannot follow yourself" });
  });

  it("creates a follow record and returns { following: true } on first follow", async () => {
    const res = await followRoute(POST("/api/users/alice/follow"), routeParams({ username: "alice" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ following: true, followerCount: 1 });
    expect(mockPrisma.follow.create).toHaveBeenCalledOnce();
  });

  it("deletes the follow record and returns { following: false } on second follow (toggle)", async () => {
    mockPrisma.follow.findUnique.mockResolvedValue({ id: "follow-1" });
    mockPrisma.follow.delete.mockResolvedValue({});
    mockPrisma.follow.count.mockResolvedValue(0);
    const res = await followRoute(POST("/api/users/alice/follow"), routeParams({ username: "alice" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ following: false, followerCount: 0 });
    expect(mockPrisma.follow.delete).toHaveBeenCalledOnce();
    expect(mockPrisma.follow.create).not.toHaveBeenCalled();
  });

  it("returns the updated follower count after toggling", async () => {
    mockPrisma.follow.count.mockResolvedValue(42);
    const res = await followRoute(POST("/api/users/alice/follow"), routeParams({ username: "alice" }));
    const body = await res.json();
    expect(body.followerCount).toBe(42);
  });
});

// ─── POST /api/posts/[id]/like ────────────────────────────────────────────────

describe("POST /api/posts/[id]/like", () => {
  const POST_ID = "post-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.post.findFirst.mockResolvedValue({ id: POST_ID, isDeleted: false });
    mockPrisma.like.findUnique.mockResolvedValue(null);
    mockPrisma.like.create.mockResolvedValue({});
    mockPrisma.like.delete.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await likeRoute(POST(`/api/posts/${POST_ID}/like`), routeParams({ id: POST_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the post does not exist", async () => {
    mockPrisma.post.findFirst.mockResolvedValue(null);
    const res = await likeRoute(POST(`/api/posts/${POST_ID}/like`), routeParams({ id: POST_ID }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the post is soft-deleted", async () => {
    mockPrisma.post.findFirst.mockResolvedValue(null); // findFirst with isDeleted: false returns null
    const res = await likeRoute(POST(`/api/posts/${POST_ID}/like`), routeParams({ id: POST_ID }));
    expect(res.status).toBe(404);
  });

  it("creates a like and returns { liked: true } on first like", async () => {
    const res = await likeRoute(POST(`/api/posts/${POST_ID}/like`), routeParams({ id: POST_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ liked: true });
    expect(mockPrisma.like.create).toHaveBeenCalledOnce();
  });

  it("deletes the like and returns { liked: false } on second like (toggle)", async () => {
    mockPrisma.like.findUnique.mockResolvedValue({ id: "like-1" });
    const res = await likeRoute(POST(`/api/posts/${POST_ID}/like`), routeParams({ id: POST_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ liked: false });
    expect(mockPrisma.like.delete).toHaveBeenCalledOnce();
    expect(mockPrisma.like.create).not.toHaveBeenCalled();
  });
});
