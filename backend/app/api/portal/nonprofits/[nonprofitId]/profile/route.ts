import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  website: z.string().url().max(500).optional().nullable(),
  category: z
    .enum([
      "EDUCATION",
      "HEALTH",
      "ENVIRONMENT",
      "ARTS",
      "HUMAN_SERVICES",
      "ANIMALS",
      "INTERNATIONAL",
      "RELIGION",
      "COMMUNITY",
      "OTHER",
    ])
    .optional(),
  logoUrl: z.string().url().max(1000).optional().nullable(),
});

export async function PATCH(
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // At least one field must be provided
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "At least one field must be provided" },
      { status: 400 }
    );
  }

  const updated = await prisma.nonprofit.update({
    where: { id: nonprofitId },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      website: true,
      category: true,
      logoUrl: true,
      verified: true,
    },
  });

  return NextResponse.json(updated);
}
