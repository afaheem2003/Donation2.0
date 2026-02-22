"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Globe, Heart, DollarSign, Loader2, ExternalLink } from "lucide-react";
import { DonateModal } from "@/components/DonateModal";
import { formatCents } from "@/lib/utils";

interface Nonprofit {
  id: string;
  name: string;
  ein: string;
  description: string;
  category: string;
  website?: string | null;
  logoUrl?: string | null;
  verified: boolean;
  totalRaisedCents: number;
  _count: { donations: number; posts: number };
}

export default function NonprofitPage() {
  const params = useParams();
  const id = params.id as string;
  const [nonprofit, setNonprofit] = useState<Nonprofit | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/nonprofits/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setNonprofit(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!nonprofit) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>Nonprofit not found.</p>
        <Link href="/discover" className="text-brand-600 text-sm mt-2 block">Back to discover</Link>
      </div>
    );
  }

  const categoryLabel = nonprofit.category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="h-28 bg-gradient-to-br from-brand-100 to-brand-200" />
        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4">
            {nonprofit.logoUrl ? (
              <Image
                src={nonprofit.logoUrl}
                alt={nonprofit.name}
                width={80}
                height={80}
                className="rounded-2xl border-4 border-white shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-sm bg-brand-50 flex items-center justify-center text-3xl">
                🤝
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{nonprofit.name}</h1>
                {nonprofit.verified && (
                  <BadgeCheck className="w-6 h-6 text-brand-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{categoryLabel}</span>
                <span>EIN: {nonprofit.ein}</span>
              </div>
            </div>

            <button
              onClick={() => setDonateOpen(true)}
              className="flex items-center gap-2 bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors"
            >
              <Heart className="w-4 h-4 fill-white stroke-white" />
              Donate
            </button>
          </div>

          {nonprofit.website && (
            <a
              href={nonprofit.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-3"
            >
              <Globe className="w-3.5 h-3.5" />
              {nonprofit.website.replace(/^https?:\/\//, "")}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <p className="mt-4 text-gray-600 leading-relaxed">{nonprofit.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-50">
            <div className="text-center">
              <p className="font-bold text-lg text-gray-900">
                {formatCents(nonprofit.totalRaisedCents)}
              </p>
              <p className="text-xs text-gray-400">Total raised</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-gray-900">
                {nonprofit._count.donations.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Donations</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-gray-900">
                {nonprofit._count.posts.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Posts</p>
            </div>
          </div>
        </div>
      </div>

      {donateOpen && (
        <DonateModal
          nonprofitId={nonprofit.id}
          nonprofitName={nonprofit.name}
          onClose={() => setDonateOpen(false)}
        />
      )}
    </div>
  );
}
