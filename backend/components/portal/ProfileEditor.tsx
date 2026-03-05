"use client";

import { useState, useEffect, useRef } from "react";
import {
  Save, Check, X, Loader2,
  BookOpen, Stethoscope, Leaf, Palette,
  Users, PawPrint, Globe, Church, Home, MoreHorizontal,
  ImageIcon, Link2, Building2,
} from "lucide-react";

// ─── Category data ─────────────────────────────────────────────────────────────

const CATEGORY_META = [
  { value: "EDUCATION",      label: "Education",      Icon: BookOpen },
  { value: "HEALTH",         label: "Health",          Icon: Stethoscope },
  { value: "ENVIRONMENT",    label: "Environment",     Icon: Leaf },
  { value: "ARTS",           label: "Arts",            Icon: Palette },
  { value: "HUMAN_SERVICES", label: "Human Services",  Icon: Users },
  { value: "ANIMALS",        label: "Animals",         Icon: PawPrint },
  { value: "INTERNATIONAL",  label: "International",   Icon: Globe },
  { value: "RELIGION",       label: "Religion",        Icon: Church },
  { value: "COMMUNITY",      label: "Community",       Icon: Home },
  { value: "OTHER",          label: "Other",           Icon: MoreHorizontal },
] as const;

type Category = (typeof CATEGORY_META)[number]["value"];

// ─── Shared sub-components ────────────────────────────────────────────────────

