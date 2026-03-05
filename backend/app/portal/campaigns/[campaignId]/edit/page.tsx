"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CampaignForm } from "@/components/portal/CampaignForm";
import type { CampaignStatus } from "@prisma/client";

interface CampaignData {
  id: string;
  nonprofitId: string;
  title: string;
  description: string;
  goalCents: number | null;
  coverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: CampaignStatus;
}

export default function EditCampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [nonprofitId, setNonprofitId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load organization.");
        return res.json();
      })
      .then(async (data) => {
        const first = data?.nonprofits?.[0];
        if (!first?.id) throw new Error("No organization found.");
        const nid = first.id;
        setNonprofitId(nid);

        const camRes = await fetch(
          `/api/portal/nonprofits/${nid}/campaigns/${campaignId}`
        );
        if (!camRes.ok) throw new Error("Campaign not found.");
        const cam = await camRes.json();
        setCampaign(cam);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (error || !nonprofitId || !campaign) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center text-red-600 text-sm">
        {error ?? "Could not load campaign. Please try again."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5 truncate">{campaign.title}</p>
      </div>
      <CampaignForm
        nonprofitId={nonprofitId}
        mode="edit"
        campaignId={campaignId}
        initialData={{
          title: campaign.title,
          description: campaign.description,
          goalCents: campaign.goalCents,
          coverImageUrl: campaign.coverImageUrl,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          status: campaign.status,
        }}
      />
    </div>
  );
}
