import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";
import type { CampaignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Valid status transitions map
const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "ENDED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  ENDED: ["ARCHIVED"],
  ARCHIVED: [],
};

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  goalCents: z.number().int().min(100).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  coverImageUrl: z.string().url().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED", "ARCHIVED"]).optional(),
});

async function getCampaignForNonprofit(campaignId: string, nonprofitId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, nonprofitId },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string }> }
) {
  const { nonprofitId, campaignId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, nonprofitId },
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

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string }> }
) {
  const { nonprofitId, campaignId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const existing = await getCampaignForNonprofit(campaignId, nonprofitId);
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "At least one field must be provided" },
      { status: 400 }
    );
  }

  // Validate status transition
  if (data.status && data.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(data.status as CampaignStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${data.status}`,
          allowedTransitions: allowed,
        },
        { status: 422 }
      );
    }

    // DRAFT → ACTIVE requires title and description to be set
    if (data.status === "ACTIVE" && existing.status === "DRAFT") {
      const title = data.title ?? existing.title;
      const description = data.description ?? existing.description;
      if (!title || title.length < 3) {
        return NextResponse.json(
          { error: "Title is required to activate campaign" },
          { status: 422 }
        );
      }
      if (!description || description.length < 10) {
        return NextResponse.json(
          { error: "Description is required to activate campaign" },
          { status: 422 }
        );
      }
    }
  }

  // Validate endsAt is future if provided
  if (data.endsAt) {
    const endsAtDate = new Date(data.endsAt);
    if (endsAtDate <= new Date()) {
      return NextResponse.json(
        { error: "endsAt must be a future date" },
        { status: 422 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.goalCents !== undefined) updateData.goalCents = data.goalCents;
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "ACTIVE" && existing.status === "DRAFT") {
      updateData.publishedAt = new Date();
    }
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string }> }
) {
  const { nonprofitId, campaignId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const existing = await getCampaignForNonprofit(campaignId, nonprofitId);
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ archived: true });
}
