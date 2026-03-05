"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Edit2,
  Users,
  TrendingUp,
  Calendar,
  Target,
  Plus,
  Megaphone,
  Trash2,
} from "lucide-react";
import type { CampaignStatus } from "@prisma/client";

interface CampaignUpdate {
  id: string;
  title: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null; username: string; avatarUrl: string | null };
}

interface Donation {
  id: string;
  amountCents: number;
  donatedAt: string | null;
  createdAt: string;
  user: { name: string | null; username: string; avatarUrl: string | null } | null;
}

interface Campaign {
  id: string;
  nonprofitId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  goalCents: number | null;
  raisedCents: number;
  donorCount: number;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updates: CampaignUpdate[];
  donations: Donation[];
}

interface CampaignDetailProps {
  campaign: Campaign;
  nonprofitId: string;
}

const STATUS_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  ACTIVE: { label: "Active", classes: "bg-green-100 text-green-700" },
  DRAFT: { label: "Draft", classes: "bg-yellow-100 text-yellow-700" },
  PAUSED: { label: "Paused", classes: "bg-orange-100 text-orange-700" },
  ENDED: { label: "Ended", classes: "bg-gray-100 text-gray-600" },
  ARCHIVED: { label: "Archived", classes: "bg-gray-100 text-gray-400" },
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function daysRemaining(endsAt: string | null): string {
  if (!endsAt) return "No deadline";
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? "s" : ""} left`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignDetail({ campaign, nonprofitId }: CampaignDetailProps) {
  const [updates, setUpdates] = useState<CampaignUpdate[]>(campaign.updates);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<CampaignStatus>(campaign.status);

  const badge = STATUS_BADGE[currentStatus];
  const progress =
    campaign.goalCents && campaign.goalCents > 0
      ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
      : null;

  async function handleStatusChange(newStatus: CampaignStatus) {
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/portal/nonprofits/${nonprofitId}/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error ?? "Failed to update status.");
        return;
      }
      setCurrentStatus(newStatus);
    } catch {
      setActionError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePostUpdate(e: React.FormEvent) {
    e.preventDefault();
    setUpdateError(null);
    if (!updateBody || updateBody.trim().length < 10) {
      setUpdateError("Body must be at least 10 characters.");
      return;
    }
    setUpdateSubmitting(true);
    try {
      const res = await fetch(
        `/api/portal/nonprofits/${nonprofitId}/campaigns/${campaign.id}/updates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updateTitle.trim() || undefined,
            body: updateBody.trim(),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUpdateError(data?.error ?? "Failed to post update.");
        return;
      }
      const created = await res.json();
      setUpdates((prev) => [created, ...prev]);
      setUpdateTitle("");
      setUpdateBody("");
      setShowUpdateForm(false);
    } catch {
      setUpdateError("Network error.");
    } finally {
      setUpdateSubmitting(false);
    }
  }

  async function handleDeleteUpdate(updateId: string) {
    if (!confirm("Delete this update?")) return;
    try {
      await fetch(
        `/api/portal/nonprofits/${nonprofitId}/campaigns/${campaign.id}/updates/${updateId}`,
        { method: "DELETE" }
      );
      setUpdates((prev) => prev.filter((u) => u.id !== updateId));
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/portal/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 transition-colors"
      >
        Back to campaigns
      </Link>

      {/* Cover image */}
      {campaign.coverImageUrl && (
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
          <Image
            src={campaign.coverImageUrl}
            alt={campaign.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign.title}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${badge.classes}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Created {formatDate(campaign.createdAt)}
            {campaign.publishedAt ? ` · Published ${formatDate(campaign.publishedAt)}` : ""}
          </p>
        </div>
        <Link
          href={`/portal/campaigns/${campaign.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:text-brand-700 rounded-lg transition-colors flex-shrink-0"
        >
          <Edit2 className="w-4 h-4" />
          Edit Campaign
        </Link>
      </div>

      {/* Progress section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Progress
        </h2>
        <div className="flex items-end gap-6 mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">{formatCents(campaign.raisedCents)}</p>
            <p className="text-sm text-gray-500">
              {campaign.goalCents ? `of ${formatCents(campaign.goalCents)} goal` : "raised (open-ended)"}
            </p>
          </div>
          {progress !== null && (
            <p className="text-2xl font-bold text-brand-600">{progress}%</p>
          )}
        </div>
        {progress !== null && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{formatCents(campaign.raisedCents)}</p>
              <p className="text-xs text-gray-500">Total raised</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{campaign.donorCount}</p>
              <p className="text-xs text-gray-500">Donors</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{daysRemaining(campaign.endsAt)}</p>
              <p className="text-xs text-gray-500">Time remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Description
        </h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {campaign.description}
        </p>
      </div>

      {/* Action buttons */}
      {actionError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {actionError}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {currentStatus === "DRAFT" && (
          <button
            onClick={() => handleStatusChange("ACTIVE")}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Publish Campaign
          </button>
        )}
        {currentStatus === "ACTIVE" && (
          <button
            onClick={() => handleStatusChange("PAUSED")}
            disabled={actionLoading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Pause Campaign
          </button>
        )}
        {currentStatus === "PAUSED" && (
          <button
            onClick={() => handleStatusChange("ACTIVE")}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Resume Campaign
          </button>
        )}
        {(currentStatus === "ACTIVE" || currentStatus === "PAUSED") && (
          <button
            onClick={() => handleStatusChange("ENDED")}
            disabled={actionLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:border-gray-400 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            End Campaign
          </button>
        )}
        {(currentStatus === "ENDED" || currentStatus === "PAUSED" || currentStatus === "DRAFT") && (
          <button
            onClick={() => handleStatusChange("ARCHIVED")}
            disabled={actionLoading}
            className="px-4 py-2 border border-red-200 text-red-600 hover:border-red-300 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>

      {/* Updates section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Updates ({updates.length})
          </h2>
          <button
            onClick={() => setShowUpdateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Update
          </button>
        </div>

        {/* Inline update form */}
        {showUpdateForm && (
          <form onSubmit={handlePostUpdate} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
                placeholder="Update title"
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Body <span className="text-red-500">*</span>
              </label>
              <textarea
                value={updateBody}
                onChange={(e) => setUpdateBody(e.target.value)}
                placeholder="Share an update with your donors..."
                rows={4}
                maxLength={10000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {updateError && (
              <p className="text-xs text-red-600">{updateError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateSubmitting}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {updateSubmitting ? "Posting..." : "Post Update"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpdateForm(false);
                  setUpdateError(null);
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Updates list */}
        {updates.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Megaphone className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No updates yet. Post your first update to donors.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="p-4 border border-gray-100 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {update.title && (
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {update.title}
                      </h3>
                    )}
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {update.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(update.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete update"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent donations */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Recent Donations
        </h2>
        {campaign.donations.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Target className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No donations yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaign.donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {donation.user?.name ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(donation.donatedAt ?? donation.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCents(donation.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
