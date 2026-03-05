"use client";

import { useEffect, useState } from "react";

interface MonthlyStat {
  month: string;
  label: string;
  raisedCents: number;
  donationCount: number;
}

interface TopDonor {
  userId: string | null;
  name: string;
  username: string | null;
  totalCents: number;
  donationCount: number;
}

interface CampaignStat {
  id: string;
  title: string;
  raisedCents: number;
  donorCount: number;
  status: string;
}

interface AnalyticsData {
  summary: {
    totalRaisedCents: number;
    totalDonors: number;
    totalDonations: number;
    avgDonationCents: number;
    thisMonthCents: number;
    lastMonthCents: number;
    thisMonthCount: number;
  };
  monthlyTrend: MonthlyStat[];
  topDonors: TopDonor[];
  campaignComparison: CampaignStat[];
}

interface AnalyticsDashboardProps {
  nonprofitId: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  ACTIVE: { label: "Active", classes: "bg-green-100 text-green-700" },
  DRAFT: { label: "Draft", classes: "bg-yellow-100 text-yellow-700" },
  PAUSED: { label: "Paused", classes: "bg-orange-100 text-orange-700" },
  ENDED: { label: "Ended", classes: "bg-gray-100 text-gray-600" },
  ARCHIVED: { label: "Archived", classes: "bg-gray-100 text-gray-400" },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  );
}

function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-8 flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-20 flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ nonprofitId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/portal/nonprofits/${nonprofitId}/analytics`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((json: AnalyticsData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nonprofitId]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 font-medium">
        Failed to load analytics.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-36 mb-6" />
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gray-200 rounded-t-sm"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonSection rows={4} />
        <SkeletonSection rows={3} />
      </div>
    );
  }

  if (!data) return null;

  const { summary, monthlyTrend, topDonors, campaignComparison } = data;

  const summaryCards = [
    {
      label: "Total Raised",
      value: formatCents(summary.totalRaisedCents),
      sub: "all time",
    },
    {
      label: "Total Donors",
      value: summary.totalDonors.toLocaleString(),
      sub: "unique donors",
    },
    {
      label: "This Month",
      value: formatCents(summary.thisMonthCents),
      sub: `${summary.thisMonthCount} donation${summary.thisMonthCount !== 1 ? "s" : ""}`,
    },
    {
      label: "Avg Donation",
      value: formatCents(summary.avgDonationCents),
      sub: "per donation",
    },
  ];

  const maxCents = Math.max(...monthlyTrend.map((m) => m.raisedCents), 1);
  const allZero = monthlyTrend.every((m) => m.raisedCents === 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, sub }) => (
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

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-5">
          Monthly Trend
        </h2>
        {allZero ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            No data yet
          </div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {monthlyTrend.map((m) => {
              const heightPct = Math.max(4, (m.raisedCents / maxCents) * 100);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-brand-500 rounded-t-sm"
                    style={{ height: `${heightPct}%` }}
                    title={`${m.label}: ${formatCents(m.raisedCents)}`}
                  />
                  <span className="text-xs text-gray-400 truncate w-full text-center">
                    {m.month.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Donors */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
            Top Donors
          </h2>
        </div>
        {topDonors.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No data yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Donations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topDonors.map((donor, idx) => (
                  <tr key={donor.userId ?? idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{donor.name}</p>
                      {donor.username && (
                        <p className="text-xs text-gray-400">@{donor.username}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{donor.donationCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCents(donor.totalCents)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Comparison */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
            Campaign Comparison
          </h2>
        </div>
        {campaignComparison.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No campaigns yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Raised
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Donors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaignComparison.map((campaign) => {
                  const badge = STATUS_BADGE[campaign.status] ?? {
                    label: campaign.status,
                    classes: "bg-gray-100 text-gray-600",
                  };
                  const topCampaignCents = Math.max(
                    ...campaignComparison.map((c) => c.raisedCents),
                    1
                  );
                  const progressPct = Math.round(
                    (campaign.raisedCents / topCampaignCents) * 100
                  );
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {campaign.title}
                        </p>
                        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCents(campaign.raisedCents)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{campaign.donorCount}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