function FloatingInput({
  id, label, required, value, hasError, touched, isValid, className = "", ...inputProps
}: {
  id: string; label: string; required?: boolean; value: string;
  hasError?: boolean; touched?: boolean; isValid?: boolean; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value">) {
  const filled = value.length > 0;
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        placeholder=" "
        value={value}
        {...inputProps}
        className={[
          "peer w-full rounded-xl border bg-white px-4 pt-5 pb-2 text-sm text-gray-900 pr-10",
          "outline-none transition-all duration-200",
          "focus:ring-2 focus:ring-offset-0",
          hasError && touched
            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
            : isValid && touched
            ? "border-green-400 focus:border-green-500 focus:ring-green-100"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-100",
        ].join(" ")}
      />
      <label
        htmlFor={id}
        className={[
          "pointer-events-none absolute left-4 top-3.5 origin-left text-sm transition-all duration-200",
          "peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-brand-600",
          filled
            ? "-translate-y-2.5 scale-75 text-gray-500"
            : "text-gray-400 peer-not-placeholder-shown:-translate-y-2.5 peer-not-placeholder-shown:scale-75 peer-not-placeholder-shown:text-gray-500",
        ].join(" ")}
      >
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {touched && value && (
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isValid ? "text-green-500" : "text-red-400"}`}>
          {isValid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </div>
      )}
    </div>
  );
}

function FloatingTextarea({
  id, label, required, value, rows = 5, maxLength, onChange,
}: {
  id: string; label: string; required?: boolean; value: string;
  rows?: number; maxLength?: number;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder=" "
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={onChange}
        className="peer w-full rounded-xl border border-gray-200 bg-white px-4 pt-7 pb-3 text-sm text-gray-900
          outline-none transition-all duration-200 resize-y focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:ring-offset-0"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-3.5 origin-left text-sm text-gray-400 transition-all duration-200
          peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-brand-600
          peer-not-placeholder-shown:-translate-y-2 peer-not-placeholder-shown:scale-75 peer-not-placeholder-shown:text-gray-500"
      >
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {maxLength && (
        <span className={`absolute right-3 bottom-2.5 text-xs transition-colors ${
          value.length > maxLength * 0.9 ? "text-orange-400" : "text-gray-300"
        }`}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

function CategoryPillGrid({
  value, onChange,
}: {
  value: string; onChange: (val: string) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Category</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CATEGORY_META.map(({ value: val, label, Icon }) => {
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium",
                "transition-all duration-150 text-left",
                active
                  ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50",
              ].join(" ")}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
              <span className="leading-tight">{label}</span>
              {active && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImageDropZone({
  id, value, onChange, label, aspect = "square",
}: {
  id: string; value: string; onChange: (v: string) => void;
  label: string; aspect?: "video" | "square";
}) {
  const [previewValid, setPreviewValid] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value) { setPreviewValid(false); return; }
    timerRef.current = setTimeout(() => {
      try { new URL(value); setPreviewValid(true); }
      catch { setPreviewValid(false); }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  return (
    <div>
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</span>
      <div className={[
        "relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-300",
        aspect === "square" ? "w-32 h-32" : "aspect-video",
        value ? "border-brand-300 bg-brand-50/20" : "border-gray-200 bg-gray-50 hover:border-gray-300",
      ].join(" ")}>
        {previewValid && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain bg-white"
            onError={() => setPreviewValid(false)}
          />
        )}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 transition-all duration-200 ${previewValid ? "bg-black/30" : ""}`}>
          {!previewValid && (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs font-medium text-center leading-tight">Paste URL</span>
            </div>
          )}
          <div className={`w-full relative ${previewValid ? "mt-auto" : ""}`}>
            <Link2 className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 ${previewValid ? "text-white/70" : "text-gray-400"}`} />
            <input
              id={id}
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              maxLength={1000}
              className={[
                "w-full pl-6 pr-2 py-1.5 rounded-lg text-xs outline-none transition-all duration-200",
                previewValid
                  ? "bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60"
                  : "bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-brand-400",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
      {previewValid && (
        <p className="mt-1.5 text-xs text-brand-600 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Logo loaded
        </p>
      )}
    </div>
  );
}

function FormSection({
  title, description, icon: Icon, children,
}: {
  title: string; description?: string; icon?: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-start gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-brand-600" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

type SubmitState = "idle" | "loading" | "success" | "error";

function SaveButton({ state, disabled }: { state: SubmitState; disabled?: boolean }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold text-sm px-6 py-2.5 rounded-full transition-all duration-200 disabled:cursor-not-allowed";

  if (state === "success") {
    return (
      <button type="button" disabled className={`${base} bg-green-500 text-white`}>
        <Check className="w-4 h-4" /> Saved!
      </button>
    );
  }
  if (state === "error") {
    return (
      <button type="button" disabled className={`${base} bg-red-500 text-white animate-shake`}>
        <X className="w-4 h-4" /> Failed — try again
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={disabled || state === "loading"}
      className={`${base} bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60`}
    >
      {state === "loading"
        ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
        : <><Save className="w-4 h-4" />Save Profile</>
      }
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NonprofitData {
  id: string;
  name: string;
  description: string;
  website: string | null;
  category: Category;
  logoUrl: string | null;
  verified: boolean;
}

interface ProfileEditorProps {
  nonprofit: NonprofitData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileEditor({ nonprofit }: ProfileEditorProps) {
  const [nonprofitId, setNonprofitId] = useState<string>(nonprofit.id);

  const [form, setForm] = useState({
    name: nonprofit.name,
    description: nonprofit.description,
    website: nonprofit.website ?? "",
    category: nonprofit.category as string,
    logoUrl: nonprofit.logoUrl ?? "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!nonprofitId) {
      fetch("/api/portal/me")
        .then((r) => r.json())
        .then((data) => {
          const first = data.nonprofits?.[0];
          if (first?.id) setNonprofitId(first.id);
        })
        .catch(() => null);
    }
  }, [nonprofitId]);

  function markTouched(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  function setField(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrorMsg(null);
  }

  function isWebsiteValid(url: string) {
    if (!url) return true;
    try { new URL(url.startsWith("http") ? url : "https://" + url); return true; }
    catch { return false; }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nonprofitId) return;

    setSubmitState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/portal/nonprofits/${nonprofitId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          website: form.website.trim() || null,
          logoUrl: form.logoUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "Failed to save profile.");
        setSubmitState("error");
        setTimeout(() => setSubmitState("idle"), 1000);
        return;
      }

      setSubmitState("success");
      setTimeout(() => setSubmitState("idle"), 2500);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitState("error");
      setTimeout(() => setSubmitState("idle"), 1000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Organization Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your public-facing nonprofit information.</p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />{errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Identity */}
        <FormSection title="Identity" description="How donors and supporters see your organization." icon={Building2}>
          <FloatingInput
            id="name"
            label="Organization Name"
            required
            type="text"
            value={form.name}
            touched={touched.name}
            isValid={form.name.trim().length > 1}
            hasError={touched.name && !form.name.trim()}
            maxLength={200}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => markTouched("name")}
          />
          <FloatingTextarea
            id="description"
            label="Mission Description"
            required
            value={form.description}
            rows={5}
            maxLength={5000}
            onChange={(e) => setField("description", e.target.value)}
          />
        </FormSection>

        {/* Category */}
        <FormSection title="Classification" description="Helps donors find you by cause area." icon={BookOpen}>
          <CategoryPillGrid
            value={form.category}
            onChange={(val) => setField("category", val)}
          />
        </FormSection>

        {/* Online presence */}
        <FormSection title="Online Presence" description="Your website and logo mark." icon={Globe}>
          <FloatingInput
            id="website"
            label="Website URL"
            type="url"
            value={form.website}
            touched={touched.website}
            isValid={!!form.website && isWebsiteValid(form.website)}
            hasError={touched.website && !!form.website && !isWebsiteValid(form.website)}
            maxLength={500}
            placeholder=" "
            onChange={(e) => setField("website", e.target.value)}
            onBlur={() => markTouched("website")}
          />
          <ImageDropZone
            id="logoUrl"
            label="Logo"
            value={form.logoUrl}
            onChange={(val) => setField("logoUrl", val)}
            aspect="square"
          />
        </FormSection>

        <div className="flex justify-end pb-4">
          <SaveButton state={submitState} disabled={!nonprofitId} />
        </div>
      </form>
    </div>
  );
}
