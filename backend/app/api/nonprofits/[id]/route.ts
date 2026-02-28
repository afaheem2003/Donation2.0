import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);

  const [nonprofit, aggregate, followerCount, viewerFollow] = await Promise.all([
    prisma.nonprofit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            donations: { where: { status: "SUCCEEDED" } },
            posts: { where: { isDeleted: false } },
          },
        },
      },
    }),
    prisma.donation.aggregate({
      where: { nonprofitId: id, status: "SUCCEEDED" },
      _sum: { amountCents: true },
    }),
    prisma.nonprofitFollow.count({ where: { nonprofitId: id } }),
    session?.user?.id
      ? prisma.nonprofitFollow.findUnique({
          where: { userId_nonprofitId: { userId: session.user.id, nonprofitId: id } },
        })
      : null,
  ]);

  if (!nonprofit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...nonprofit,
    totalRaisedCents: aggregate._sum.amountCents ?? 0,
    followerCount,
    viewerFollowing: viewerFollow !== null && viewerFollow !== undefined,
  });
}
