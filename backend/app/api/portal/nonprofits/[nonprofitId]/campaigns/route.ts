import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";
import type { CampaignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(10000),
  goalCents: z
    .number()
    .int()
    .min(100, "Goal must be at least $1.00")
    .optional()
    .nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  coverImageUrl: z.string().url().max(2000).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CampaignStatus | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    nonprofitId,
    ...(status ? { status } : {}),
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
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
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({ campaigns, total });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

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

  const { title, description, goalCents, startsAt, endsAt, coverImageUrl } = parsed.data;

  // Validate endsAt is a future date if provided
  if (endsAt) {
    const endsAtDate = new Date(endsAt);
    if (endsAtDate <= new Date()) {
      return NextResponse.json(
        { error: "endsAt must be a future date" },
        { status: 422 }
      );
    }
  }

  // Generate unique slug
  let slug = generateSlug(title);
  // Ensure uniqueness with a retry loop
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateSlug(title);
    attempts++;
  }

  const campaign = await prisma.campaign.create({
    data: {
      nonprofitId,
      createdByUserId: auth.session.user.id,
      title,
      slug,
      description,
      goalCents: goalCents ?? null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      coverImageUrl: coverImageUrl ?? null,
      status: "DRAFT",
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
