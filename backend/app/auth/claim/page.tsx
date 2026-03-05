"use client";

import { useState } from "react";
import { Heart, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface FoundNonprofit {
  name: string;
  category: string;
  description: string;
  logoUrl: string | null;
  website: string | null;
}

export default function ClaimPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ein, setEin] = useState("");
  const [einStatus, setEinStatus] = useState<
    "idle" | "loading" | "not_found" | "claimed" | "pending" | "unclaimed"
  >("idle");
  const [foundNonprofit, setFoundNonprofit] = useState<FoundNonprofit | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const einRegex = /^\d{2}-\d{7}$/;

  async function handleEinLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!einRegex.test(ein)) return;
    setEinStatus("loading");
    setFoundNonprofit(null);
    try {
      const res = await fetch(`/api/auth/ein-lookup?ein=${encodeURIComponent(ein)}`);
      const data = await res.json();
      const status = data.status as typeof einStatus;
      setEinStatus(status);
      if (status === "unclaimed" && data.nonprofit) {
        setFoundNonprofit(data.nonprofit);
        setStep(2);
      }
    } catch {
      setEinStatus("not_found");
    }
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!foundNonprofit || !confirmed) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ein,
          submittedByName: name,
          submittedByEmail: email,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setStep(3);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 fill-brand-500 text-brand-500" />
          <span className="text-lg font-extrabold text-brand-600">GiveStream</span>
        </div>

        {step === 1 && (
          <>
            {/* Step indicator */}
            <p className="text-xs text-gray-400 font-medium mb-4">Step 1 of 2</p>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Claim your nonprofit page
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Enter your organization&apos;s EIN to find it in our directory.
            </p>

            <form onSubmit={handleEinLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employer Identification Number (EIN)
                </label>
                <input
                  type="text"
                  value={ein}
                  onChange={(e) => {
                    setEin(e.target.value);
                    setEinStatus("idle");
                  }}
                  placeholder="XX-XXXXXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                {ein && !einRegex.test(ein) && (
                  <p className="text-xs text-red-500 mt-1">
                    Please use the format XX-XXXXXXX (e.g. 12-3456789)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!einRegex.test(ein) || einStatus === "loading"}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 px-4 text-sm transition-colors"
              >
                {einStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Find my organization \u2192"
                )}
              </button>
            </form>

            {/* Result states */}
            {einStatus === "not_found" && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-sm text-orange-700 font-medium mb-1">
                  Organization not found
                </p>
                <p className="text-xs text-orange-600 mb-2">
                  We couldn&apos;t find this EIN in our directory. This may mean your
                  organization hasn&apos;t been added yet.
                </p>
                <a
                  href="/portal/apply/form"
                  className="text-xs font-semibold text-orange-700 hover:text-orange-800 transition-colors"
                >
                  Submit a full application &#8594;
                </a>
              </div>
            )}

            {einStatus === "claimed" && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Already claimed
                </p>
                <p className="text-xs text-gray-500">
                  This organization already has an admin account. If you believe this
                  is an error, contact{" "}
                  <a
                    href="mailto:support@givestream.org"
                    className="underline hover:text-gray-700 transition-colors"
                  >
                    support@givestream.org
                  </a>
                  .
                </p>
              </div>
            )}

            {einStatus === "pending" && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Claim under review
                </p>
                <p className="text-xs text-blue-600">
                  A claim for this organization is currently under review. You&apos;ll
                  be notified when it&apos;s approved.
                </p>
              </div>
            )}
          </>
        )}

        {step === 2 && foundNonprofit && (
          <>
            {/* Step indicator */}
            <p className="text-xs text-gray-400 font-medium mb-4">Step 2 of 2</p>

            {/* Back link */}
            <button
              onClick={() => {
                setStep(1);
                setEinStatus("idle");
                setFoundNonprofit(null);
              }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Confirm your organization
            </h1>
            <p className="text-sm text-gray-500 mb-5">
              Is this your organization? Fill in your contact details to submit the claim.
            </p>

            {/* Org preview card */}
            <div className="border border-brand-200 bg-brand-50 rounded-xl p-4 flex items-center gap-4 mb-6">
              {foundNonprofit.logoUrl && (
                <img
                  src={foundNonprofit.logoUrl}
                  alt={foundNonprofit.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{foundNonprofit.name}</p>
                <p className="text-sm text-gray-500">
                  {foundNonprofit.category.replace(/_/g, " ")}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-brand-500 ml-auto flex-shrink-0" />
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.org"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  We&apos;ll use this to notify you when your claim is approved.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-600">
                  I confirm I am an authorized representative of this organization.
                </span>
              </label>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !name || !email || !confirmed}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 px-4 text-sm transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit claim \u2192"
                )}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            {/* Success icon */}
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim submitted!</h1>
            <p className="text-sm text-gray-500 mb-8">
              We&apos;ll review your claim and send a confirmation to{" "}
              <span className="font-medium text-gray-700">{email}</span>. This usually
              takes 1&#x2013;2 business days.
            </p>

            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="w-full flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 px-4 text-sm transition-colors"
              >
                Sign in to GiveStream
              </Link>
              <Link
                href="/"
                className="block text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
