"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, X, Check, XCircle, Eye, Shield } from "lucide-react";
import type { ApplicationListItem, ApplicationStatus, ApplicationDetail } from "@/types/admin";
import { STATUS_BADGE } from "@/types/admin";

const TABS: { label: string; value: string }[] = [
  { label: "All",          value: "" },
  { label: "Pending",      value: "PENDING" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Approved",     value: "APPROVED" },
  { label: "Rejected",     value: "REJECTED" },
];

export default function ApplicationsPage() {
  const [tab, setTab] = useState("");
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (tab) params.set("status", tab);
    const res = await fetch(`/api/admin/applications?${params}`);
    const data = await res.json();
    setApplications(data.applications ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function openDetail(id: string) {
    setPanelLoading(true);
    setSelected(null);
    const res = await fetch(`/api/admin/applications/${id}`);
    const data = await res.json();
    setSelected(data.application);
    setReviewNotes(data.application.reviewNotes ?? "");
    setPanelLoading(false);
  }

  async function updateStatus(status: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    if (!selected || actionLoading) return;
    setActionLoading(true);
    await fetch(`/api/admin/applications/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes }),
    });
    setActionLoading(false);
    setSelected(null);
    fetchList();
  }

  const panelOpen = selected !== null || panelLoading;

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Main table */}
      <div className={`flex flex-col min-w-0 space-y-4 transition-all duration-300 ${panelOpen ? "flex-[3]" : "flex-1"}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setSelected(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">No applications found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Organization</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">EIN</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => openDetail(app.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === app.id ? "bg-violet-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{app.orgName}</p>
                      <p className="text-xs text-gray-400">{app.submittedByEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{app.ein}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[app.status as ApplicationStatus].className}`}>
                        {STATUS_BADGE[app.status as ApplicationStatus].label}
                      </span>
                      {app.isClaim && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                          Claim
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide panel */}
      {panelOpen && (
        <div className="flex-[2] max-w-sm flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 truncate">
              {selected ? selected.orgName : "Loading…"}
            </h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {panelLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selected ? (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Status */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[selected.status].className}`}>
                  {STATUS_BADGE[selected.status].label}
                </span>

                {selected.isClaim && (
                  <div className="flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                    <Shield className="w-3.5 h-3.5" />
                    This is a claim for an existing organization already in the directory.
                  </div>
                )}

                {/* Fields */}
                {(
                  [
                    ["EIN", selected.ein],
                    ["Category", selected.category.replace(/_/g, " ")],
                    ["Submitted by", `${selected.submittedByName} (${selected.submittedByEmail})`],
                    ["Website", selected.website],
                    ["Address", [selected.addressLine1, selected.city, selected.state, selected.zip].filter(Boolean).join(", ")],
                  ] as [string, string | null | undefined][]
                ).map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-gray-700">{value}</p>
                    </div>
                  ) : null
                )}

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</p>
                </div>

                {/* Review notes */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Review Notes</p>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    placeholder="Add internal notes…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              {/* Action buttons */}
              {selected.status !== "APPROVED" && selected.status !== "REJECTED" ? (
                <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => updateStatus("UNDER_REVIEW")}
                    disabled={actionLoading || selected.status === "UNDER_REVIEW"}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review
                  </button>
                  <button
                    onClick={() => updateStatus("REJECTED")}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => updateStatus("APPROVED")}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              ) : (
                <div className="px-5 py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">
                    Application {selected.status.toLowerCase()}.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
