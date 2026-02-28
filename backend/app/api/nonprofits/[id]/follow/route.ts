import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: nonprofitId } = await params;

  const existing = await prisma.nonprofitFollow.findUnique({
    where: { userId_nonprofitId: { userId: session.user.id, nonprofitId } },
  });

  if (existing) {
    await prisma.nonprofitFollow.delete({
      where: { userId_nonprofitId: { userId: session.user.id, nonprofitId } },
    });
  } else {
    await prisma.nonprofitFollow.create({
      data: { userId: session.user.id, nonprofitId },
    });
  }

  const followerCount = await prisma.nonprofitFollow.count({ where: { nonprofitId } });

  return NextResponse.json({ following: !existing, followerCount });
}
