"use client";

import { useState, useEffect } from "react";
import { NonprofitCard } from "@/components/NonprofitCard";
import { Search, Loader2 } from "lucide-react";

const CATEGORIES = [
  "ALL",
  "EDUCATION",
  "HEALTH",
  "ENVIRONMENT",
  "ARTS",
  "HUMAN_SERVICES",
  "ANIMALS",
  "INTERNATIONAL",
  "RELIGION",
  "COMMUNITY",
  "OTHER",
];

interface Nonprofit {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string | null;
  verified: boolean;
  _count: { donations: number };
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setQuery(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (category !== "ALL") params.set("category", category);

    fetch(`/api/nonprofits?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setNonprofits(data.nonprofits);
        setTotal(data.total);
        setLoading(false);
      });
  }, [query, category]);

  const categoryLabel = (c: string) =>
    c === "ALL"
      ? "All"
      : c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover Nonprofits</h1>
        <p className="text-gray-500 text-sm">Find causes you care about and make an impact.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nonprofits, EINs..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:outline-none bg-white text-sm"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              category === c
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300"
            }`}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
        </div>
      ) : nonprofits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No nonprofits found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">{total} nonprofits</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nonprofits.map((np) => (
              <NonprofitCard
                key={np.id}
                id={np.id}
                name={np.name}
                description={np.description}
                category={np.category}
                logoUrl={np.logoUrl}
                verified={np.verified}
                donationCount={np._count.donations}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
