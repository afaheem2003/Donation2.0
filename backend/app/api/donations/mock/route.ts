import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import { DonationReceiptEmail } from "@/emails/DonationReceiptEmail";

const schema = z.object({
  nonprofitId: z.string(),
  amountCents: z.number().int().min(100),
});

export async function POST(req: NextRequest) {
  // This endpoint creates succeeded donations without a real Stripe charge.
  // Gated by both NODE_ENV and an explicit env flag — NODE_ENV alone is not
  // reliable across all deployment environments (staging, preview, self-hosted).
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_MOCK_DONATIONS !== "true"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  const now = new Date();
  const taxYear = now.getFullYear();

  const donation = await prisma.donation.create({
    data: {
      userId: session.user.id,
      nonprofitId,
      amountCents,
      currency: "usd",
      status: "SUCCEEDED",
      donatedAt: now,
      receipt: {
        create: {
          receiptNumber: `MOCK-${Date.now()}`,
          taxYear,
          legalText: `${nonprofit.name} is a 501(c)(3) nonprofit organization. Your contribution of $${(amountCents / 100).toFixed(2)} is tax-deductible to the extent allowed by law. No goods or services were provided in exchange for this contribution.`,
          issuedAt: now,
        },
      },
    },
  });

  // Send receipt email (non-blocking)
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `Your donation receipt — ${nonprofit.name}`,
        react: React.createElement(DonationReceiptEmail, {
          donorName: user.name ?? "Generous Donor",
          nonprofitName: nonprofit.name,
          nonprofitEin: nonprofit.ein,
          amountCents,
          donatedAt: now,
          receiptNumber: `MOCK-${Date.now()}`,
          taxYear,
        }),
      });
    }
  } catch (emailErr) {
    console.error("Mock donation receipt email failed:", emailErr);
  }

  return NextResponse.json({ donationId: donation.id }, { status: 201 });
}
