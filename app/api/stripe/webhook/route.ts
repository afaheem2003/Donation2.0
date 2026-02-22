import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createReceiptForDonation } from "@/lib/receipt";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const donationId = session.metadata?.donationId;
    if (!donationId) {
      console.error("No donationId in webhook metadata");
      return NextResponse.json({ received: true });
    }

    try {
      // Update donation to SUCCEEDED
      const donation = await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: "SUCCEEDED",
          stripePaymentIntentId: session.payment_intent as string,
          donatedAt: new Date(event.created * 1000),
        },
      });

      // Create receipt
      await createReceiptForDonation(donation.id);

      console.log(`Donation ${donationId} succeeded, receipt created`);
    } catch (err) {
      console.error("Error processing webhook:", err);
      return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const donationId = session.metadata?.donationId;
    if (donationId) {
      await prisma.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
