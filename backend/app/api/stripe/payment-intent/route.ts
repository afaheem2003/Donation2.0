import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  nonprofitId: z.string(),
  amountCents: z.number().int().min(100).max(1_000_000_00), // $1 – $1,000,000
  preferredMethod: z.enum(["card", "apple_pay", "us_bank_account"]).optional(),
});

export async function POST(req: NextRequest) {
  // Auth is optional — guests can donate too
  const session = await getSession(req);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { nonprofitId, amountCents, preferredMethod } = parsed.data;

  const nonprofit = await prisma.nonprofit.findUnique({
    where: { id: nonprofitId },
    select: { id: true, name: true, ein: true },
  });
  if (!nonprofit) {
    return NextResponse.json({ error: "Nonprofit not found" }, { status: 404 });
  }

  // Create pending donation — userId is null for guests
  const donation = await prisma.donation.create({
    data: {
      userId: session?.user?.id ?? null,
      nonprofitId,
      amountCents,
      currency: "usd",
      status: "PENDING",
    },
  });

  // Order payment methods by what the user selected so the sheet surfaces
  // that method first. "apple_pay" and "card" both map to the "card" type
  // (Apple Pay is a card wallet shown automatically on supported devices).
  const methodTypes: string[] =
    preferredMethod === "us_bank_account"
      ? ["us_bank_account", "card"]
      : ["card", "us_bank_account"];

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method_types: methodTypes,
    description: `Donation to ${nonprofit.name} (EIN: ${nonprofit.ein})`,
    metadata: {
      donationId: donation.id,
      nonprofitId,
      userId: session?.user?.id ?? "guest",
    },
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return NextResponse.json({
    paymentIntent: paymentIntent.client_secret,
    donationId: donation.id,
  });
}
