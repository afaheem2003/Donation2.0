"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, ExternalLink } from "lucide-react";
import type { StripeConnectStatus } from "@prisma/client";

interface ConnectStatus {
  status: StripeConnectStatus | "NOT_CONNECTED";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface StripeConnectBannerProps {
  nonprofitId: string;
}

export function StripeConnectBanner({ nonprofitId }: StripeConnectBannerProps) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/portal/nonprofits/${nonprofitId}/stripe/connect`);
        if (res.ok) {
          const data = await res.json();
          setConnectStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch Stripe Connect status:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [nonprofitId]);

  async function handleConnectOrRefresh() {
    setPosting(true);
    try {
      const res = await fetch(`/api/portal/nonprofits/${nonprofitId}/stripe/connect`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onboardingUrl) {
          window.open(data.onboardingUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        console.error("Failed to create Stripe onboarding link");
      }
    } catch (err) {
      console.error("Stripe Connect error:", err);
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-72 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!connectStatus) return null;

  const { status, chargesEnabled, payoutsEnabled } = connectStatus;

  if (status === "ACTIVE" && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 text-sm text-green-700 font-medium hover:underline"
      >
        <CheckCircle className="w-4 h-4" />
        Stripe Connected
      </button>
    );
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Stripe Connected — Payouts enabled</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  chargesEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {chargesEnabled ? "Charges enabled" : "Charges disabled"}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  payoutsEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {payoutsEnabled ? "Payouts enabled" : "Payouts disabled"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-green-600 hover:text-green-800 font-medium flex-shrink-0 mt-0.5"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (status === "NOT_CONNECTED") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Connect with Stripe to receive payouts</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Link your bank account to start receiving donations directly.
            </p>
          </div>
        </div>
        <button
          onClick={handleConnectOrRefresh}
          disabled={posting}
          className="inline-flex items-center gap-1.5 flex-shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {posting ? "Loading..." : "Connect with Stripe"}
        </button>
      </div>
    );
  }

  if (status === "PENDING_VERIFICATION") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Complete your Stripe setup to receive payouts
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Your Stripe account is pending — finish onboarding to start accepting donations.
            </p>
          </div>
        </div>
        <button
          onClick={handleConnectOrRefresh}
          disabled={posting}
          className="inline-flex items-center gap-1.5 flex-shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {posting ? "Loading..." : "Continue Setup"}
        </button>
      </div>
    );
  }

  if (status === "RESTRICTED") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Account restricted. Additional verification required.</p>
            <p className="text-xs text-red-600 mt-0.5">
              Your Stripe account has been restricted. Complete additional verification to restore access.
            </p>
          </div>
        </div>
        <button
          onClick={handleConnectOrRefresh}
          disabled={posting}
          className="inline-flex items-center gap-1.5 flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {posting ? "Loading..." : "Fix Issues"}
        </button>
      </div>
    );
  }

  if (status === "DEAUTHORIZED") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Stripe account disconnected. Please reconnect to accept donations.
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your Stripe Express account has been deauthorized.
            </p>
          </div>
        </div>
        <button
          onClick={handleConnectOrRefresh}
          disabled={posting}
          className="inline-flex items-center gap-1.5 flex-shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {posting ? "Loading..." : "Reconnect"}
        </button>
      </div>
    );
  }

  return null;
}
