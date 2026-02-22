import { Feed } from "@/components/Feed";
import Link from "next/link";
import { Heart, TrendingUp, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Give more. Share your impact.</h1>
        <p className="text-brand-100 text-sm mb-4">
          Donate to nonprofits you love and inspire others to do the same.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-brand-50 transition-colors"
        >
          <Heart className="w-4 h-4" />
          Discover nonprofits
        </Link>
      </div>

      <h2 className="font-bold text-gray-900 mb-4 text-lg">Latest from the community</h2>
      <Feed />
    </div>
  );
}
