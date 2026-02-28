import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const donations = await prisma.donation.findMany({
    where: { userId: session.user.id, status: "SUCCEEDED" },
    orderBy: { donatedAt: "desc" },
    include: {
      nonprofit: { select: { id: true, name: true, logoUrl: true } },
      posts: {
        where: { isDeleted: false },
        select: { id: true, caption: true, allowComments: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ donations });
}
