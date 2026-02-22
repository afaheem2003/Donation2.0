import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 10;

  const posts = await prisma.post.findMany({
    where: { isDeleted: false },
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
