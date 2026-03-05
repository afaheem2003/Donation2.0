import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Heart, ArrowRight, ClipboardList } from "lucide-react";

export default async function PortalApplyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/apply");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo mark */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Heart className="w-8 h-8 fill-brand-500 stroke-brand-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-gray-900">Apply to join GiveStream</h1>
          <p className="text-gray-500 leading-relaxed">
            Submit your nonprofit's information for review. Approved organizations gain access to
            the full portal — including campaigns, donation tracking, payouts, and analytics.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { label: "Campaign tools", desc: "Create and manage fundraising campaigns" },
            { label: "Donation tracking", desc: "Real-time donations and donor data" },
            { label: "Payouts", desc: "Stripe Connect payouts to your bank" },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/portal/apply/form"
            className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 text-white font-bold px-7 py-3.5 rounded-full hover:bg-brand-700 transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4" />
            Start Application
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400">
            Application form coming soon. Check back shortly.
          </p>
        </div>

        {/* Back link */}
        <Link
          href="/"
          className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Back to GiveStream
        </Link>
      </div>
    </div>
  );
}
