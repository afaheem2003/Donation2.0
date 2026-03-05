"use client";

import { useEffect, useState } from "react";
import { CampaignForm } from "@/components/portal/CampaignForm";

export default function NewCampaignPage() {
  const [nonprofitId, setNonprofitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load organization info.");
        return res.json();
      })
      .then((data) => {
        const first = data?.nonprofits?.[0];
        if (!first?.id) throw new Error("No organization found.");
        setNonprofitId(first.id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (error || !nonprofitId) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center text-red-600 text-sm">
        {error ?? "Could not load organization. Please try again."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create a fundraising campaign to rally support for your cause.
        </p>
      </div>
      <CampaignForm nonprofitId={nonprofitId} mode="create" />
    </div>
  );
}
