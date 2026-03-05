"use client";

import { useEffect, useState, useCallback } from "react";
import type { DonationStatus } from "@prisma/client";

interface Donation {
  id: string;
  amountCents: number;
  currency: string;
  status: DonationStatus;
  donatedAt: string | null;
  createdAt: string;
  campaignId: string | null;
  campaignTitle: string | null;
  donorName: string;
  donorEmail: string | null;
  donorUsername: string | null;
}

interface Filters {
  status: "" | DonationStatus;
  campaignId: string;
  from: string;
  to: string;
}

interface DonationTableProps {
  nonprofitId: string;
}

const STATUS_BADGE: Record<DonationStatus, { label: string; classes: string }> = {
  SUCCEEDED: { label: "Succeeded", classes: "bg-green-100 text-green-700" },
  PENDING: { label: "Pending", classes: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "Failed", classes: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Refunded", classes: "bg-gray-100 text-gray-600" },
};

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildQuery(
  nonprofitId: string,
  filters: Filters,
  page: number,
  limit: number,
  exportCsv?: boolean
): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (exportCsv) {
    params.set("export", "csv");
  } else {
    params.set("page", String(page));
    params.set("limit", String(limit));
  }
  const qs = params.toString();
  return `/api/portal/nonprofits/${nonprofitId}/donations${qs ? `?${qs}` : ""}`;
}

export function DonationTable({ nonprofitId }: DonationTableProps) {
  const [filters, setFilters] = useState<Filters>({
    status: "",
    campaignId: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const limit = 25;
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters =
    filters.status !== "" ||
    filters.campaignId !== "" ||
    filters.from !== "" ||
    filters.to !== "";

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const url = buildQuery(nonprofitId, filters, page, limit);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch donations");
      const data = await res.json();
      setDonations(data.donations);
      setTotal(data.total);
    } catch {
      setDonations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [nonprofitId, filters, page]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  function handleFilterChange(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleClearFilters() {
    setFilters({ status: "", campaignId: "", from: "", to: "" });
    setPage(1);
  }

  function handleExportCsv() {
    const url = buildQuery(nonprofitId, filters, 1, limit, true);
    setExporting(true);
    window.location.href = url;
    // Reset exporting state after a short delay
    setTimeout(() => setExporting(false), 2000);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.status}
            onChange={(e) =>
              handleFilterChange({ status: e.target.value as "" | DonationStatus })
            }
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange({ from: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="From"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange({ to: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="To"
          />

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-24 flex-shrink-0" />
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-28 flex-grow" />
                <div className="h-4 bg-gray-100 rounded w-16 flex-shrink-0" />
                <div className="h-5 bg-gray-100 rounded-full w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : donations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-500 text-sm font-medium">
              {hasActiveFilters
                ? "No donations match your filters."
                : "No donations found."}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Donor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donations.map((donation) => {
                const badge = STATUS_BADGE[donation.status];
                return (
                  <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(donation.donatedAt ?? donation.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {donation.donorName}
                      </p>
                      {donation.donorEmail && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {donation.donorEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {donation.campaignTitle ?? (
                        <span className="text-gray-400 italic">General Fund</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatAmount(donation.amountCents, donation.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
