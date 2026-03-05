import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  nonprofitId: z.string(),
  amountCents: z.number().int().min(100).max(1_000_000_00), // $1 – $1,000,000
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { nonprofitId, amountCents } = parsed.data;

  const nonprofit = await prisma.nonprofit.findUnique({ where: { id: nonprofitId } });
  if (!nonprofit) {
    return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });
  }

  // Create a pending donation record first
  const donation = await prisma.donation.create({
    data: {
      userId: session.user.id,
      nonprofitId,
      amountCents,
      currency: "usd",
      status: "PENDING",
    },
  });

  const webUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // EXPO_DEEP_LINK_BASE routes the Stripe redirect back into the mobile app
  // (e.g. "givestream://" or a universal link). Falls back to the web URL so
  // browser-initiated sessions still work without extra env config.
  const deepLinkBase = process.env.EXPO_DEEP_LINK_BASE ?? webUrl;

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Donation to ${nonprofit.name}`,
            description: `Your charitable contribution to ${nonprofit.name} (EIN: ${nonprofit.ein})`,
            images: nonprofit.logoUrl ? [nonprofit.logoUrl] : [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      donationId: donation.id,
      nonprofitId,
      userId: session.user.id,
    },
    success_url: `${deepLinkBase}/donation/success?session_id={CHECKOUT_SESSION_ID}&donation_id=${donation.id}`,
    cancel_url: `${deepLinkBase}/n/${nonprofitId}?cancelled=true`,
    customer_email: session.user.email ?? undefined,
  });

  // Store the session ID
  await prisma.donation.update({
    where: { id: donation.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
