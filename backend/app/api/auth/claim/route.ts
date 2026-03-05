// POST /api/auth/claim
// Public endpoint — no auth required
// Body: { ein: string, submittedByName: string, submittedByEmail: string }
// Creates a NonprofitApplication with isClaim=true, nonprofitId pre-set

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { ApplicationReceivedEmail } from "@/emails/ApplicationReceivedEmail";

export const dynamic = "force-dynamic";

const ClaimSchema = z.object({
  ein: z.string().regex(/^\d{2}-\d{7}$/, "Invalid EIN format"),
  submittedByName: z.string().min(2).max(200),
  submittedByEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { ein, submittedByName, submittedByEmail } = parsed.data;

  // Verify nonprofit exists and is unclaimed
  const nonprofit = await prisma.nonprofit.findUnique({
    where: { ein },
    select: { id: true, name: true, ein: true, category: true, description: true },
  });
  if (!nonprofit) return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });

  const nonprofitId = nonprofit.id;
  const adminCount = await prisma.nonprofitAdmin.count({ where: { nonprofitId } });
  if (adminCount > 0) return NextResponse.json({ error: "This organization already has an admin." }, { status: 409 });

  // Check for any existing claim for this org (pending or previously rejected)
  const existingClaim = await prisma.nonprofitApplication.findFirst({
    where: { nonprofitId, isClaim: true },
    select: { id: true, status: true },
  });

  if (existingClaim && (existingClaim.status === "PENDING" || existingClaim.status === "UNDER_REVIEW")) {
    return NextResponse.json({ error: "A claim for this organization is already pending review." }, { status: 409 });
  }

  // If a prior rejected claim exists, reset it rather than create a new one
  // (nonprofitId is @unique so we can't have two records pointing to same nonprofit)
  let application: { id: string };
  if (existingClaim) {
    application = await prisma.nonprofitApplication.update({
      where: { id: existingClaim.id },
      data: {
        submittedByEmail,
        submittedByName,
        status: "PENDING",
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNotes: null,
      },
      select: { id: true },
    });
  } else {
    application = await prisma.nonprofitApplication.create({
      data: {
        orgName: nonprofit.name,
        ein: nonprofit.ein,
        category: nonprofit.category,
        description: nonprofit.description,
        submittedByEmail,
        submittedByName,
        isClaim: true,
        nonprofitId,
        status: "PENDING",
      },
      select: { id: true },
    });
  }

  // Send confirmation email (non-blocking)
  try {
    await sendEmail({
      to: submittedByEmail,
      subject: `We received your claim for ${nonprofit.name} on GiveStream`,
      react: React.createElement(ApplicationReceivedEmail, {
        applicantName: submittedByName,
        orgName: nonprofit.name,
        isClaim: true,
      }),
    });
  } catch (emailErr) {
    console.error("Claim received email failed:", emailErr);
  }

  return NextResponse.json({ applicationId: application.id }, { status: 201 });
}
