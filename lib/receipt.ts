import { prisma } from "@/lib/prisma";

export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
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

  return prisma.receipt.create({
    data: {
      donationId,
      receiptNumber: generateReceiptNumber(),
      taxYear: donatedAt.getFullYear(),
      legalText,
      issuedAt: new Date(),
    },
  });
}
