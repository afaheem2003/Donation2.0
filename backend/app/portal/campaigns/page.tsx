import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CampaignList } from "@/components/portal/CampaignList";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/portal/campaigns");

  const adminRecord = await prisma.nonprofitAdmin.findFirst({
    where: { userId: session.user.id },
    select: { nonprofitId: true },
  });

  if (!adminRecord) redirect("/portal/apply");

  const { nonprofitId } = adminRecord;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { nonprofitId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        goalCents: true,
        raisedCents: true,
        donorCount: true,
        endsAt: true,
        createdAt: true,
        coverImageUrl: true,
      },
    }),
    prisma.campaign.count({ where: { nonprofitId } }),
  ]);

  const serialized = campaigns.map((c) => ({
    ...c,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CampaignList campaigns={serialized} total={total} />;
}
