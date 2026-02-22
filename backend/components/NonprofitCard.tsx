"use client";

import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, DollarSign } from "lucide-react";
import { formatCents } from "@/lib/utils";

interface NonprofitCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string | null;
  verified: boolean;
  donationCount?: number;
}

export function NonprofitCard({
  id,
  name,
  description,
  category,
  logoUrl,
  verified,
  donationCount = 0,
}: NonprofitCardProps) {
  const categoryLabel = category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link href={`/n/${id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 hover:shadow-md transition-all">
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              width={52}
              height={52}
              className="rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-[52px] h-[52px] rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🤝</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                {name}
              </h3>
              {verified && (
                <BadgeCheck className="w-4 h-4 text-brand-500 flex-shrink-0" />
              )}
            </div>
            <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mb-2">
              {categoryLabel}
            </span>
            <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
          </div>
        </div>
        {donationCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-xs text-gray-400">
            <DollarSign className="w-3 h-3" />
            {donationCount.toLocaleString()} donations
          </div>
        )}
      </div>
    </Link>
  );
}
