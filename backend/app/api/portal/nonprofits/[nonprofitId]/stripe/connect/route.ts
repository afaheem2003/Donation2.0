import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requirePortalAccess, isPortalError } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId);
  if (isPortalError(auth)) return auth;

  const connect = await prisma.stripeConnect.findUnique({
    where: { nonprofitId },
    select: {
      status: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    },
  });

  if (!connect) {
    return NextResponse.json({
      status: "NOT_CONNECTED",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }

  // onboardingUrl is intentionally omitted — use POST to generate a fresh link
  return NextResponse.json({
    status: connect.status,
    chargesEnabled: connect.chargesEnabled,
    payoutsEnabled: connect.payoutsEnabled,
    detailsSubmitted: connect.detailsSubmitted,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nonprofitId: string }> }
) {
  const { nonprofitId } = await params;

  const auth = await requirePortalAccess(req, nonprofitId, "OWNER");
  if (isPortalError(auth)) return auth;

  const nonprofit = await prisma.nonprofit.findUnique({
    where: { id: nonprofitId },
    select: { name: true },
  });

  if (!nonprofit) {
    return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const returnUrl = `${baseUrl}/portal/onboarding?stripe=return`;
  const refreshUrl = `${baseUrl}/portal/stripe/refresh`;

  const existingConnect = await prisma.stripeConnect.findUnique({
    where: { nonprofitId },
    select: { id: true, stripeAccountId: true },
  });

  try {
    if (!existingConnect) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { nonprofitId },
      });

      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      await prisma.stripeConnect.upsert({
        where: { nonprofitId },
        create: {
          nonprofitId,
          stripeAccountId: account.id,
          status: "PENDING_VERIFICATION",
          onboardingUrl: link.url,
          onboardingExpiresAt: new Date(link.expires_at * 1000),
        },
        update: {
          stripeAccountId: account.id,
          status: "PENDING_VERIFICATION",
          onboardingUrl: link.url,
          onboardingExpiresAt: new Date(link.expires_at * 1000),
        },
      });

      return NextResponse.json({ onboardingUrl: link.url });
    } else {
      const link = await stripe.accountLinks.create({
        account: existingConnect.stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      await prisma.stripeConnect.update({
        where: { nonprofitId },
        data: {
          onboardingUrl: link.url,
          onboardingExpiresAt: new Date(link.expires_at * 1000),
        },
      });

      return NextResponse.json({ onboardingUrl: link.url });
    }
  } catch (err) {
    console.error("Stripe Connect error:", err);
    return NextResponse.json({ error: "Failed to create Stripe onboarding link" }, { status: 500 });
  }
}
