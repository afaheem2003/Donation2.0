import Link from "next/link";
import { Heart, Search, Share2, Receipt, Users, TrendingUp, Building2, Smartphone, Megaphone, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Heart className="w-3.5 h-3.5" />
            Venmo for Nonprofits
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight tracking-tight">
            Give more.<br className="hidden sm:block" /> Share your impact.
          </h1>
          <p className="text-brand-100 text-lg mb-10 max-w-md leading-relaxed">
            Donate to nonprofits you love and inspire your community to do the same.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/discover"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-bold px-7 py-3.5 rounded-full hover:bg-brand-50 transition-colors shadow-lg"
            >
              <Heart className="w-4 h-4" />
              Browse nonprofits
            </Link>
            <a
              href="#download"
              className="inline-flex items-center justify-center gap-2 bg-white/15 text-white font-bold px-7 py-3.5 rounded-full hover:bg-white/25 transition-colors border border-white/20"
            >
              <Smartphone className="w-4 h-4" />
              Get the app
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">How it works</h2>
          <p className="text-gray-400 text-center mb-14">Three steps to make an impact</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                step: "1",
                title: "Find",
                desc: "Browse 500+ verified nonprofits across every cause that matters to you.",
              },
              {
                icon: Heart,
                step: "2",
                title: "Donate",
                desc: "Give securely via Stripe and receive an instant tax-deductible receipt.",
              },
              {
                icon: Share2,
                step: "3",
                title: "Share",
                desc: "Post your impact to the social feed and inspire your friends to give.",
              },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 hover:border-brand-200 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-brand-500" />
                </div>
                <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Step {step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">
            Everything you need to give with confidence
          </h2>
          <p className="text-gray-400 text-center mb-14">Built for donors who care</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Receipt,
                title: "Instant tax receipts",
                desc: "Automatic 501(c)(3) receipts after every donation. Export a full CSV at tax time.",
              },
              {
                icon: Users,
                title: "Social giving feed",
                desc: "See what your friends are donating to and discover causes you hadn't considered.",
              },
              {
                icon: Building2,
                title: "500+ verified nonprofits",
                desc: "Every nonprofit is EIN-verified. No scams, no middlemen, no surprise fees.",
              },
              {
                icon: TrendingUp,
                title: "Impact tracking",
                desc: "Set an annual giving goal and watch your progress grow in real time.",
              },
              {
                icon: Heart,
                title: "Secure payments",
                desc: "Powered by Stripe. Your payment info is never stored on our servers.",
              },
              {
                icon: Share2,
                title: "One-tap sharing",
                desc: "Share your donation in seconds. Inspire your network without the pressure.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Nonprofits ───────────────────────────────────────────── */}
      <section id="nonprofits" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left column */}
            <div>
              <span className="bg-brand-50 text-brand-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                For Nonprofits
              </span>
              <h2 className="text-3xl font-black text-gray-900 mt-4 leading-tight">
                Grow your donor community
              </h2>
              <p className="text-gray-500 text-base mt-3 leading-relaxed max-w-sm">
                Join thousands of donors already giving on GiveStream. Claim your free page and start engaging directly with supporters.
              </p>
              <div className="mt-8 flex flex-col items-start gap-2">
                <Link
                  href="/auth/claim"
                  className="bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors inline-flex items-center gap-2"
                >
                  Claim your nonprofit page →
                </Link>
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-500 hover:text-gray-700 mt-2 inline-flex items-center gap-1"
                >
                  Already have an account? Sign in
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                ✓ Free to join&nbsp;&nbsp;✓ No setup fees&nbsp;&nbsp;✓ EIN verified
              </p>
            </div>

            {/* Right column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Share2,
                  title: "Social feed exposure",
                  desc: "Every donation creates a shareable post seen by donors' followers.",
                },
                {
                  icon: Megaphone,
                  title: "Run campaigns",
                  desc: "Set goals, track progress in real time, and rally your community.",
                },
                {
                  icon: Users,
                  title: "Build your following",
                  desc: "Donors can follow your org and get notified of new campaigns.",
                },
                {
                  icon: Receipt,
                  title: "Automatic tax receipts",
                  desc: "We handle 501(c)(3) receipts for every donation. Zero paperwork.",
                },
                {
                  icon: TrendingUp,
                  title: "Donation analytics",
                  desc: "Real-time dashboard showing donors, amounts, and growth trends.",
                },
                {
                  icon: MessageCircle,
                  title: "Direct donor engagement",
                  desc: "Post updates, say thank-yous, and build lasting relationships.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── App download / waitlist ───────────────────────────────────── */}
      <section id="download" className="py-20 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 border border-white/20">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-3">Coming soon to iOS &amp; Android</h2>
          <p className="text-brand-100 mb-10 leading-relaxed">
            Be the first to know when the app launches. No spam, unsubscribe anytime.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 px-5 py-3 rounded-full bg-white/15 text-white placeholder-brand-200 border border-white/25 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="px-7 py-3 bg-white text-brand-700 font-bold rounded-full hover:bg-brand-50 transition-colors shadow-lg"
            >
              Notify me
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
