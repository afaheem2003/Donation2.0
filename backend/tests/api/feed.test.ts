/**
 * Tests: GET /api/feed
 *
 * Covers:
 *  - Rate limiting (429 when exceeded)
 *  - Guest mode (unauthenticated) — sees all posts (explore mode)
 *  - Authenticated with no follows — empty feed
 *  - Authenticated with user follows — filtered feed
 *  - Authenticated with nonprofit follows — filtered feed
 *  - Cursor pagination — nextCursor present when more results exist
 *  - Cursor pagination — no nextCursor on last page
 *  - viewerLiked: true/false per like state
 *  - Soft-deleted posts excluded
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as feedRoute } from "@/app/api/feed/route";
import { GET, SESSION_DONOR, NONPROFIT } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  follow: {
    findMany: vi.fn(),
  },
  nonprofitFollow: {
    findMany: vi.fn(),
  },
  post: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn().mockReturnValue(true) }));

import { getSession } from "@/lib/getSession";
import { rateLimit } from "@/lib/rateLimit";
const mockGetSession = vi.mocked(getSession);
const mockRateLimit = vi.mocked(rateLimit);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePost(id: string, overrides: object = {}) {
  return {
    id,
    content: `Post content ${id}`,
    createdAt: new Date("2025-06-15"),
    isDeleted: false,
    userId: "user-other-1",
    nonprofitId: NONPROFIT.id,
    user: { id: "user-other-1", name: "Other User", username: "other", avatarUrl: null },
    nonprofit: { id: NONPROFIT.id, name: NONPROFIT.name, logoUrl: null, verified: true },
    donation: null,
    likes: [],
    _count: { likes: 3, comments: 1 },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/feed — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.post.findMany.mockResolvedValue([]);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mockRateLimit.mockReturnValueOnce(false);
    const res = await feedRoute(GET("/api/feed"));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "Too many requests" });
  });

  it("rate-limits by user ID when authenticated", async () => {
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.follow.findMany.mockResolvedValue([]);
    mockPrisma.nonprofitFollow.findMany.mockResolvedValue([]);
    await feedRoute(GET("/api/feed"));
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining(SESSION_DONOR.user.id),
      expect.any(Number)
    );
  });

  it("rate-limits by IP when unauthenticated", async () => {
    await feedRoute(GET("/api/feed"));
    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("feed:"),
      expect.any(Number)
    );
  });
});

describe("GET /api/feed — guest (unauthenticated) explore mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.post.findMany.mockResolvedValue([makePost("p1"), makePost("p2")]);
  });

  it("returns 200 with posts", async () => {
    const res = await feedRoute(GET("/api/feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
  });

  it("does NOT query follows tables for guests", async () => {
    await feedRoute(GET("/api/feed"));
    expect(mockPrisma.follow.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.nonprofitFollow.findMany).not.toHaveBeenCalled();
  });

  it("sets viewerLiked: false for all posts (no session)", async () => {
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    expect(body.posts.every((p: { viewerLiked: boolean }) => p.viewerLiked === false)).toBe(true);
  });

  it("strips internal _count and likes fields from response", async () => {
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    const post = body.posts[0];
    expect(post._count).toBeUndefined();
    expect(post.likes).toBeUndefined();
  });

  it("exposes likeCount and commentCount as top-level fields", async () => {
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    const post = body.posts[0];
    expect(post.likeCount).toBe(3);
    expect(post.commentCount).toBe(1);
  });
});

describe("GET /api/feed — authenticated with no follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.follow.findMany.mockResolvedValue([]);
    mockPrisma.nonprofitFollow.findMany.mockResolvedValue([]);
  });

  it("returns an empty feed when the user follows nobody", async () => {
    const res = await feedRoute(GET("/api/feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toEqual([]);
    expect(body.nextCursor).toBeUndefined();
  });

  it("does NOT query posts when there are no follows", async () => {
    await feedRoute(GET("/api/feed"));
    expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/feed — authenticated with user follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.follow.findMany.mockResolvedValue([
      { followingId: "user-followed-1" },
      { followingId: "user-followed-2" },
    ]);
    mockPrisma.nonprofitFollow.findMany.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([makePost("p1"), makePost("p2")]);
  });

  it("queries posts with the followed user IDs in the OR clause", async () => {
    await feedRoute(GET("/api/feed"));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: { in: ["user-followed-1", "user-followed-2"] } }),
      ])
    );
  });

  it("excludes soft-deleted posts (isDeleted: false in where)", async () => {
    await feedRoute(GET("/api/feed"));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.where.isDeleted).toBe(false);
  });

  it("orders posts by createdAt desc", async () => {
    await feedRoute(GET("/api/feed"));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.orderBy).toMatchObject({ createdAt: "desc" });
  });
});

describe("GET /api/feed — authenticated with nonprofit follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.follow.findMany.mockResolvedValue([]);
    mockPrisma.nonprofitFollow.findMany.mockResolvedValue([{ nonprofitId: NONPROFIT.id }]);
    mockPrisma.post.findMany.mockResolvedValue([makePost("p1")]);
  });

  it("queries posts with the followed nonprofit IDs in the OR clause", async () => {
    await feedRoute(GET("/api/feed"));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nonprofitId: { in: [NONPROFIT.id] } }),
      ])
    );
  });
});

describe("GET /api/feed — cursor pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockRateLimit.mockReturnValue(true);
  });

  it("returns nextCursor when there are more posts than the page limit (10)", async () => {
    // Feed fetches limit+1 (11) to detect next page; if 11 returned, last is the cursor.
    const posts = Array.from({ length: 11 }, (_, i) => makePost(`p${i + 1}`));
    mockPrisma.post.findMany.mockResolvedValue(posts);
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    expect(body.posts).toHaveLength(10);
    expect(body.nextCursor).toBe("p11");
  });

  it("returns no nextCursor on the last page (fewer than 11 results)", async () => {
    const posts = Array.from({ length: 5 }, (_, i) => makePost(`p${i + 1}`));
    mockPrisma.post.findMany.mockResolvedValue(posts);
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    expect(body.posts).toHaveLength(5);
    expect(body.nextCursor).toBeUndefined();
  });

  it("passes the cursor param to findMany when provided", async () => {
    mockPrisma.post.findMany.mockResolvedValue([makePost("p11")]);
    await feedRoute(GET("/api/feed", { searchParams: { cursor: "p10" } }));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.cursor).toEqual({ id: "p10" });
    expect(call.skip).toBe(1);
  });

  it("does not add cursor/skip when no cursor param provided", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);
    await feedRoute(GET("/api/feed"));
    const call = mockPrisma.post.findMany.mock.calls[0][0];
    expect(call.cursor).toBeUndefined();
    expect(call.skip).toBeUndefined();
  });
});

describe("GET /api/feed — viewerLiked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockRateLimit.mockReturnValue(true);
    mockPrisma.follow.findMany.mockResolvedValue([{ followingId: "user-other-1" }]);
    mockPrisma.nonprofitFollow.findMany.mockResolvedValue([]);
  });

  it("returns viewerLiked: true when the user has liked the post", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      makePost("p1", { likes: [{ id: "like-1" }] }),
    ]);
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    expect(body.posts[0].viewerLiked).toBe(true);
  });

  it("returns viewerLiked: false when the user has not liked the post", async () => {
    mockPrisma.post.findMany.mockResolvedValue([makePost("p1", { likes: [] })]);
    const res = await feedRoute(GET("/api/feed"));
    const body = await res.json();
    expect(body.posts[0].viewerLiked).toBe(false);
  });
});
