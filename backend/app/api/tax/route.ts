import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;
  if (isNaN(year) || year < 2000 || year > currentYear) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const donations = await prisma.donation.findMany({
    where: {
      userId: session.user.id,
      status: "SUCCEEDED",
      donatedAt: { gte: startDate, lt: endDate },
    },
    include: {
      nonprofit: { select: { id: true, name: true, ein: true, logoUrl: true } },
      receipt: true,
      posts: {
        where: { isDeleted: false },
        select: { id: true, caption: true, allowComments: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { donatedAt: "desc" },
  });

  const totalCents = donations.reduce((sum, d) => sum + d.amountCents, 0);

  return NextResponse.json({ year, donations, totalCents });
}
