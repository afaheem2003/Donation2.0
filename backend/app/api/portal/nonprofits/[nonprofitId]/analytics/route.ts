import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${MONTH_LABELS[month] ?? month} ${year}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build last 12 months date ranges
  const monthRanges: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    const label = formatMonthLabel(key);
    monthRanges.push({ key, label, start, end });
  }

  const baseWhere = { nonprofitId, status: "SUCCEEDED" as const };

  // Run summary totals, this month, last month, top donors groupBy, and campaign comparison in parallel
  const [
    totalsResult,
    totalDonorsResult,
    thisMonthResult,
    lastMonthResult,
    topDonorGroups,
    campaigns,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: baseWhere,
      _sum: { amountCents: true },
      _count: { id: true },
    }),
    prisma.donation.groupBy({
      by: ["userId"],
      where: { ...baseWhere, userId: { not: null } },
    }),
    prisma.donation.aggregate({
      where: {
        ...baseWhere,
        donatedAt: { gte: thisMonthStart },
      },
      _sum: { amountCents: true },
      _count: { id: true },
    }),
    prisma.donation.aggregate({
      where: {
        ...baseWhere,
        donatedAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { amountCents: true },
    }),
    prisma.donation.groupBy({
      by: ["userId"],
      where: baseWhere,
      _sum: { amountCents: true },
      _count: { id: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 10,
    }),
    prisma.campaign.findMany({
      where: { nonprofitId, status: { not: "ARCHIVED" } },
      orderBy: { raisedCents: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        raisedCents: true,
        donorCount: true,
        status: true,
      },
    }),
  ]);

  const totalRaisedCents = totalsResult._sum.amountCents ?? 0;
  const totalDonations = totalsResult._count.id;
  const totalDonors = totalDonorsResult.length;
  const avgDonationCents = totalDonations > 0 ? Math.round(totalRaisedCents / totalDonations) : 0;
  const thisMonthCents = thisMonthResult._sum.amountCents ?? 0;
  const lastMonthCents = lastMonthResult._sum.amountCents ?? 0;
  const thisMonthCount = thisMonthResult._count.id;

  // Monthly trend: query each month in parallel
  const monthlyResults = await Promise.all(
    monthRanges.map(({ start, end }) =>
      prisma.donation.aggregate({
        where: {
          ...baseWhere,
          donatedAt: { gte: start, lt: end },
        },
        _sum: { amountCents: true },
        _count: { id: true },
      })
    )
  );

  const monthlyTrend = monthRanges.map(({ key, label }, idx) => ({
    month: key,
    label,
    raisedCents: monthlyResults[idx]._sum.amountCents ?? 0,
    donationCount: monthlyResults[idx]._count.id,
  }));

  // Fetch user details for top donors
  const userIds = topDonorGroups
    .map((g) => g.userId)
    .filter((id): id is string => id !== null);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const topDonors = topDonorGroups.map((g) => {
    const user = g.userId ? userMap.get(g.userId) : null;
    return {
      userId: g.userId ?? null,
      name: user?.name ?? "Anonymous",
      username: user?.username ?? null,
      totalCents: g._sum.amountCents ?? 0,
      donationCount: g._count.id,
    };
  });

  const campaignComparison = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    raisedCents: c.raisedCents,
    donorCount: c.donorCount,
    status: c.status,
  }));

  return NextResponse.json({
    summary: {
      totalRaisedCents,
      totalDonors,
      totalDonations,
      avgDonationCents,
      thisMonthCents,
      lastMonthCents,
      thisMonthCount,
    },
    monthlyTrend,
    topDonors,
    campaignComparison,
  });
}
