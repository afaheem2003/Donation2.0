import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BadgeCheck, Megaphone, Plus, BarChart3 } from "lucide-react";

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/dashboard");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: {
      nonprofitId: true,
      nonprofit: {
        select: {
          id: true,
          name: true,
          verified: true,
        },
      },
    },
  });

  if (!adminRecord) redirect("/portal/apply");

  const nonprofitId = adminRecord.nonprofitId;
  const nonprofit = adminRecord.nonprofit;

  // Fetch stats concurrently
  const [raisedResult, donorCountResult, followerCount, campaignCount, recentDonations] =
    await Promise.all([
      // Total raised (succeeded donations)
      prisma.donation.aggregate({
        where: { nonprofitId, status: "SUCCEEDED" },
        _sum: { amountCents: true },
      }),

      // Unique donor count
      prisma.donation.groupBy({
        by: ["userId"],
        where: { nonprofitId, status: "SUCCEEDED", userId: { not: null } },
      }),

      // Follower count
      prisma.nonprofitFollow.count({ where: { nonprofitId } }),

      // Campaign count
      prisma.campaign.count({ where: { nonprofitId } }),

      // Recent 5 succeeded donations with donor name
      prisma.donation.findMany({
        where: { nonprofitId, status: "SUCCEEDED" },
        orderBy: { donatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          amountCents: true,
          donatedAt: true,
          createdAt: true,
          campaign: { select: { title: true } },
          user: { select: { name: true, avatarUrl: true } },
        },
      }),
    ]);

  const totalRaisedCents = raisedResult._sum.amountCents ?? 0;
  const donorCount = donorCountResult.length;

  const stats = [
    {
      label: "Total Raised",
      value: formatCurrency(totalRaisedCents),
      sub: "all time",
    },
    {
      label: "Donors",
      value: donorCount.toLocaleString(),
      sub: "unique donors",
    },
    {
      label: "Followers",
      value: followerCount.toLocaleString(),
      sub: "community members",
    },
    {
      label: "Campaigns",
      value: campaignCount.toLocaleString(),
      sub: "total campaigns",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 mb-1">Welcome back,</p>
        <h1 className="text-2xl font-black text-gray-900">
          {session.user.name?.split(" ")[0] ?? "there"}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-600 font-medium">{nonprofit.name}</span>
          {nonprofit.verified && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
              <BadgeCheck className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              {label}
            </p>
            <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent donations */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Donations</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {recentDonations.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              No donations yet. Share your profile to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentDonations.map((donation) => {
                const donorName = donation.user?.name ?? "Anonymous";
                const displayName =
                  donorName.length > 12
                    ? `${donorName.split(" ")[0]} ${donorName.split(" ")[1]?.[0] ?? ""}.`.trim()
                    : donorName;
                const timestamp = donation.donatedAt ?? donation.createdAt;
                return (
                  <li key={donation.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-brand-700">
                        {donorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{displayName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {donation.campaign?.title ?? "General Fund"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(donation.amountCents)}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(timestamp)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/portal/campaigns/new"
            className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
          <Link
            href="/portal/analytics"
            className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-full text-sm border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-gray-400" />
            View Analytics
          </Link>
          <Link
            href="/portal/campaigns"
            className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-full text-sm border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Megaphone className="w-4 h-4 text-gray-400" />
            Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
}
