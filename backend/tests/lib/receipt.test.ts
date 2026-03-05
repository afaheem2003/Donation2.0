/**
 * Tests: lib/receipt.ts
 *
 * Covers the pure helper functions (generateReceiptNumber, buildLegalText)
 * and the DB-backed createReceiptForDonation with a mocked Prisma client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReceiptNumber, buildLegalText } from "@/lib/receipt";
import { NONPROFIT, DONATION } from "../setup";

// ─── generateReceiptNumber ────────────────────────────────────────────────────

describe("generateReceiptNumber()", () => {
  it("returns a string in RCT-YYYY-XXXXXXXX format", () => {
    const rn = generateReceiptNumber();
    expect(rn).toMatch(/^RCT-\d{4}-[A-F0-9]{8}$/);
  });

  it("includes the current calendar year", () => {
    const rn = generateReceiptNumber();
    expect(rn).toContain(`RCT-${new Date().getFullYear()}-`);
  });

  it("produces a different number on each call (random suffix)", () => {
    const numbers = new Set(Array.from({ length: 20 }, generateReceiptNumber));
    expect(numbers.size).toBeGreaterThan(1);
  });

  it("hex portion is exactly 8 uppercase characters", () => {
    const [, , hex] = generateReceiptNumber().split("-");
    expect(hex).toHaveLength(8);
    expect(hex).toMatch(/^[A-F0-9]+$/);
  });
});

// ─── buildLegalText ───────────────────────────────────────────────────────────

describe("buildLegalText()", () => {
  const params = {
    nonprofitName: NONPROFIT.name,
    ein: NONPROFIT.ein,
    amountCents: 5000,
    donatedAt: new Date(2025, 5, 15), // local date (months 0-indexed); avoids UTC-midnight timezone shift
  };

  it("includes the nonprofit name", () => {
    expect(buildLegalText(params)).toContain(NONPROFIT.name);
  });

  it("includes the EIN", () => {
    expect(buildLegalText(params)).toContain(NONPROFIT.ein);
  });

  it("formats the amount as dollars (cents ÷ 100, 2 decimal places)", () => {
    expect(buildLegalText(params)).toContain("$50.00");
  });

  it("formats the donation date as a long date string", () => {
    expect(buildLegalText(params)).toContain("June 15, 2025");
  });

  it("includes the '501(c)(3)' tax-exempt classification", () => {
    expect(buildLegalText(params)).toContain("501(c)(3)");
  });

  it("states no goods or services were provided", () => {
    expect(buildLegalText(params)).toContain(
      "No goods or services were provided"
    );
  });

  it("handles $1.00 (100 cents) correctly", () => {
    expect(buildLegalText({ ...params, amountCents: 100 })).toContain("$1.00");
  });

  it("handles $1,000.00 (100000 cents) correctly", () => {
    expect(buildLegalText({ ...params, amountCents: 100_000 })).toContain(
      "$1000.00"
    );
  });
});

// ─── createReceiptForDonation ─────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  donation: {
    findUniqueOrThrow: vi.fn(),
  },
  receipt: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("createReceiptForDonation()", () => {
  // Dynamic import deferred into beforeAll so it picks up the vi.mock above
  let createReceiptForDonation: (id: string) => Promise<unknown>;
  beforeAll(async () => {
    ({ createReceiptForDonation } = await import("@/lib/receipt"));
  });

  const mockDonation = {
    ...DONATION,
    nonprofit: NONPROFIT,
    donatedAt: new Date("2025-06-15"),
  };

  const mockReceipt = {
    id: "rcpt-1",
    donationId: DONATION.id,
    receiptNumber: "RCT-2025-ABCD1234",
    taxYear: 2025,
    legalText: "...",
    issuedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.donation.findUniqueOrThrow.mockResolvedValue(mockDonation);
    mockPrisma.receipt.upsert.mockResolvedValue(mockReceipt);
  });

  it("looks up the donation by ID", async () => {
    await createReceiptForDonation(DONATION.id);
    expect(mockPrisma.donation.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DONATION.id } })
    );
  });

  it("upserts a receipt (idempotent — safe to retry)", async () => {
    await createReceiptForDonation(DONATION.id);
    expect(mockPrisma.receipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { donationId: DONATION.id },
        update: {}, // no-op on retry
      })
    );
  });

  it("sets the tax year from the donation date", async () => {
    await createReceiptForDonation(DONATION.id);
    const call = mockPrisma.receipt.upsert.mock.calls[0][0];
    expect(call.create.taxYear).toBe(2025);
  });

  it("generates a unique receipt number in the correct format", async () => {
    await createReceiptForDonation(DONATION.id);
    const call = mockPrisma.receipt.upsert.mock.calls[0][0];
    expect(call.create.receiptNumber).toMatch(/^RCT-\d{4}-[A-F0-9]{8}$/);
  });

  it("uses current date when donation.donatedAt is null", async () => {
    const before = Date.now();
    mockPrisma.donation.findUniqueOrThrow.mockResolvedValue({
      ...mockDonation,
      donatedAt: null,
    });
    await createReceiptForDonation(DONATION.id);
    const call = mockPrisma.receipt.upsert.mock.calls[0][0];
    expect(call.create.taxYear).toBe(new Date().getFullYear());
    expect(call.create.issuedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("returns the result from prisma.receipt.upsert", async () => {
    const result = await createReceiptForDonation(DONATION.id);
    expect(result).toEqual(mockReceipt);
  });
});
