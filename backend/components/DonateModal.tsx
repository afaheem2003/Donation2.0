"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { X, Heart, Loader2 } from "lucide-react";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

interface DonateModalProps {
  nonprofitId: string;
  nonprofitName: string;
  onClose: () => void;
}

export function DonateModal({ nonprofitId, nonprofitName, onClose }: DonateModalProps) {
  const { data: session } = useSession();
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalAmount = custom ? parseFloat(custom) : amount;
  const amountCents = Math.round(finalAmount * 100);

  async function handleDonate() {
    if (!session) {
      signIn("google");
      return;
    }

    if (amountCents < 100) {
      setError("Minimum donation is $1.00");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonprofitId, amountCents }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");

      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Donating to</p>
            <h2 className="font-bold text-gray-900">{nonprofitName}</h2>
          </div>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => { setAmount(a); setCustom(""); }}
              className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                amount === a && !custom
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
            className="w-full pl-7 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-400 focus:outline-none text-gray-900"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleDonate}
          disabled={loading || amountCents < 100}
          className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Heart className="w-4 h-4 fill-white stroke-white" />
              {session
                ? `Donate $${(amountCents / 100).toFixed(2)}`
                : "Sign in to donate"}
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Secure payment via Stripe · Tax-deductible receipt emailed
        </p>
      </div>
    </div>
  );
}
