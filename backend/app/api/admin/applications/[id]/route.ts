import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { ApplicationStatusEmail } from "@/emails/ApplicationStatusEmail";

// NOTE: This route uses prisma.nonprofitApplication — the model must exist in schema.prisma.
// The NonprofitApplication model is being added by a concurrent schema migration agent.

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const application = await prisma.nonprofitApplication.findUnique({
    where: { id },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

const PatchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
  reviewNotes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { status, reviewNotes } = parsed.data;

  const application = await prisma.nonprofitApplication.findUnique({
    where: { id },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Guard: prevent re-processing an already-approved application
  if (application.status === "APPROVED" && status === "APPROVED") {
    return NextResponse.json({ error: "Application is already approved." }, { status: 409 });
  }

  const now = new Date();
  const reviewedByUserId = session.user.id;

  if (status === "APPROVED") {
    let nonprofitId: string;

    try {
      // Wrap all approval side-effects in a transaction
      const result = await prisma.$transaction(async (tx) => {
        if (application.isClaim && application.nonprofitId) {
          // Claim approval — nonprofit already exists, just link the admin
          nonprofitId = application.nonprofitId;
        } else {
          // New org approval — create the Nonprofit record
          const nonprofit = await tx.nonprofit.create({
            data: {
              name: application.orgName,
              ein: application.ein,
              description: application.description,
              category: application.category,
              website: application.website ?? null,
              verified: false,
            },
            select: { id: true },
          });
          nonprofitId = nonprofit.id;
        }

        // Find submitter user — reject self-approval (admin approving own application)
        const submitterUser = await tx.user.findUnique({
          where: { email: application.submittedByEmail },
          select: { id: true },
        });

        if (submitterUser && submitterUser.id === reviewedByUserId) {
          throw Object.assign(new Error("SELF_APPROVAL"), { code: "SELF_APPROVAL" });
        }

        if (submitterUser) {
          await tx.nonprofitAdmin.upsert({
            where: { userId_nonprofitId: { userId: submitterUser.id, nonprofitId } },
            create: { userId: submitterUser.id, nonprofitId, role: "OWNER" },
            update: { role: "OWNER" },
          });
        }
        // If no user exists yet, they will be linked via invite flow when they sign up.

        const app = await tx.nonprofitApplication.update({
          where: { id },
          data: {
            status: "APPROVED",
            nonprofitId,
            reviewedAt: now,
            reviewedByUserId,
            reviewNotes: reviewNotes ?? null,
          },
        });

        return { application: app, nonprofitId };
      });

      // Send approval email (non-blocking — don't fail the response if email fails)
      try {
        const appData = result.application;
        await sendEmail({
          to: appData.submittedByEmail,
          subject: `Your GiveStream application has been approved — ${appData.orgName}`,
          react: React.createElement(ApplicationStatusEmail, {
            applicantName: appData.submittedByName,
            orgName: appData.orgName,
            status: "APPROVED",
            reviewNotes: reviewNotes,
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://givestream.org"}/portal/dashboard`,
          }),
        });
      } catch (emailErr) {
        console.error("Approval email failed:", emailErr);
      }

      return NextResponse.json(result);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2002") {
          return NextResponse.json({ error: "This organization has already been approved." }, { status: 409 });
        }
        if (code === "SELF_APPROVAL") {
          return NextResponse.json({ error: "You cannot approve your own application." }, { status: 403 });
        }
      }
      throw err;
    }
  }

  if (status === "REJECTED") {
    const updated = await prisma.nonprofitApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: now,
        reviewedByUserId,
        reviewNotes: reviewNotes ?? null,
      },
    });

    try {
      await sendEmail({
        to: updated.submittedByEmail,
        subject: `Update on your GiveStream application — ${updated.orgName}`,
        react: React.createElement(ApplicationStatusEmail, {
          applicantName: updated.submittedByName,
          orgName: updated.orgName,
          status: "REJECTED",
          reviewNotes: reviewNotes,
        }),
      });
    } catch (emailErr) {
      console.error("Rejection email failed:", emailErr);
    }

    return NextResponse.json({ application: updated });
  }

  // UNDER_REVIEW
  const updated = await prisma.nonprofitApplication.update({
    where: { id },
    data: {
      status: "UNDER_REVIEW",
      reviewNotes: reviewNotes ?? null,
    },
  });

  return NextResponse.json({ application: updated });
}
