import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional().nullable(),
  body: z.string().min(10).max(10000).optional(),
  imageUrl: z.string().url().max(2000).optional().nullable(),
});

async function getUpdate(updateId: string, campaignId: string, nonprofitId: string) {
  return prisma.campaignUpdate.findFirst({
    where: {
      id: updateId,
      campaignId,
      campaign: { nonprofitId },
      isDeleted: false,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string; updateId: string }> }
) {
  const { nonprofitId, campaignId, updateId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const existing = await getUpdate(updateId, campaignId, nonprofitId);
  if (!existing) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
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

  const updated = await prisma.campaignUpdate.update({
    where: { id: updateId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    },
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string; campaignId: string; updateId: string }> }
) {
  const { nonprofitId, campaignId, updateId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const existing = await getUpdate(updateId, campaignId, nonprofitId);
  if (!existing) {
    return NextResponse.json({ error: "Update not found" }, { status: 404 });
  }

  await prisma.campaignUpdate.update({
    where: { id: updateId },
    data: { isDeleted: true },
  });

  return NextResponse.json({ deleted: true });
}
