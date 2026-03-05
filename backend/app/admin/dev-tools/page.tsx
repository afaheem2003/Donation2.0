"use client";

import { useState } from "react";
import { Wrench, RotateCcw, Zap, AlertTriangle, UserMinus, Building2 } from "lucide-react";

if (process.env.NODE_ENV === "production") {
  // Handled in the component body below — this guard is per the requirement.
}

type ActionResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  redirect?: string;
};

type CardConfig = {
  id: string;
  title: string;
  action: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  icon: React.ReactNode;
};

const CARDS: CardConfig[] = [
  {
    id: "make-nonprofit-admin",
    title: "Setup Nonprofit Admin",
    action: "make-nonprofit-admin",
    description:
      "Creates 'Test Nonprofit (Dev)' and makes you its OWNER. Seeds test donations and a campaign.",
    buttonLabel: "Run Setup",
    buttonClass:
      "bg-brand-500 hover:bg-brand-600 text-white",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "reset-onboarding",
    title: "Reset Onboarding",
    action: "reset-onboarding",
    description:
      "Clears the test nonprofit's description and logo so you can re-run the onboarding flow. Then navigate to the portal.",
    buttonLabel: "Reset Onboarding",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    icon: <RotateCcw className="w-5 h-5" />,
  },
  {
    id: "seed-donations",
    title: "Seed More Donations",
    action: "seed-donations",
    description: "Adds 10 more test donations to your nonprofit.",
    buttonLabel: "Seed Donations",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "reset",
    title: "Reset Role to Donor",
    action: "reset",
    description:
      "Resets your role back to DONOR. Useful to test the apply flow.",
    buttonLabel: "Reset Role",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
    icon: <UserMinus className="w-5 h-5" />,
  },
  {
    id: "simulate-claim",
    title: "Simulate Claim Flow",
    action: "simulate-claim",
    description: "Removes admins from 'Doctors Without Borders' making it claimable. Then go to /auth/claim and enter EIN: 13-3433452 to test the full claim flow.",
    buttonLabel: "Make Claimable",
    buttonClass: "bg-violet-600 hover:bg-violet-700 text-white",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: "reset-claim-state",
    title: "Full Claim Reset",
    action: "reset-claim-state",
    description: "Resets everything: removes claim applications, removes nonprofit admin, clears description, resets your role to DONOR. Use this to re-test the complete end-to-end flow.",
    buttonLabel: "Full Reset",
    buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
    icon: <RotateCcw className="w-5 h-5" />,
  },
];

export default function DevToolsPage() {
  if (process.env.NODE_ENV === "production") {
    return <div className="text-red-500">Not available in production.</div>;
  }

  return <DevToolsContent />;
}

function DevToolsContent() {
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function runAction(action: string, cardId: string) {
    setLoading((prev) => ({ ...prev, [cardId]: true }));
    setResults((prev) => ({ ...prev, [cardId]: {} }));

    try {
      const res = await fetch("/api/dev/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data: ActionResult = await res.json();
      setResults((prev) => ({ ...prev, [cardId]: data }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [cardId]: { error: "Network error — check console." },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [cardId]: false }));
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dev Tools</h1>
        <p className="text-sm text-gray-500 mt-1">
          Only visible and functional in development mode.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
        <p className="text-sm font-medium text-yellow-800">
          Dev Tools — not available in production
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CARDS.map((card) => {
          const result = results[card.id];
          const isLoading = loading[card.id] ?? false;

          return (
            <div
              key={card.id}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-3"
            >
              {/* Card header */}
              <div className="flex items-center gap-2">
                <div className="text-gray-400">{card.icon}</div>
                <h2 className="font-semibold text-gray-900">{card.title}</h2>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500">{card.description}</p>

              {/* Button */}
              <button
                onClick={() => runAction(card.action, card.id)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${card.buttonClass}`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Running…
                  </>
                ) : (
                  card.buttonLabel
                )}
              </button>

              {/* Result feedback */}
              {result && (result.ok !== undefined || result.error) && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    result.ok
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <p>{result.ok ? result.message : result.error}</p>
                  {result.ok && result.redirect && (
                    <a
                      href={result.redirect}
                      className="mt-1 inline-block font-medium underline"
                    >
                      Go {result.redirect} &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
