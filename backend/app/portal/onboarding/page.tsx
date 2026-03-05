"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const STEP_TITLES = ["Welcome", "Logo", "Profile", "Payouts"];

const CATEGORY_META = [
  { value: "EDUCATION", label: "Education", icon: "📚" },
  { value: "HEALTH", label: "Health", icon: "🏥" },
  { value: "ENVIRONMENT", label: "Environment", icon: "🌿" },
  { value: "ARTS", label: "Arts", icon: "🎨" },
  { value: "HUMAN_SERVICES", label: "Human Services", icon: "🤝" },
  { value: "ANIMALS", label: "Animals", icon: "🐾" },
  { value: "INTERNATIONAL", label: "International", icon: "🌍" },
  { value: "RELIGION", label: "Religion", icon: "⛪" },
  { value: "COMMUNITY", label: "Community", icon: "🏘️" },
  { value: "OTHER", label: "Other", icon: "•••" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryValue = (typeof CATEGORY_META)[number]["value"];

interface NonprofitRecord {
  id: string;
  name: string;
  logoUrl: string | null;
  role: string;
  verified: boolean;
  stripeConnectStatus: string;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  // Step 1 (Welcome) is outside the numbered flow — shown at 0% fill
  // Steps 2–4 fill the bar: step 2 = 33%, step 3 = 66%, step 4 = 100%
  const fillPercent = step === 1 ? 0 : ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {step === 1 ? "Getting started" : `Step ${step - 1} of ${TOTAL_STEPS - 1}`}
        </span>
        <span className="text-xs font-semibold text-brand-600">
          {STEP_TITLES[step - 1]}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Inline Error Banner ──────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
      <span>{message}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  // Step state: 1=Welcome, 2=Logo, 3=Profile, 4=Payouts
  const [step, setStep] = useState(1);

  // Data from /api/portal/me
  const [nonprofitId, setNonprofitId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  // Form fields
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreviewValid, setLogoPreviewValid] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryValue | "">("");
  const [website, setWebsite] = useState("");

  // Stripe tooltip
  const [stripeTooltip, setStripeTooltip] = useState(false);

  // Async state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // ── On mount: load org data ─────────────────────────────────────────────────
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/portal/me");
        if (!res.ok) return;
        const data: { nonprofits: NonprofitRecord[] } = await res.json();
        const first = data.nonprofits?.[0];
        if (first) {
          setNonprofitId(first.id);
          setOrgName(first.name ?? "");
          if (first.logoUrl) {
            setLogoUrl(first.logoUrl);
          }
        }
      } catch (err) {
        console.error("Failed to fetch portal/me:", err);
      } finally {
        setLoadingOrg(false);
      }
    }
    fetchMe();
  }, []);

  // ── Logo URL image validation ───────────────────────────────────────────────
  useEffect(() => {
    if (!logoUrl.trim()) {
      setLogoPreviewValid(false);
      return;
    }
    const img = new Image();
    img.onload = () => setLogoPreviewValid(true);
    img.onerror = () => setLogoPreviewValid(false);
    img.src = logoUrl;
  }, [logoUrl]);

  // ── PATCH helper ───────────────────────────────────────────────────────────
  async function patchProfile(payload: Record<string, unknown>): Promise<boolean> {
    if (!nonprofitId) return true; // no-op if no id yet
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/portal/nonprofits/${nonprofitId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg =
          (errorData as { error?: string }).error ?? "Failed to save. Please try again.";
        setSaveError(msg);
        return false;
      }
      return true;
    } catch {
      setSaveError("Network error. Please check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goBack() {
    setSaveError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleNext() {
    setSaveError(null);

    if (step === 2) {
      // Logo step: save if URL provided
      if (logoUrl.trim()) {
        const ok = await patchProfile({ logoUrl: logoUrl.trim() });
        if (!ok) return; // don't advance on hard failure — but show error and let user retry
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      // Profile step: description is required
      if (!description.trim()) {
        setSaveError("Please add a description before continuing.");
        return;
      }
      const ok = await patchProfile({
        description: description.trim(),
        category: category || undefined,
        website: website.trim() || null,
      });
      if (!ok) return;
      setStep(4);
      return;
    }

    if (step === 4) {
      router.push("/portal/dashboard");
      return;
    }

    setStep((s) => s + 1);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingOrg) {
    return (
      <div className="w-full max-w-2xl flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      {/* GiveStream wordmark */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Heart className="w-5 h-5 fill-brand-500 stroke-brand-500" />
        <span className="font-black text-xl text-brand-600">GiveStream</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg px-10 py-8">
        {/* Progress bar — shown on steps 2-4 */}
        {step > 1 && <ProgressBar step={step} />}

        {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center space-y-6 py-4">
            {/* Big brand icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-gray-900">
                Welcome to GiveStream
                {orgName ? "," : "!"}
              </h1>
              {orgName && (
                <p className="text-2xl font-black text-brand-600 leading-tight">
                  {orgName}
                </p>
              )}
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto pt-1">
                Your nonprofit has been approved. Let&apos;s take a few minutes to set up
                your profile so donors can find and trust you.
              </p>
            </div>

            <div className="bg-brand-50 rounded-2xl px-6 py-4 text-left space-y-3">
              {[
                { icon: "🖼️", text: "Add your logo so donors recognize you" },
                { icon: "📝", text: "Write a mission description that inspires giving" },
                { icon: "💳", text: "Connect your bank account for payouts" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="text-base">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-brand-600 text-white font-bold px-8 py-3 rounded-full hover:bg-brand-700 transition-colors text-sm mx-auto"
            >
              Let&apos;s go
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Logo ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Add your logo</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Paste a publicly accessible image URL. A square logo at least 200×200px
                works best.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Logo URL
              </label>
              <input
                type="url"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-400 transition"
                placeholder="https://yourorg.org/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />

              {/* Live preview */}
              {logoUrl.trim() && (
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
                  {logoPreviewValid ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-green-700">
                          Image loaded successfully
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          This is how your logo will appear to donors.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-red-600">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>
                        Could not load image. Make sure the URL is a direct link to a
                        public image file.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {saveError && <ErrorBanner message={saveError} />}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setLogoUrl("");
                  setSaveError(null);
                  setStep(3);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip — I&apos;ll add a logo later
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Profile ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Complete your profile</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Help donors understand your mission and decide to give.
              </p>
            </div>

            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mission description{" "}
                  <span className="text-red-400 text-xs">required</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-400 transition resize-none"
                  rows={4}
                  placeholder="Describe your organization's mission, the communities you serve, and the impact donors help create..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                />
                <p className="text-right text-xs text-gray-400 mt-0.5">
                  {description.length}/2000
                </p>
              </div>

              {/* Category pills */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_META.map(({ value, label, icon }) => {
                    const active = category === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(active ? "" : value)}
                        className={`px-3 py-2 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                          active
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-200 text-gray-600 hover:border-brand-300"
                        }`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Website{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-400 transition"
                  placeholder="https://yourorg.org"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            {saveError && <ErrorBanner message={saveError} />}
          </div>
        )}

        {/* ── Step 4: Payouts ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <div>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F0EFFE] flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-[#635BFF]" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-gray-900">Connect your bank</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                GiveStream uses Stripe Connect to securely transfer donations directly to
                your organization&apos;s bank account — no middlemen.
              </p>
            </div>

            {/* Benefits list */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-left space-y-3">
              {[
                "Instant payouts directly to your linked bank account",
                "Bank-level security — GiveStream never stores your banking details",
                "Automatic tax documents (1099-K) generated at year end",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Stripe button — disabled, "coming soon" */}
            <div
              className="relative inline-block"
              onMouseEnter={() => setStripeTooltip(true)}
              onMouseLeave={() => setStripeTooltip(false)}
              onFocus={() => setStripeTooltip(true)}
              onBlur={() => setStripeTooltip(false)}
            >
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-describedby="stripe-tooltip"
                className="inline-flex items-center justify-center gap-2 bg-[#635BFF] text-white font-bold px-8 py-3 rounded-full opacity-50 cursor-not-allowed text-sm select-none"
              >
                <CreditCard className="w-4 h-4" />
                Connect with Stripe
              </button>

              {stripeTooltip && (
                <div
                  id="stripe-tooltip"
                  role="tooltip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 bg-gray-900 text-white text-xs rounded-xl px-3.5 py-2.5 text-center shadow-xl z-10 pointer-events-none"
                >
                  Stripe Connect is coming soon. You can set this up from your
                  Payouts settings after launch.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => router.push("/portal/dashboard")}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now — set up payouts later
              </button>
            </div>
          </div>
        )}

        {/* ── Navigation footer ───────────────────────────────────────────── */}
        {step > 1 && (
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-1.5 bg-brand-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-brand-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : step === TOTAL_STEPS ? (
                "Go to Dashboard"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-5">
        You can update all of these details anytime from your portal settings.
      </p>
    </div>
  );
}
