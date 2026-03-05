import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { ApplicationReceivedEmail } from "@/emails/ApplicationReceivedEmail";

// NOTE: This route uses prisma.nonprofitApplication — the model must exist in schema.prisma.
// The NonprofitApplication model is being added by a concurrent schema migration agent.

const ApplySchema = z.object({
  orgName: z.string().min(2),
  ein: z.string().regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX"),
  category: z.enum([
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
  ]),
  description: z.string().min(20).max(2000),
  website: z.string().url().optional(),
  submittedByEmail: z.string().email(),
  submittedByName: z.string().min(2),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Check for duplicate EIN in Nonprofit table
  const existingNonprofit = await prisma.nonprofit.findUnique({
    where: { ein: data.ein },
    select: { id: true },
  });
  if (existingNonprofit) {
    return NextResponse.json(
      { error: "An organization with this EIN is already registered." },
      { status: 409 }
    );
  }

  // Check for duplicate EIN in NonprofitApplication table (only block active submissions)
  const existingApplication = await prisma.nonprofitApplication.findFirst({
    where: { ein: data.ein, status: { in: ["PENDING", "UNDER_REVIEW"] } },
    select: { id: true },
  });
  if (existingApplication) {
    return NextResponse.json(
      { error: "An application with this EIN is already under review." },
      { status: 409 }
    );
  }

  const application = await prisma.nonprofitApplication.create({
    data: {
      orgName: data.orgName,
      ein: data.ein,
      category: data.category,
      description: data.description,
      website: data.website ?? null,
      submittedByEmail: data.submittedByEmail,
      submittedByName: data.submittedByName,
      addressLine1: data.addressLine1 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip: data.zip ?? null,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Send confirmation email (non-blocking)
  try {
    await sendEmail({
      to: data.submittedByEmail,
      subject: `We received your GiveStream application — ${data.orgName}`,
      react: React.createElement(ApplicationReceivedEmail, {
        applicantName: data.submittedByName,
        orgName: data.orgName,
      }),
    });
  } catch (emailErr) {
    console.error("Application received email failed:", emailErr);
  }

  return NextResponse.json({ applicationId: application.id }, { status: 201 });
}
