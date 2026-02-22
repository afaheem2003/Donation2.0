"use client";

import { useState, useEffect } from "react";
import { Download, Receipt, DollarSign, Loader2, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCents, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Donation {
  id: string;
  amountCents: number;
  currency: string;
  donatedAt: string;
  nonprofit: { id: string; name: string; ein: string; logoUrl?: string | null };
  receipt: { receiptNumber: string; taxYear: number; legalText: string } | null;
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function TaxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch(`/api/tax?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        setDonations(data.donations);
        setTotalCents(data.totalCents);
        setLoading(false);
      });
  }, [year, session]);

  function handleExport() {
    window.open(`/api/tax/export?year=${year}`, "_blank");
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your donation history & tax records</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 mb-6">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              year === y
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-brand-100" />
          <p className="text-brand-100 text-sm">Total donated in {year}</p>
        </div>
        <p className="text-4xl font-bold">{formatCents(totalCents)}</p>
        <p className="text-brand-100 text-sm mt-1">
          {donations.length} donation{donations.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
        </div>
      ) : donations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No donations in {year}</p>
          <Link href="/discover" className="text-brand-600 text-sm mt-2 block">
            Find nonprofits to support →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <div className="flex items-center gap-3 text-left">
                  {d.nonprofit.logoUrl ? (
                    <Image
                      src={d.nonprofit.logoUrl}
                      alt={d.nonprofit.name}
                      width={36}
                      height={36}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-lg">🤝</div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{d.nonprofit.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(d.donatedAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCents(d.amountCents, d.currency)}</p>
                  {d.receipt && (
                    <p className="text-xs text-gray-400 font-mono">{d.receipt.receiptNumber}</p>
                  )}
                </div>
              </button>

              {expanded === d.id && d.receipt && (
                <div className="px-5 pb-4 border-t border-gray-50">
                  <div className="flex items-start gap-2 mt-3">
                    <FileText className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Tax Receipt</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{d.receipt.legalText}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>EIN: <span className="font-mono">{d.nonprofit.ein}</span></div>
                        <div>Tax Year: <span className="font-medium">{d.receipt.taxYear}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
