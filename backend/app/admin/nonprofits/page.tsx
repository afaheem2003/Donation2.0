"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, CheckCircle, Circle } from "lucide-react";

interface AdminNonprofit {
  id: string;
  name: string;
  ein: string;
  category: string;
  verified: boolean;
  createdAt: string;
  _count: { donations: number; followers: number };
}

export default function NonprofitsPage() {
  const [nonprofits, setNonprofits] = useState<AdminNonprofit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (q) params.set("q", q);
    if (verifiedFilter) params.set("verified", verifiedFilter);
    const res = await fetch(`/api/admin/nonprofits?${params}`);
    const data = await res.json();
    setNonprofits(data.nonprofits ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, verifiedFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function toggleVerified(id: string, current: boolean) {
    setToggling(id);
    await fetch(`/api/admin/nonprofits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: !current }),
    });
    setNonprofits((prev) =>
      prev.map((n) => n.id === id ? { ...n, verified: !current } : n)
    );
    setToggling(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nonprofits</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} registered</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or EIN…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nonprofits.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-gray-400">No nonprofits found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">EIN</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">Donations</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">Followers</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {nonprofits.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`/nonprofit/${n.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-violet-600 transition-colors"
                    >
                      {n.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{n.ein}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {n.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{n._count.donations}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{n._count.followers}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleVerified(n.id, n.verified)}
                      disabled={toggling === n.id}
                      title={n.verified ? "Revoke verification" : "Mark as verified"}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {n.verified
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Circle className="w-5 h-5 text-gray-300" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
