import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  // Rate limit by user ID if authenticated, otherwise by IP
  const rateLimitKey = session?.user?.id
    ? `feed:${session.user.id}`
    : `feed:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  if (!rateLimit(rateLimitKey, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 10;

  // When logged in, filter by followed users and followed nonprofits.
  // Guests see all posts (explore mode).
  let where: Prisma.PostWhereInput = { isDeleted: false };

  if (session?.user?.id) {
    const [followingIds, npFollowingIds] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
      }).then((rows) => rows.map((r) => r.followingId)),
      prisma.nonprofitFollow.findMany({
        where: { userId: session.user.id },
        select: { nonprofitId: true },
      }).then((rows) => rows.map((r) => r.nonprofitId)),
    ]);

    const orClauses: NonNullable<typeof where>[] = [
      ...(followingIds.length ? [{ userId: { in: followingIds } }] : []),
      ...(npFollowingIds.length ? [{ nonprofitId: { in: npFollowingIds } }] : []),
    ];

    if (!orClauses.length) {
      // User follows nobody — return empty feed
      return NextResponse.json({ posts: [], nextCursor: undefined });
    }

    where = { isDeleted: false, OR: orClauses };
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      nonprofit: { select: { id: true, name: true, logoUrl: true, verified: true } },
      donation: { select: { amountCents: true, currency: true } },
      _count: { select: { likes: true, comments: true } },
      likes: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
  });

  let nextCursor: string | undefined;
  if (posts.length > limit) {
    nextCursor = posts.pop()!.id;
  }

  const formatted = posts.map((post) => ({
    ...post,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerLiked: session?.user?.id ? post.likes.length > 0 : false,
    likes: undefined,
    _count: undefined,
  }));

  return NextResponse.json({ posts: formatted, nextCursor });
}
