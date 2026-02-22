import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [posts, donationStats] = await Promise.all([
    prisma.post.findMany({
      where: { userId: user.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        nonprofit: { select: { id: true, name: true, logoUrl: true, verified: true } },
        donation: { select: { amountCents: true, currency: true } },
        _count: { select: { likes: true, comments: true } },
        likes: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
      },
    }),
    prisma.donation.aggregate({
      where: { userId: user.id, status: "SUCCEEDED" },
      _sum: { amountCents: true },
      _count: { id: true },
    }),
  ]);

  const formattedPosts = posts.map((post) => ({
    ...post,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerLiked: session?.user?.id ? post.likes.length > 0 : false,
    likes: undefined,
    _count: undefined,
  }));

  return NextResponse.json({
    user,
    posts: formattedPosts,
    totalDonatedCents: donationStats._sum.amountCents ?? 0,
    donationCount: donationStats._count.id,
  });
}
