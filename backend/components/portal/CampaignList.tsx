"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Megaphone } from "lucide-react";
import type { CampaignStatus } from "@prisma/client";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: CampaignStatus;
  goalCents: number | null;
  raisedCents: number;
  donorCount: number;
  endsAt: string | null;
  createdAt: string;
  coverImageUrl: string | null;
}

interface CampaignListProps {
  campaigns: Campaign[];
  total: number;
}

const STATUS_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  ACTIVE: { label: "Active", classes: "bg-green-100 text-green-700" },
  DRAFT: { label: "Draft", classes: "bg-yellow-100 text-yellow-700" },
  PAUSED: { label: "Paused", classes: "bg-orange-100 text-orange-700" },
  ENDED: { label: "Ended", classes: "bg-gray-100 text-gray-600" },
  ARCHIVED: { label: "Archived", classes: "bg-gray-100 text-gray-400" },
};

const FILTER_TABS: { label: string; value: CampaignStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Ended", value: "ENDED" },
  { label: "Archived", value: "ARCHIVED" },
];

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No deadline";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignList({ campaigns, total }: CampaignListProps) {
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | "ALL">("ALL");

  const filtered =
    activeFilter === "ALL"
      ? campaigns
      : campaigns.filter((c) => c.status === activeFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total campaign{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/portal/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {FILTER_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeFilter === value
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <Megaphone className="w-6 h-6 text-brand-500" />
          </div>
          <p className="text-gray-500 font-medium">No campaigns yet. Create your first campaign.</p>
          <Link
            href="/portal/campaigns/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Donors
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((campaign) => {
                const badge = STATUS_BADGE[campaign.status];
                const progress =
                  campaign.goalCents && campaign.goalCents > 0
                    ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
                    : null;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/portal/campaigns/${campaign.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-brand-700 transition-colors line-clamp-1"
                      >
                        {campaign.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {progress !== null ? (
                        <div className="min-w-[120px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 font-medium">
                              {formatCents(campaign.raisedCents)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {progress}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            of {formatCents(campaign.goalCents!)} goal
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {formatCents(campaign.raisedCents)}
                          </p>
                          <p className="text-xs text-gray-400">Open-ended</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{campaign.donorCount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{formatDate(campaign.endsAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/portal/campaigns/${campaign.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-brand-700 border border-gray-200 hover:border-brand-300 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
