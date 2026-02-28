import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nonprofitId: z.string(),
  amountCents: z.number().int().min(100),
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

  return NextResponse.json({ donationId: donation.id }, { status: 201 });
}
