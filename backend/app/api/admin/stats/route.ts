import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [totalUsers, totalNonprofits, donationAgg, pendingApplications] = await Promise.all([
    prisma.user.count(),
    prisma.nonprofit.count(),
    prisma.donation.aggregate({
      _count: { id: true },
      _sum: { amountCents: true },
      where: { status: "SUCCEEDED" },
    }),
    prisma.nonprofitApplication.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalNonprofits,
    totalDonations: donationAgg._count.id,
    totalAmountCents: donationAgg._sum.amountCents ?? 0,
    pendingApplications,
  });
}
