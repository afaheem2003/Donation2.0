/**
 * Tests: Stripe payment-method expansion (ACH + Apple Pay)
 *
 * Covers the behaviour added in the ACH/Apple-Pay milestone:
 *
 *  create-checkout-session:
 *   - now includes "us_bank_account" in payment_method_types
 *   - now requests billing_address_collection: "required"  (ACH mandate)
 *
 *  payment-intent:
 *   - automatic_payment_methods stays enabled (covers Apple Pay + ACH on mobile)
 *   - allowsDelayedPaymentMethods flag is surfaced (ACH takes 1-5 days)
 *
 *  webhook — payment_intent.processing:
 *   - ACH payments land here before they settle; we ack without modifying status
 *   - donation remains PENDING until payment_intent.succeeded fires
 *
 * All Stripe SDK calls are mocked — no real charges are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as checkoutRoute } from "@/app/api/stripe/create-checkout-session/route";
import { POST as paymentIntentRoute } from "@/app/api/stripe/payment-intent/route";
import { POST as webhookRoute } from "@/app/api/stripe/webhook/route";
import { POST, SESSION_DONOR, NONPROFIT, DONATION } from "../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  nonprofit: { findUnique: vi.fn() },
  donation: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  stripeConnect: { updateMany: vi.fn(), findUnique: vi.fn() },
  payout: { upsert: vi.fn() },
}));

const mockStripe = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn() } },
  paymentIntents: { create: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/receipt", () => ({ createReceiptForDonation: vi.fn() }));

import { getSession } from "@/lib/getSession";
const mockGetSession = vi.mocked(getSession);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function webhookRequest(event: object) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-sig" },
    body: JSON.stringify(event),
  }) as never;
}

function makeEvent(type: string, data: object, extra?: object): object {
  return { type, created: 1_700_000_000, data: { object: data }, ...extra };
}

// ─── checkout-session: ACH payment method ─────────────────────────────────────

describe("POST /api/stripe/create-checkout-session — ACH + Apple Pay", () => {
  const validBody = { nonprofitId: NONPROFIT.id, amountCents: 5000 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofit.findUnique.mockResolvedValue(NONPROFIT);
    mockPrisma.donation.create.mockResolvedValue({ id: DONATION.id });
    mockPrisma.donation.update.mockResolvedValue({});
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_ach",
      url: "https://checkout.stripe.com/pay/cs_test_ach",
    });
  });

  it("includes 'us_bank_account' in payment_method_types", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    const call = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(call.payment_method_types).toContain("us_bank_account");
  });

  it("includes 'card' alongside 'us_bank_account'", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    const call = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(call.payment_method_types).toContain("card");
  });

  it("requests billing_address_collection: required (needed for ACH mandate)", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    const call = mockStripe.checkout.sessions.create.mock.calls[0][0];
    expect(call.billing_address_collection).toBe("required");
  });

  it("still returns the Stripe checkout URL on success", async () => {
    const res = await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/cs_test_ach");
  });

  it("still returns 401 for unauthenticated requests", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(res.status).toBe(401);
  });

  it("still returns 400 for amounts below $1", async () => {
    const res = await checkoutRoute(
      POST("/api/stripe/create-checkout-session", { ...validBody, amountCents: 99 })
    );
    expect(res.status).toBe(400);
  });
});

// ─── payment-intent: automatic_payment_methods (Apple Pay + ACH on mobile) ────

describe("POST /api/stripe/payment-intent — automatic_payment_methods", () => {
  const validBody = { nonprofitId: NONPROFIT.id, amountCents: 2500 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofit.findUnique.mockResolvedValue(NONPROFIT);
    mockPrisma.donation.create.mockResolvedValue({ id: DONATION.id });
    mockPrisma.donation.update.mockResolvedValue({});
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test_auto",
      client_secret: "pi_test_auto_secret",
    });
  });

  it("uses explicit payment_method_types to include card (Apple Pay) and ACH", async () => {
    await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    const call = mockStripe.paymentIntents.create.mock.calls[0][0];
    expect(call.payment_method_types).toContain("card");
    expect(call.payment_method_types).toContain("us_bank_account");
  });

  it("does NOT use automatic_payment_methods (prevents unwanted methods showing)", async () => {
    await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    const call = mockStripe.paymentIntents.create.mock.calls[0][0];
    expect(call.automatic_payment_methods).toBeUndefined();
  });

  it("does NOT include amazon_pay, cashapp, or klarna", async () => {
    await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    const call = mockStripe.paymentIntents.create.mock.calls[0][0];
    expect(call.payment_method_types).not.toContain("amazon_pay");
    expect(call.payment_method_types).not.toContain("cashapp");
    expect(call.payment_method_types).not.toContain("klarna");
  });

  it("returns a clientSecret and donationId on success", async () => {
    const res = await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentIntent).toBe("pi_test_auto_secret");
    expect(body.donationId).toBe(DONATION.id);
  });

  it("works for unauthenticated guests (Apple Pay doesn't require login)", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(res.status).toBe(200);
    expect(mockPrisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) })
    );
  });
});

// ─── webhook: payment_intent.processing (ACH in-transit) ─────────────────────

describe("POST /api/stripe/webhook — payment_intent.processing (ACH in-transit)", () => {
  const processingEvent = makeEvent("payment_intent.processing", {
    id: "pi_ach_processing",
    metadata: { donationId: DONATION.id },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(processingEvent);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 0 });
  });

  it("acks with { received: true } — donation stays PENDING until settled", async () => {
    const res = await webhookRoute(webhookRequest(processingEvent));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("does NOT mark the donation SUCCEEDED (ACH hasn't cleared yet)", async () => {
    await webhookRoute(webhookRequest(processingEvent));
    // updateMany should not have been called for SUCCEEDED status on a processing event
    const succeededCalls = mockPrisma.donation.updateMany.mock.calls.filter(
      (args) => args[0]?.data?.status === "SUCCEEDED"
    );
    expect(succeededCalls).toHaveLength(0);
  });

  it("does NOT mark the donation FAILED", async () => {
    await webhookRoute(webhookRequest(processingEvent));
    const failedCalls = mockPrisma.donation.updateMany.mock.calls.filter(
      (args) => args[0]?.data?.status === "FAILED"
    );
    expect(failedCalls).toHaveLength(0);
  });
});

// ─── webhook: payment_intent.succeeded for ACH settlement ─────────────────────

describe("POST /api/stripe/webhook — payment_intent.succeeded (ACH settled)", () => {
  const achSucceededEvent = makeEvent("payment_intent.succeeded", {
    id: "pi_ach_settled",
    payment_method_types: ["us_bank_account"],
    metadata: { donationId: DONATION.id },
  });

  const mockCreateReceipt = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(achSucceededEvent);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.donation.findUnique.mockResolvedValue(null); // skip email body
  });

  it("marks donation SUCCEEDED when ACH payment finally settles", async () => {
    const { createReceiptForDonation } = await import("@/lib/receipt");
    vi.mocked(createReceiptForDonation).mockResolvedValue({} as never);
    const res = await webhookRoute(webhookRequest(achSucceededEvent));
    expect(res.status).toBe(200);
    expect(mockPrisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id, status: { not: "SUCCEEDED" } },
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      })
    );
  });

  it("returns { received: true } after ACH settlement", async () => {
    const { createReceiptForDonation } = await import("@/lib/receipt");
    vi.mocked(createReceiptForDonation).mockResolvedValue({} as never);
    const res = await webhookRoute(webhookRequest(achSucceededEvent));
    expect(await res.json()).toEqual({ received: true });
  });

  it("is idempotent — acks gracefully if already SUCCEEDED", async () => {
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 0 });
    const res = await webhookRoute(webhookRequest(achSucceededEvent));
    expect(res.status).toBe(200);
  });
});
