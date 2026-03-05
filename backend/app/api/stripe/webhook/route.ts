import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createReceiptForDonation } from "@/lib/receipt";
import type Stripe from "stripe";
import type { StripeConnectStatus, PayoutStatus } from "@prisma/client";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { DonationReceiptEmail } from "@/emails/DonationReceiptEmail";

async function sendReceiptEmail(donationId: string): Promise<void> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: {
      amountCents: true,
      donatedAt: true,
      user: { select: { name: true, email: true } },
      nonprofit: { select: { name: true, ein: true } },
      receipt: { select: { receiptNumber: true, taxYear: true } },
    },
  });
  if (!donation?.user?.email || !donation.receipt) return;
  await sendEmail({
    to: donation.user.email,
    subject: `Your donation receipt — ${donation.nonprofit.name}`,
    react: React.createElement(DonationReceiptEmail, {
      donorName: donation.user.name ?? "Generous Donor",
      nonprofitName: donation.nonprofit.name,
      nonprofitEin: donation.nonprofit.ein,
      amountCents: donation.amountCents,
      donatedAt: donation.donatedAt ?? new Date(),
      receiptNumber: donation.receipt.receiptNumber,
      taxYear: donation.receipt.taxYear,
    }),
  });
}

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
      // Atomic conditional update — prevents TOCTOU race on concurrent deliveries.
      // updateMany returns { count: 0 } if the donation is already SUCCEEDED.
      const result = await prisma.donation.updateMany({
        where: { id: donationId, status: { not: "SUCCEEDED" } },
        data: {
          status: "SUCCEEDED",
          stripePaymentIntentId: session.payment_intent as string,
          donatedAt: new Date(event.created * 1000),
        },
      });

      if (result.count === 0) {
        // Already processed by a prior webhook delivery — safe to ack
        return NextResponse.json({ received: true });
      }

      // Create receipt — isolated so a receipt failure doesn't cause Stripe
      // to retry the webhook and double-process the donation.
      try {
        await createReceiptForDonation(donationId);
        console.log(`Donation ${donationId} succeeded, receipt created`);
      } catch (receiptErr) {
        console.error(`Receipt creation failed for donation ${donationId}:`, receiptErr);
      }

      // After createReceiptForDonation succeeds, send receipt email
      try {
        await sendReceiptEmail(donationId);
      } catch (emailErr) {
        console.error(`Receipt email failed for donation ${donationId}:`, emailErr);
      }
    } catch (err) {
      console.error("Error processing webhook:", err);
      return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
  }

  // Payment Sheet flow (mobile native)
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const donationId = pi.metadata?.donationId;
    if (donationId) {
      try {
        const result = await prisma.donation.updateMany({
          where: { id: donationId, status: { not: "SUCCEEDED" } },
          data: { status: "SUCCEEDED", donatedAt: new Date(event.created * 1000) },
        });
        if (result.count > 0) {
          try {
            await createReceiptForDonation(donationId);
          } catch (receiptErr) {
            console.error(`Receipt creation failed for donation ${donationId}:`, receiptErr);
          }

          // After createReceiptForDonation succeeds, send receipt email
          try {
            await sendReceiptEmail(donationId);
          } catch (emailErr) {
            console.error(`Receipt email failed for donation ${donationId}:`, emailErr);
          }
        }
      } catch (err) {
        console.error("Error processing payment_intent.succeeded:", err);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const donationId = session.metadata?.donationId;
    if (donationId) {
      await prisma.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const donationId = pi.metadata?.donationId;
    if (donationId) {
      await prisma.donation.updateMany({
        where: { id: donationId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const nonprofitId = account.metadata?.nonprofitId;
    if (nonprofitId) {
      const status: StripeConnectStatus = account.details_submitted
        ? account.charges_enabled ? "ACTIVE" : "RESTRICTED"
        : "PENDING_VERIFICATION";
      await prisma.stripeConnect.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          status,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
          connectedAt: status === "ACTIVE" ? new Date() : undefined,
        },
      });
    }
  }

  const payoutEvents = ["payout.created", "payout.paid", "payout.failed", "payout.canceled"];
  if (payoutEvents.includes(event.type)) {
    const payout = event.data.object as Stripe.Payout;
    const connectAccountId = (event as { account?: string }).account;
    if (connectAccountId) {
      const connect = await prisma.stripeConnect.findUnique({
        where: { stripeAccountId: connectAccountId },
      });
      if (connect) {
        const statusMap: Record<string, PayoutStatus> = {
          "payout.created": "PENDING",
          "payout.paid": "PAID",
          "payout.failed": "FAILED",
          "payout.canceled": "CANCELED",
        };
        await prisma.payout.upsert({
          where: { stripePayoutId: payout.id },
          create: {
            stripeConnectId: connect.id,
            nonprofitId: connect.nonprofitId,
            stripePayoutId: payout.id,
            amountCents: payout.amount,
            currency: payout.currency,
            status: statusMap[event.type] ?? "PENDING",
            arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null,
            description: payout.description ?? null,
          },
          update: {
            status: statusMap[event.type] ?? "PENDING",
            failureMessage: (payout as { failure_message?: string }).failure_message ?? null,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
