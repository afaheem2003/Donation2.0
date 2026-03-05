import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CampaignDetail } from "@/components/portal/CampaignDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: { campaignId: string };
}

export default async function CampaignDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/campaigns");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) redirect("/portal/apply");

  const { nonprofitId } = adminRecord;

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, nonprofitId },
    include: {
      donations: {
        where: { status: "SUCCEEDED" },
        orderBy: { donatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          amountCents: true,
          donatedAt: true,
          createdAt: true,
          user: { select: { name: true, username: true, avatarUrl: true } },
        },
      },
      updates: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          body: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true, username: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!campaign) notFound();

  // Serialize dates for client component
  const serialized = {
    ...campaign,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    publishedAt: campaign.publishedAt ? campaign.publishedAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    donations: campaign.donations.map((d) => ({
      ...d,
      donatedAt: d.donatedAt ? d.donatedAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    })),
    updates: campaign.updates.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  };

  return <CampaignDetail campaign={serialized} nonprofitId={nonprofitId} />;
}
