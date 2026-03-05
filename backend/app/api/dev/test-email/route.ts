// GET /api/dev/test-email?to=you@email.com&type=receipt|invite|approved|rejected
// Dev-only. Calls Resend directly and returns the full API response so you can
// see exactly what happened (success or error) instead of silently skipping.

import * as React from "react";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { DonationReceiptEmail } from "@/emails/DonationReceiptEmail";
import { ApplicationStatusEmail } from "@/emails/ApplicationStatusEmail";
import { ApplicationReceivedEmail } from "@/emails/ApplicationReceivedEmail";
import { TeamInviteEmail } from "@/emails/TeamInviteEmail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      error: "RESEND_API_KEY is not set. Add it to backend/.env and restart the server.",
    }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");
  const type = searchParams.get("type") ?? "receipt";
  // Valid types: receipt | approved | rejected | received | received-claim | invite

  if (!to) {
    return NextResponse.json(
      { error: "Pass ?to=your@email.com&type=receipt|approved|rejected|received|received-claim|invite" },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Always use Resend's shared sender in dev — ignores EMAIL_FROM so an
  // unverified custom domain doesn't block testing.
  const FROM = "GiveStream <onboarding@resend.dev>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  let subject: string;
  let react: React.ReactElement;

  if (type === "receipt") {
    subject = "Your GiveStream donation receipt — Doctors Without Borders USA";
    react = React.createElement(DonationReceiptEmail, {
      donorName: "Sarah Chen",
      nonprofitName: "Doctors Without Borders USA",
      nonprofitEin: "13-3433452",
      amountCents: 5000,
      donatedAt: new Date(),
      receiptNumber: "RCT-2025-A3F2B1",
      taxYear: new Date().getFullYear(),
    });
  } else if (type === "approved") {
    subject = "Your GiveStream application has been approved — Local Arts Fund";
    react = React.createElement(ApplicationStatusEmail, {
      applicantName: "Jordan Lee",
      orgName: "Local Arts Fund",
      status: "APPROVED",
      reviewNotes: "Everything looks great — welcome to GiveStream!",
      portalUrl: `${APP_URL}/portal/dashboard`,
    });
  } else if (type === "rejected") {
    subject = "Update on your GiveStream application — Local Arts Fund";
    react = React.createElement(ApplicationStatusEmail, {
      applicantName: "Jordan Lee",
      orgName: "Local Arts Fund",
      status: "REJECTED",
      reviewNotes: "We were unable to verify the EIN provided. Please double-check and reapply.",
    });
  } else if (type === "received") {
    subject = "We received your GiveStream application — Local Arts Fund";
    react = React.createElement(ApplicationReceivedEmail, {
      applicantName: "Jordan Lee",
      orgName: "Local Arts Fund",
    });
  } else if (type === "received-claim") {
    subject = "We received your claim for Doctors Without Borders USA on GiveStream";
    react = React.createElement(ApplicationReceivedEmail, {
      applicantName: "Jordan Lee",
      orgName: "Doctors Without Borders USA",
      isClaim: true,
    });
  } else if (type === "invite") {
    subject = "You've been invited to manage Doctors Without Borders USA on GiveStream";
    react = React.createElement(TeamInviteEmail, {
      invitedByName: "Sarah Chen",
      nonprofitName: "Doctors Without Borders USA",
      role: "ADMIN",
      acceptUrl: `${APP_URL}/portal/invite/test-token-abc123`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } else {
    return NextResponse.json(
      { error: "Unknown type. Use: receipt, invite, approved, rejected" },
      { status: 400 }
    );
  }

  const { data, error } = await resend.emails.send({ from: FROM, to, subject, react });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sent: type, to, resendId: data?.id });
}
