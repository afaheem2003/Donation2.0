"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Target, Calendar, Check, X, Loader2,
  ImageIcon, Link2, FileText, DollarSign,
} from "lucide-react";
import type { CampaignStatus } from "@prisma/client";

// ─── Shared sub-components ────────────────────────────────────────────────────

function FloatingInput({
  id, label, required, value, hasError, className = "", ...inputProps
}: {
  id: string; label: string; required?: boolean;
  value: string; hasError?: boolean; className?: string;
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
          "peer w-full rounded-xl border bg-white px-4 pt-5 pb-2 text-sm text-gray-900",
          "outline-none transition-all duration-200",
          "focus:ring-2 focus:ring-offset-0",
          hasError
            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-100",
          inputProps.type === "date" ? "text-gray-700" : "",
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
    </div>
  );
}

function FloatingTextarea({
  id, label, required, value, hasError, rows = 6, maxLength, onChange,
}: {
  id: string; label: string; required?: boolean; value: string;
  hasError?: boolean; rows?: number; maxLength?: number;
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
        className={[
          "peer w-full rounded-xl border bg-white px-4 pt-7 pb-2 text-sm text-gray-900",
          "outline-none transition-all duration-200 resize-y",
          "focus:ring-2 focus:ring-offset-0",
          hasError
            ? "border-red-400 focus:border-red-400 focus:ring-red-100"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-100",
        ].join(" ")}
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
        <span className={`absolute right-3 bottom-2 text-xs transition-colors ${
          value.length > maxLength * 0.9 ? "text-orange-400" : "text-gray-300"
        }`}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

function FormSection({
  title, description, icon: Icon, children,
}: {
  title: string; description?: string;
  icon?: React.ElementType; children: React.ReactNode;
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

function ImageDropZone({
  id, value, onChange, label, aspect = "video",
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
        aspect === "video" ? "aspect-video" : "aspect-square max-w-[160px]",
        value ? "border-brand-300 bg-brand-50/20" : "border-gray-200 bg-gray-50 hover:border-gray-300",
      ].join(" ")}>
        {previewValid && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setPreviewValid(false)}
          />
        )}
        <div className={[
          "absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 transition-all duration-200",
          previewValid ? "bg-black/40" : "",
        ].join(" ")}>
          {!previewValid && (
            <div className="flex flex-col items-center gap-1.5 text-gray-400">
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs font-medium">Paste an image URL</span>
            </div>
          )}
          <div className={`w-full max-w-sm relative ${previewValid ? "mt-auto" : ""}`}>
            <Link2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${previewValid ? "text-white/70" : "text-gray-400"}`} />
            <input
              id={id}
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              maxLength={2000}
              className={[
                "w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none transition-all duration-200",
                previewValid
                  ? "bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:bg-white/30"
                  : "bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
              ].join(" ")}
            />
          </div>
        </div>
      </div>
      {previewValid && (
        <p className="mt-1.5 text-xs text-brand-600 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Image loaded
        </p>
      )}
    </div>
  );
}

type SubmitState = "idle" | "loading" | "success" | "error";

function SubmitButton({
  state, idleLabel, loadingLabel, successLabel = "Saved!",
  onClick, disabled, className = "",
}: {
  state: SubmitState; idleLabel: string; loadingLabel: string;
  successLabel?: string; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold text-sm px-6 py-2.5 rounded-full transition-all duration-200 disabled:cursor-not-allowed";

  if (state === "success") {
    return (
      <button type="button" disabled className={`${base} bg-green-500 text-white ${className}`}>
        <Check className="w-4 h-4" />{successLabel}
      </button>
    );
  }
  if (state === "error") {
    return (
      <button type="button" disabled className={`${base} bg-red-500 text-white animate-shake ${className}`}>
        <X className="w-4 h-4" />Failed — try again
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "loading"}
      className={`${base} bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 ${className}`}
    >
      {state === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
      {state === "loading" ? loadingLabel : idleLabel}
    </button>
  );
}

// ─── Campaign form ─────────────────────────────────────────────────────────────

interface CampaignFormProps {
  nonprofitId: string;
  mode: "create" | "edit";
  campaignId?: string;
  initialData?: {
    title: string;
    description: string;
    goalCents: number | null;
    coverImageUrl: string | null;
    startsAt: string | null;
    endsAt: string | null;
    status: CampaignStatus;
  };
}

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

const GOAL_PRESETS = [1000, 5000, 10000, 25000, 50000];
function fmtPreset(d: number) { return d >= 1000 ? `$${d / 1000}K` : `$${d}`; }

const EDIT_STATUS_OPTIONS: { value: CampaignStatus; label: string; dot: string }[] = [
  { value: "DRAFT",  label: "Draft",  dot: "bg-gray-400" },
  { value: "ACTIVE", label: "Active", dot: "bg-green-500" },
  { value: "PAUSED", label: "Paused", dot: "bg-orange-400" },
];

export function CampaignForm({ nonprofitId, mode, campaignId, initialData }: CampaignFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [goalDollars, setGoalDollars] = useState(
    initialData?.goalCents ? String(initialData.goalCents / 100) : ""
  );
  const [goalPreset, setGoalPreset] = useState<number | null>(
    initialData?.goalCents ? initialData.goalCents / 100 : null
  );
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl ?? "");
  const [startsAt, setStartsAt] = useState(toDateInputValue(initialData?.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInputValue(initialData?.endsAt));
  const [status, setStatus] = useState<CampaignStatus>(initialData?.status ?? "DRAFT");

  const [error, setError] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<SubmitState>("idle");
  const [publishState, setPublishState] = useState<SubmitState>("idle");

  async function handleSubmit(publishStatus: "DRAFT" | "ACTIVE") {
    setError(null);

    if (!title || title.trim().length < 3) { setError("Title must be at least 3 characters."); return; }
    if (!description || description.trim().length < 10) { setError("Description must be at least 10 characters."); return; }

    const goalCents = goalDollars ? Math.round(parseFloat(goalDollars) * 100) : null;
    if (goalDollars && (isNaN(goalCents!) || goalCents! < 100)) { setError("Goal must be at least $1.00."); return; }
    if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) { setError("End date must be after start date."); return; }
    if (endsAt && new Date(endsAt) <= new Date()) { setError("End date must be in the future."); return; }

    const setState = publishStatus === "DRAFT" ? setDraftState : setPublishState;
    setState("loading");

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      goalCents: goalCents ?? null,
      coverImageUrl: coverImageUrl.trim() || null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      status: mode === "create" ? (publishStatus === "ACTIVE" ? "ACTIVE" : "DRAFT") : status,
    };

    try {
      const url = mode === "create"
        ? `/api/portal/nonprofits/${nonprofitId}/campaigns`
        : `/api/portal/nonprofits/${nonprofitId}/campaigns/${campaignId}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState("error");
        setTimeout(() => setState("idle"), 1000);
        setError(data?.error ?? "Something went wrong.");
        return;
      }

      const result = await res.json();
      setState("success");
      setTimeout(() => router.push(`/portal/campaigns/${mode === "create" ? result.id : campaignId}`), 800);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1000);
      setError("Network error. Please try again.");
    }
  }

  const submitting = draftState === "loading" || publishState === "loading";

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Basics */}
      <FormSection title="Campaign Basics" description="The headline information donors will see first." icon={FileText}>
        <FloatingInput
          id="title"
          label="Campaign Title"
          required
          value={title}
          hasError={!!error && !title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FloatingTextarea
          id="description"
          label="Description — tell donors what this funds and why it matters"
          required
          value={description}
          hasError={!!error && description.trim().length < 10}
          rows={6}
          maxLength={10000}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-400 -mt-2">Markdown formatting is supported.</p>
      </FormSection>

      {/* Goal */}
      <FormSection title="Funding Goal" description="Set a target or leave open-ended." icon={DollarSign}>
        <div className="grid grid-cols-5 gap-2">
          {GOAL_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setGoalPreset(d); setGoalDollars(String(d)); }}
              className={[
                "py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150",
                goalPreset === d
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-gray-200 text-gray-500 hover:border-brand-300 hover:bg-gray-50",
              ].join(" ")}
            >
              {fmtPreset(d)}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">$</span>
          <input
            type="number"
            value={goalDollars}
            onChange={(e) => { setGoalDollars(e.target.value); setGoalPreset(null); }}
            placeholder="Custom goal amount"
            min="1"
            step="1"
            className={[
              "w-full pl-8 pr-4 py-2.5 rounded-xl border-2 text-sm text-gray-900",
              "outline-none transition-all duration-150",
              goalPreset === null && goalDollars
                ? "border-brand-500 focus:ring-2 focus:ring-brand-100"
                : "border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
            ].join(" ")}
          />
        </div>
        <p className="text-xs text-gray-400 -mt-2">Leave blank for an open-ended campaign.</p>
      </FormSection>

      {/* Cover image */}
      <FormSection title="Cover Image" description="A compelling visual helps donors connect emotionally." icon={ImageIcon}>
        <ImageDropZone
          id="coverImageUrl"
          label="Cover image URL (optional)"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          aspect="video"
        />
      </FormSection>

      {/* Schedule */}
      <FormSection title="Schedule" description="Optional start and end dates for your campaign." icon={Calendar}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Start Date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              End Date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              value={endsAt}
              min={startsAt || undefined}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
        </div>
      </FormSection>

      {/* Status (edit only) */}
      {mode === "edit" && (
        <FormSection title="Campaign Status" icon={Target}>
          <div className="flex gap-2">
            {EDIT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={[
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all duration-150",
                  status === opt.value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300",
                ].join(" ")}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </FormSection>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pb-4">
        {mode === "create" ? (
          <>
            <SubmitButton
              state={draftState}
              idleLabel="Save as Draft"
              loadingLabel="Saving…"
              successLabel="Saved!"
              onClick={() => handleSubmit("DRAFT")}
              disabled={submitting}
              className="flex-1 !bg-white !text-gray-700 border border-gray-200 hover:!bg-gray-50 hover:!text-gray-900"
            />
            <SubmitButton
              state={publishState}
              idleLabel="Publish Campaign"
              loadingLabel="Publishing…"
              successLabel="Published!"
              onClick={() => handleSubmit("ACTIVE")}
              disabled={submitting}
              className="flex-1"
            />
          </>
        ) : (
          <SubmitButton
            state={publishState}
            idleLabel="Save Changes"
            loadingLabel="Saving…"
            onClick={() => handleSubmit("ACTIVE")}
            disabled={submitting}
          />
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
