"use client";

import { useEffect, useState } from "react";
import type { PayoutStatus } from "@prisma/client";

interface Payout {
  id: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  arrivalDate: string | null;
  description: string | null;
  failureMessage: string | null;
  createdAt: string;
}

interface PayoutsPanelProps {
  nonprofitId: string;
}

const STATUS_BADGE: Record<PayoutStatus, { label: string; classes: string }> = {
  PAID: { label: "Paid", classes: "bg-green-100 text-green-700" },
  IN_TRANSIT: { label: "In Transit", classes: "bg-blue-100 text-blue-700" },
  PENDING: { label: "Pending", classes: "bg-yellow-100 text-yellow-700" },
  FAILED: { label: "Failed", classes: "bg-red-100 text-red-700" },
  CANCELED: { label: "Canceled", classes: "bg-gray-100 text-gray-500" },
};

function formatAmount(cents: number, currency: string): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
}

export function PayoutsPanel({ nonprofitId }: PayoutsPanelProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    async function fetchPayouts() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/portal/nonprofits/${nonprofitId}/payouts?page=${page}&limit=${limit}`
        );
        if (res.ok) {
          const data = await res.json();
          setPayouts(data.payouts);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch payouts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayouts();
  }, [nonprofitId, page]);

  const totalPages = Math.ceil(total / limit);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Table header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-sm text-gray-500">
          {total} payout{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Arrival Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                  No payouts yet. Payouts appear here once donors complete a donation.
                </td>
              </tr>
            ) : (
              payouts.map((payout) => {
                const badge = STATUS_BADGE[payout.status];
                return (
                  <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatAmount(payout.amountCents, payout.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                      {payout.status === "FAILED" && payout.failureMessage && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate">
                          {payout.failureMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(payout.arrivalDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[240px] truncate">
                      {payout.description ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev || loading}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
