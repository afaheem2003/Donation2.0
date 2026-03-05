"use client";

import { useState, ChangeEvent, FocusEvent } from "react";
import Link from "next/link";
import {
  Heart, CheckCircle2, ChevronRight, ChevronLeft, Check, X, Loader2,
  BookOpen, Stethoscope, Leaf, Palette, Users, PawPrint,
  Globe, Church, Home, MoreHorizontal, Building2, Mail, User,
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

// ─── Shared sub-components ────────────────────────────────────────────────────

function FloatingInput({
  id, label, required, value, hasError, touched, isValid, icon: Icon, ...inputProps
}: {
  id: string; label: string; required?: boolean; value: string;
  hasError?: boolean; touched?: boolean; isValid?: boolean;
  icon?: React.ElementType;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value">) {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <input
        id={id}
        placeholder=" "
        value={value}
        {...inputProps}
        className={[
          "peer w-full rounded-xl border bg-white text-sm text-gray-900",
          "pt-5 pb-2 pr-10 outline-none transition-all duration-200",
          "focus:ring-2 focus:ring-offset-0",
          Icon ? "pl-9" : "pl-4",
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
          "pointer-events-none absolute top-3.5 origin-left text-sm transition-all duration-200",
          "peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-brand-600",
          Icon ? "left-9" : "left-4",
          value.length > 0
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
  id, label, required, value, rows = 5, maxLength, hasError, touched, onChange,
}: {
  id: string; label: string; required?: boolean; value: string;
  rows?: number; maxLength?: number; hasError?: boolean; touched?: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
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
          "peer w-full rounded-xl border bg-white px-4 pt-7 pb-3 text-sm text-gray-900",
          "outline-none transition-all duration-200 resize-none",
          "focus:ring-2 focus:ring-offset-0",
          hasError && touched
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
  value, onChange, hasError,
}: {
  value: string; onChange: (val: string) => void; hasError?: boolean;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Category <span className="text-red-400">*</span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORY_META.map(({ value: val, label, Icon }) => {
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left",
                active
                  ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                  : hasError
                  ? "border-red-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50"
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
      {hasError && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Please select a category
        </p>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepProgressBar({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-8">
      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-brand-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < current;
          const active = stepNum === current;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5" style={{ width: `${100 / total}%` }}>
              <div className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                done ? "bg-brand-500 text-white" : active ? "bg-brand-500 text-white ring-4 ring-brand-100" : "bg-gray-200 text-gray-400",
              ].join(" ")}>
                {done ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span className={`text-xs font-medium text-center leading-tight transition-colors duration-200 ${
                active ? "text-brand-600" : done ? "text-gray-500" : "text-gray-300"
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <X className="w-3.5 h-3.5" />{msg}
    </p>
  );
}

// ─── Form logic ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Organization", "Description", "Contact"];

type FormData = {
  orgName: string;
  ein: string;
  category: string;
  website: string;
  description: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  contactEmail: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_FORM: FormData = {
  orgName: "", ein: "", category: "", website: "", description: "",
  addressLine1: "", city: "", state: "", zip: "", contactName: "", contactEmail: "",
};

function formatEIN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "-" + digits.slice(2);
}

function validateEIN(ein: string): boolean { return /^\d{2}-\d{7}$/.test(ein); }
function validateEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validateURL(url: string): boolean {
  if (!url) return true;
  try { new URL(url.startsWith("http") ? url : "https://" + url); return true; }
  catch { return false; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplyFormPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function markTouched(field: keyof FormData) {
    setTouched((p) => ({ ...p, [field]: true }));
  }

  function handleEINChange(e: ChangeEvent<HTMLInputElement>) {
    setField("ein", formatEIN(e.target.value));
  }

  function handleEINBlur(_e: FocusEvent<HTMLInputElement>) {
    markTouched("ein");
    if (form.ein && !validateEIN(form.ein)) {
      setErrors((p) => ({ ...p, ein: "EIN must be in format XX-XXXXXXX" }));
    }
  }

  function validateStep1(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.orgName.trim()) errs.orgName = "Organization name is required";
    if (!form.ein.trim()) errs.ein = "EIN is required";
    else if (!validateEIN(form.ein)) errs.ein = "EIN must be in format XX-XXXXXXX";
    if (!form.category) errs.category = "Please select a category";
    if (form.website && !validateURL(form.website)) errs.website = "Please enter a valid URL";
    return errs;
  }

  function validateStep2(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.description.trim()) errs.description = "Description is required";
    else if (form.description.trim().length < 20) errs.description = "Description must be at least 20 characters";
    else if (form.description.length > 2000) errs.description = "Description must be 2000 characters or fewer";
    return errs;
  }

  function validateStep3(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.contactName.trim()) errs.contactName = "Your name is required";
    if (!form.contactEmail.trim()) errs.contactEmail = "Your email is required";
    else if (!validateEmail(form.contactEmail)) errs.contactEmail = "Please enter a valid email";
    return errs;
  }

  function handleNext() {
    const errs = step === 1 ? validateStep1() : step === 2 ? validateStep2() : {};
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((p) => (p + 1) as 1 | 2 | 3 | 4);
  }

  function handleBack() {
    setErrors({});
    setStep((p) => (p - 1) as 1 | 2 | 3 | 4);
  }

  async function handleSubmit() {
    const errs = validateStep3();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError("");
    setSubmitting(true);
    try {
      const rawWebsite = form.website.trim();
      const website = rawWebsite
        ? rawWebsite.startsWith("http") ? rawWebsite : "https://" + rawWebsite
        : undefined;
      const res = await fetch("/api/portal/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          ein: form.ein,
          category: form.category,
          website,
          description: form.description.trim(),
          addressLine1: form.addressLine1.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zip: form.zip.trim() || undefined,
          submittedByName: form.contactName.trim(),
          submittedByEmail: form.contactEmail.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStep(4);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg px-8 py-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-brand-600" />
            </div>
            <div className="absolute inset-0 rounded-full bg-brand-100 animate-ping opacity-30" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-gray-900">Application submitted!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            We&apos;ll review your application and reach out to{" "}
            <span className="font-semibold text-gray-700">{form.contactEmail}</span>{" "}
            within 2–3 business days.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors text-sm"
        >
          Back to GiveStream
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Heart className="w-5 h-5 fill-brand-500 stroke-brand-500" />
        <span className="font-black text-xl text-brand-600">GiveStream</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg px-8 py-8">
        <StepProgressBar current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

        {/* ── Step 1: Organization Details ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <FloatingInput
              id="orgName"
              label="Organization Name"
              required
              type="text"
              value={form.orgName}
              touched={touched.orgName}
              isValid={form.orgName.trim().length > 1}
              hasError={!!errors.orgName}
              icon={Building2}
              onChange={(e) => setField("orgName", e.target.value)}
              onBlur={() => markTouched("orgName")}
            />
            <FieldError msg={errors.orgName} />

            <FloatingInput
              id="ein"
              label="EIN"
              required
              type="text"
              value={form.ein}
              touched={touched.ein}
              isValid={validateEIN(form.ein)}
              hasError={!!errors.ein}
              maxLength={10}
              className="font-mono"
              onChange={handleEINChange}
              onBlur={handleEINBlur}
            />
            {errors.ein && <FieldError msg={errors.ein} />}
            {!errors.ein && !touched.ein && (
              <p className="text-xs text-gray-400 mt-0.5">Format: XX-XXXXXXX</p>
            )}

            <CategoryPillGrid
              value={form.category}
              onChange={(val) => setField("category", val)}
              hasError={!!errors.category}
            />

            <FloatingInput
              id="website"
              label="Website"
              type="url"
              value={form.website}
              touched={touched.website}
              isValid={!!form.website && validateURL(form.website)}
              hasError={!!errors.website}
              icon={Globe}
              onChange={(e) => setField("website", e.target.value)}
              onBlur={() => markTouched("website")}
            />
            <FieldError msg={errors.website} />
          </div>
        )}

        {/* ── Step 2: Description & Location ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <FloatingTextarea
              id="description"
              label="Organization Mission"
              required
              value={form.description}
              rows={5}
              maxLength={2000}
              hasError={!!errors.description}
              touched={!!touched.description}
              onChange={(e) => { setField("description", e.target.value); markTouched("description"); }}
            />
            <FieldError msg={errors.description} />

            <FloatingInput
              id="addressLine1"
              label="Address Line 1"
              type="text"
              value={form.addressLine1}
              onChange={(e) => setField("addressLine1", e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <FloatingInput
                  id="city"
                  label="City"
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <FloatingInput
                  id="state"
                  label="State"
                  type="text"
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => setField("state", e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-span-1">
                <FloatingInput
                  id="zip"
                  label="Zip"
                  type="text"
                  value={form.zip}
                  maxLength={5}
                  onChange={(e) => setField("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Contact ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 -mt-2 mb-1">We&apos;ll send review updates to this contact. Make sure it&apos;s someone who checks their inbox regularly.</p>

            <FloatingInput
              id="contactName"
              label="Your Name"
              required
              type="text"
              value={form.contactName}
              touched={touched.contactName}
              isValid={form.contactName.trim().length > 1}
              hasError={!!errors.contactName}
              icon={User}
              onChange={(e) => setField("contactName", e.target.value)}
              onBlur={() => markTouched("contactName")}
            />
            <FieldError msg={errors.contactName} />

            <FloatingInput
              id="contactEmail"
              label="Your Email"
              required
              type="email"
              value={form.contactEmail}
              touched={touched.contactEmail}
              isValid={validateEmail(form.contactEmail)}
              hasError={!!errors.contactEmail}
              icon={Mail}
              onChange={(e) => setField("contactEmail", e.target.value)}
              onBlur={() => markTouched("contactEmail")}
            />
            <FieldError msg={errors.contactEmail} />
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-brand-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-brand-700 transition-colors text-sm"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-brand-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-brand-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                : <>Submit Application <ChevronRight className="w-4 h-4" /></>
              }
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        By submitting, you agree to GiveStream&apos;s{" "}
        <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>.
      </p>
    </div>
  );
}
