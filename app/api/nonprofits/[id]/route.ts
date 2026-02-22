import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const nonprofit = await prisma.nonprofit.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          donations: { where: { status: "SUCCEEDED" } },
          posts: { where: { isDeleted: false } },
        },
      },
    },
  });

  if (!nonprofit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Aggregate total donated
  const aggregate = await prisma.donation.aggregate({
    where: { nonprofitId: id, status: "SUCCEEDED" },
    _sum: { amountCents: true },
  });

  return NextResponse.json({
    ...nonprofit,
    totalRaisedCents: aggregate._sum.amountCents ?? 0,
  });
}
