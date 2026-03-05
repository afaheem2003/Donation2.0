"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Heart, Shield, Users, DollarSign, RotateCcw, ExternalLink } from "lucide-react";

interface Action {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  redirect: string;
}

const ACTIONS: Action[] = [
  {
    id: "make-nonprofit-admin",
    icon: <Heart className="w-5 h-5 text-brand-600" />,
    title: "Nonprofit Admin (Portal)",
    description:
      'Creates a "Test Nonprofit (Dev)" org, assigns you as OWNER, and seeds test donations + a campaign. Visit the portal after.',
    buttonLabel: "Become Nonprofit Owner",
    buttonClass: "bg-brand-600 hover:bg-brand-700 text-white",
    redirect: "/portal/dashboard",
  },
  {
    id: "make-platform-admin",
    icon: <Shield className="w-5 h-5 text-purple-600" />,
    title: "Platform Admin (Admin Panel)",
    description:
      "Sets your role to PLATFORM_ADMIN so you can review nonprofit applications at /admin/applications.",
    buttonLabel: "Become Platform Admin",
    buttonClass: "bg-purple-600 hover:bg-purple-700 text-white",
    redirect: "/admin/applications",
  },
  {
    id: "seed-donations",
    icon: <DollarSign className="w-5 h-5 text-green-600" />,
    title: "Seed More Donations",
    description:
      "Adds 10 more test donations across the last 35 days to your test nonprofit. Run 'Nonprofit Admin' first.",
    buttonLabel: "Seed Donations",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
    redirect: "/portal/donations",
  },
  {
    id: "reset",
    icon: <RotateCcw className="w-5 h-5 text-gray-500" />,
    title: "Reset to Donor",
    description:
      "Resets your role back to DONOR. The test nonprofit and admin record remain in the DB but you won't have portal access.",
    buttonLabel: "Reset Role",
    buttonClass: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    redirect: "/",
  },
];

export default function DevSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  // Guard: block in production via a simple check
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Not available in production.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Sign in first to use the dev setup.</p>
        <button
          onClick={() => signIn("google")}
          className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  async function runAction(action: Action) {
    setLoading(action.id);
    setResults((r) => ({ ...r, [action.id]: undefined as unknown as { ok: boolean; message: string } }));

    try {
      const res = await fetch("/api/dev/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action.id }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [action.id]: { ok: res.ok, message: data.message ?? data.error ?? "Done" } }));
      if (res.ok && action.redirect) {
        setTimeout(() => router.push(action.redirect), 1000);
      }
    } catch {
      setResults((r) => ({ ...r, [action.id]: { ok: false, message: "Network error" } }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm font-bold text-amber-800 mb-0.5">⚠️ Development Only</p>
          <p className="text-xs text-amber-700">
            This page is only accessible in <code className="font-mono bg-amber-100 px-1 rounded">NODE_ENV=development</code>. It does not exist in production.
          </p>
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900">Dev Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Signed in as <strong>{session.user?.email}</strong>. Use the actions below to configure your account for testing.
          </p>
        </div>

        {/* Current session info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
              <p className="text-xs text-gray-500">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Action cards */}
        {ACTIONS.map((action) => {
          const result = results[action.id];
          const isLoading = loading === action.id;

          return (
            <div key={action.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{action.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{action.description}</p>

                  {result && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs font-medium mb-3 ${
                        result.ok
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {result.ok ? "✓ " : "✗ "}
                      {result.message}
                      {result.ok && <span className="ml-1 text-gray-400">Redirecting…</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runAction(action)}
                      disabled={isLoading || loading !== null}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.buttonClass}`}
                    >
                      {isLoading ? "Running…" : action.buttonLabel}
                    </button>

                    {result?.ok && (
                      <button
                        onClick={() => router.push(action.redirect)}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        Go now
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/portal/dashboard", label: "Portal Dashboard" },
              { href: "/portal/campaigns", label: "Campaigns" },
              { href: "/portal/donations", label: "Donations" },
              { href: "/portal/analytics", label: "Analytics" },
              { href: "/portal/payouts", label: "Payouts" },
              { href: "/portal/team", label: "Team" },
              { href: "/admin/applications", label: "Admin: Applications" },
              { href: "/discover", label: "Discover (donor view)" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
