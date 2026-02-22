import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  nonprofitId: z.string(),
  amountCents: z.number().int().min(100), // minimum $1
});

export async function POST(req: NextRequest) {
  const session = await auth();
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
    success_url: `${appUrl}/donation/success?session_id={CHECKOUT_SESSION_ID}&donation_id=${donation.id}`,
    cancel_url: `${appUrl}/n/${nonprofitId}?cancelled=true`,
    customer_email: session.user.email ?? undefined,
  });

  // Store the session ID
  await prisma.donation.update({
    where: { id: donation.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
