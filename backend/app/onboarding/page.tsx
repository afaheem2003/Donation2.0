"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Check, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { key: "EDUCATION",      emoji: "🎓", label: "Education" },
  { key: "ENVIRONMENT",    emoji: "🌱", label: "Planet" },
  { key: "HEALTH",         emoji: "❤️", label: "Health" },
  { key: "ANIMALS",        emoji: "🐾", label: "Animals" },
  { key: "ARTS",           emoji: "🎨", label: "Arts" },
  { key: "HUMAN_SERVICES", emoji: "🤝", label: "Community" },
  { key: "INTERNATIONAL",  emoji: "🌍", label: "Global" },
  { key: "RELIGION",       emoji: "✝️", label: "Faith" },
] as const;

const GIVING_OPTIONS = [
  {
    key: "one_time",
    emoji: "🎯",
    title: "When inspired",
    subtitle: "One donation at a time, when something moves me",
  },
  {
    key: "monthly",
    emoji: "📅",
    title: "Regular supporter",
    subtitle: "I set a monthly or yearly giving goal",
  },
  {
    key: "whenever",
    emoji: "💛",
    title: "Whenever I can",
    subtitle: "No pressure, just when it feels right",
  },
] as const;

const SCHOOL_SUGGESTIONS = [
  "Cornell University",
  "Harvard University",
  "MIT",
  "NYU",
  "Columbia University",
  "Stanford University",
  "Yale University",
  "Princeton University",
];

type Step = 1 | 2 | 3;

async function patchOnboarding(data: Record<string, unknown>) {
  const res = await fetch("/api/users/me/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
}

export default function WebOnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [school, setSchool] = useState("");
  const [givingFrequency, setGivingFrequency] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(key: string) {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const visibleSuggestions = school.trim().length > 0
    ? SCHOOL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(school.toLowerCase()))
    : SCHOOL_SUGGESTIONS;

  async function handleStep1Continue() {
    if (interests.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await patchOnboarding({ interests });
      setStep(2);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStep2Continue() {
    setSaving(true);
    setError(null);
    try {
      if (school.trim()) await patchOnboarding({ school: school.trim() });
      setStep(3);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish(skip = false) {
    setSaving(true);
    setError(null);
    try {
      await patchOnboarding({
        ...(skip ? {} : givingFrequency ? { givingFrequency } : {}),
        complete: true,
      });
      router.push("/");
    } catch {
      setError("Could not complete setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="w-6 h-6 fill-teal-500 text-teal-500" />
          <span className="text-lg font-extrabold text-teal-600">GiveStream</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s < step
                    ? "bg-teal-500 text-white"
                    : s === step
                    ? "bg-teal-500 text-white ring-4 ring-teal-100"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${s < step ? "bg-teal-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Step 1: Interests */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                What causes move you?
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                Pick at least one. We'll find nonprofits you'll love.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {CATEGORIES.map((cat) => {
                  const isSelected = interests.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      onClick={() => toggleInterest(cat.key)}
                      className={`relative flex flex-col items-center gap-2 py-5 px-3 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="text-2xl">{cat.emoji}</span>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-teal-700" : "text-gray-700"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleStep1Continue}
                disabled={interests.length === 0 || saving}
                className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold transition-colors"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
            </div>
          )}

          {/* Step 2: School / Community */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                Where are you based?
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                We'll surface nearby nonprofits and your school's causes.
              </p>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Your university or school (optional)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 mb-4"
              />
              {visibleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSchool(s)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        school === s
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={handleStep2Continue}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white font-bold transition-colors mb-3"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {/* Step 3: Giving style */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                How do you like to give?
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                We'll tailor your experience around your rhythm.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {GIVING_OPTIONS.map((opt) => {
                  const isSelected = givingFrequency === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setGivingFrequency(isSelected ? null : opt.key)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <div
                          className={`font-bold text-sm ${
                            isSelected ? "text-teal-700" : "text-gray-900"
                          }`}
                        >
                          {opt.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.subtitle}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-teal-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleFinish(false)}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white font-bold transition-colors mb-3"
              >
                {saving ? "Setting up your feed..." : "Finish setup"}
              </button>
              <button
                onClick={() => handleFinish(true)}
                disabled={saving}
                className="w-full py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          )}
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Step {step} of 3
        </p>
      </div>
    </div>
  );
}
