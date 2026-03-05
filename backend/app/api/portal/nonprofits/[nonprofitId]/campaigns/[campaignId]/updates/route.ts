import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(10, "Body must be at least 10 characters").max(10000),
  imageUrl: z.string().url().max(2000).optional().nullable(),
});

async function getCampaignForNonprofit(campaignId: string, nonprofitId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, nonprofitId },
    select: { id: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string }> }
) {
  const { nonprofitId, campaignId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const campaign = await getCampaignForNonprofit(campaignId, nonprofitId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const updates = await prisma.campaignUpdate.findMany({
    where: { campaignId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ updates });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string }> }
) {
  const { nonprofitId, campaignId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const campaign = await getCampaignForNonprofit(campaignId, nonprofitId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const update = await prisma.campaignUpdate.create({
    data: {
      campaignId,
      authorId: auth.session.user.id,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl ?? null,
    },
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(update, { status: 201 });
}
