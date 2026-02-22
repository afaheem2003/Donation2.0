"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, Download, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PostComposer } from "@/components/PostComposer";
import { formatCents, formatDate } from "@/lib/utils";
import { Suspense } from "react";

interface DonationData {
  id: string;
  amountCents: number;
  currency: string;
  donatedAt: string;
  nonprofit: {
    id: string;
    name: string;
    ein: string;
  };
  receipt: {
    receiptNumber: string;
    taxYear: number;
    legalText: string;
  } | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get("donation_id");
  const [donation, setDonation] = useState<DonationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!donationId) {
      setError("Invalid donation link.");
      setLoading(false);
      return;
    }

    // Poll until donation is SUCCEEDED (webhook may take a moment)
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const res = await fetch(`/api/donations/${donationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCEEDED") {
          setDonation(data);
          setLoading(false);
          return;
        }
      }
      if (attempts < 10) {
        setTimeout(poll, 1500);
      } else {
        setError("Donation is being processed. Check your Tax Center in a moment.");
        setLoading(false);
      }
    };
    poll();
  }, [donationId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
        <p className="text-gray-500">Confirming your donation...</p>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">{error || "Something went wrong."}</p>
        <Link href="/tax" className="text-brand-600 font-medium">Go to Tax Center →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Success banner */}
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Thank you! 🎉</h1>
        <p className="text-gray-500">
          Your donation of{" "}
          <span className="font-semibold text-gray-900">
            {formatCents(donation.amountCents, donation.currency)}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-gray-900">{donation.nonprofit.name}</span>{" "}
          was received.
        </p>
      </div>

      {/* Receipt card */}
      {donation.receipt && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Donation Receipt</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Receipt #</dt>
              <dd className="font-mono font-medium">{donation.receipt.receiptNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Date</dt>
              <dd>{formatDate(donation.donatedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-semibold">{formatCents(donation.amountCents, donation.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Nonprofit</dt>
              <dd className="text-right">{donation.nonprofit.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">EIN</dt>
              <dd className="font-mono">{donation.nonprofit.ein}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax Year</dt>
              <dd>{donation.receipt.taxYear}</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 leading-relaxed">{donation.receipt.legalText}</p>
          </div>
          <Link
            href="/tax"
            className="mt-4 flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            <Download className="w-4 h-4" />
            View all receipts in Tax Center
          </Link>
        </div>
      )}

      {/* Share moment */}
      <div className="mb-6">
        <h2 className="font-bold text-gray-900 mb-3">Share your impact</h2>
        <PostComposer
          nonprofitId={donation.nonprofit.id}
          nonprofitName={donation.nonprofit.name}
          donationId={donation.id}
          amountCents={donation.amountCents}
        />
      </div>

      <div className="flex gap-3">
        <Link
          href="/discover"
          className="flex-1 text-center py-3 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Discover more
        </Link>
        <Link
          href="/"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          Go to feed <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function DonationSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
