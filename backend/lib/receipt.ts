import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `RCT-${year}-${random}`;
}

export function buildLegalText(params: {
  nonprofitName: string;
  ein: string;
  amountCents: number;
  donatedAt: Date;
}): string {
  const { nonprofitName, ein, amountCents, donatedAt } = params;
  const amount = (amountCents / 100).toFixed(2);
  const dateStr = donatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    `This letter serves as your official donation receipt. ` +
    `${nonprofitName} (EIN: ${ein}) is a nonprofit organization exempt from federal income tax under Section 501(c)(3). ` +
    `On ${dateStr}, you made a charitable contribution of $${amount} USD. ` +
    `No goods or services were provided in exchange for this contribution. ` +
    `Please retain this receipt for your tax records.`
  );
}

export async function createReceiptForDonation(donationId: string) {
  const donation = await prisma.donation.findUniqueOrThrow({
    where: { id: donationId },
    include: { nonprofit: true },
  });

  const donatedAt = donation.donatedAt ?? new Date();
  const legalText = buildLegalText({
    nonprofitName: donation.nonprofit.name,
    ein: donation.nonprofit.ein,
    amountCents: donation.amountCents,
    donatedAt,
  });

  // upsert so webhook retries after a transient failure do not throw a
  // unique-constraint error on the already-existing receipt row.
  return prisma.receipt.upsert({
    where: { donationId },
    create: {
      donationId,
      receiptNumber: generateReceiptNumber(),
      taxYear: donatedAt.getFullYear(),
      legalText,
      issuedAt: new Date(),
    },
    update: {}, // no-op on retry
  });
}
