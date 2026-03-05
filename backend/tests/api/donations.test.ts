/**
 * Tests: Donation & Stripe API routes
 *
 * Covers:
 *  - POST /api/stripe/create-checkout-session
 *  - POST /api/stripe/payment-intent
 *  - POST /api/stripe/webhook
 *      checkout.session.completed   — happy path, idempotency, no donationId
 *      payment_intent.succeeded     — happy path, idempotency
 *      checkout.session.expired     — marks FAILED
 *      payment_intent.payment_failed — marks FAILED
 *      account.updated              — syncs StripeConnect status
 *      payout.*                     — upserts Payout record
 *
 * Key business rules:
 *   - Webhook uses updateMany({ where: { status: { not: "SUCCEEDED" } } })
 *     to prevent double-processing (idempotency guard).
 *   - Missing stripe-signature → 400 (never even attempts construction).
 *   - Receipt creation failure must NOT prevent 200 ack.
 *   - Receipt email failure must NOT prevent 200 ack.
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
  stripeConnect: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  payout: { upsert: vi.fn() },
}));

const mockStripe = vi.hoisted(() => ({
  checkout: {
    sessions: { create: vi.fn() },
  },
  paymentIntents: { create: vi.fn() },
  webhooks: {
    constructEvent: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/getSession", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/receipt", () => ({ createReceiptForDonation: vi.fn() }));

import { getSession } from "@/lib/getSession";
import { createReceiptForDonation } from "@/lib/receipt";
const mockGetSession = vi.mocked(getSession);
const mockCreateReceipt = vi.mocked(createReceiptForDonation);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a fake Stripe webhook request with a stripe-signature header. */
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

// ─── POST /api/stripe/create-checkout-session ─────────────────────────────────

describe("POST /api/stripe/create-checkout-session", () => {
  const validBody = { nonprofitId: NONPROFIT.id, amountCents: 5000 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofit.findUnique.mockResolvedValue(NONPROFIT);
    mockPrisma.donation.create.mockResolvedValue({ id: DONATION.id });
    mockPrisma.donation.update.mockResolvedValue({});
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_abc",
      url: "https://checkout.stripe.com/pay/cs_test_abc",
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when amountCents is below $1 (100 cents)", async () => {
    const res = await checkoutRoute(
      POST("/api/stripe/create-checkout-session", { ...validBody, amountCents: 50 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when nonprofitId is missing", async () => {
    const res = await checkoutRoute(
      POST("/api/stripe/create-checkout-session", { amountCents: 5000 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the nonprofit does not exist", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);
    const res = await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(res.status).toBe(404);
  });

  it("creates a PENDING donation before calling Stripe", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(mockPrisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          amountCents: 5000,
          nonprofitId: NONPROFIT.id,
          userId: SESSION_DONOR.user.id,
        }),
      })
    );
  });

  it("creates a Stripe checkout session with the correct amount", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 5000 }),
          }),
        ]),
        metadata: expect.objectContaining({ donationId: DONATION.id }),
      })
    );
  });

  it("stores the Stripe session ID on the donation after creation", async () => {
    await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(mockPrisma.donation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id },
        data: expect.objectContaining({ stripeCheckoutSessionId: "cs_test_abc" }),
      })
    );
  });

  it("returns the Stripe checkout URL", async () => {
    const res = await checkoutRoute(POST("/api/stripe/create-checkout-session", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/pay/cs_test_abc");
  });
});

// ─── POST /api/stripe/payment-intent ─────────────────────────────────────────

describe("POST /api/stripe/payment-intent", () => {
  const validBody = { nonprofitId: NONPROFIT.id, amountCents: 2500 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(SESSION_DONOR);
    mockPrisma.nonprofit.findUnique.mockResolvedValue(NONPROFIT);
    mockPrisma.donation.create.mockResolvedValue({ id: DONATION.id });
    mockPrisma.donation.update.mockResolvedValue({});
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_test_123_secret_abc",
    });
  });

  it("returns 400 when amountCents is missing", async () => {
    const res = await paymentIntentRoute(
      POST("/api/stripe/payment-intent", { nonprofitId: NONPROFIT.id })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is below minimum ($1)", async () => {
    const res = await paymentIntentRoute(
      POST("/api/stripe/payment-intent", { ...validBody, amountCents: 99 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the nonprofit does not exist", async () => {
    mockPrisma.nonprofit.findUnique.mockResolvedValue(null);
    const res = await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(res.status).toBe(404);
  });

  it("works for unauthenticated guests (userId is null)", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(res.status).toBe(200);
    expect(mockPrisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null }),
      })
    );
  });

  it("returns clientSecret and donationId on success", async () => {
    const res = await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentIntent).toBe("pi_test_123_secret_abc");
    expect(body.donationId).toBe(DONATION.id);
  });

  it("stores the paymentIntent ID on the donation", async () => {
    await paymentIntentRoute(POST("/api/stripe/payment-intent", validBody));
    expect(mockPrisma.donation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id },
        data: { stripePaymentIntentId: "pi_test_123" },
      })
    );
  });
});

// ─── POST /api/stripe/webhook ─────────────────────────────────────────────────

describe("POST /api/stripe/webhook — signature validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when the stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    }) as never;
    const res = await webhookRoute(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing stripe-signature" });
  });

  it("returns 400 when signature verification fails", async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await webhookRoute(webhookRequest({ type: "checkout.session.completed" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("signature") });
  });
});

describe("POST /api/stripe/webhook — checkout.session.completed", () => {
  const event = makeEvent("checkout.session.completed", {
    payment_intent: "pi_test_999",
    metadata: { donationId: DONATION.id },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 1 });
    mockCreateReceipt.mockResolvedValue({} as never);
  });

  it("marks the donation as SUCCEEDED with the correct paymentIntentId", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id, status: { not: "SUCCEEDED" } },
        data: expect.objectContaining({ status: "SUCCEEDED", stripePaymentIntentId: "pi_test_999" }),
      })
    );
  });

  it("calls createReceiptForDonation after marking succeeded", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockCreateReceipt).toHaveBeenCalledWith(DONATION.id);
  });

  it("returns { received: true } on success", async () => {
    const res = await webhookRoute(webhookRequest(event));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("skips receipt creation when updateMany returns count=0 (already processed)", async () => {
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 0 });
    const res = await webhookRoute(webhookRequest(event));
    expect(res.status).toBe(200);
    expect(mockCreateReceipt).not.toHaveBeenCalled();
  });

  it("still returns { received: true } if receipt creation throws", async () => {
    mockCreateReceipt.mockRejectedValueOnce(new Error("DB failure"));
    const res = await webhookRoute(webhookRequest(event));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it("still returns { received: true } if receipt email throws", async () => {
    const { sendEmail } = await import("@/lib/email");
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP failure"));
    mockPrisma.donation.findUnique.mockResolvedValue(null); // skip email body
    const res = await webhookRoute(webhookRequest(event));
    expect(res.status).toBe(200);
  });

  it("acks gracefully when metadata has no donationId", async () => {
    const noIdEvent = makeEvent("checkout.session.completed", {
      payment_intent: "pi_test_999",
      metadata: {},
    });
    mockStripe.webhooks.constructEvent.mockReturnValue(noIdEvent);
    const res = await webhookRoute(webhookRequest(noIdEvent));
    expect(res.status).toBe(200);
    expect(mockPrisma.donation.updateMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — payment_intent.succeeded", () => {
  const event = makeEvent("payment_intent.succeeded", {
    id: "pi_test_555",
    metadata: { donationId: DONATION.id },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 1 });
    mockCreateReceipt.mockResolvedValue({} as never);
  });

  it("marks the donation SUCCEEDED (no paymentIntent override needed for PI flow)", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id, status: { not: "SUCCEEDED" } },
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      })
    );
  });

  it("creates a receipt when count > 0", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockCreateReceipt).toHaveBeenCalledWith(DONATION.id);
  });

  it("skips receipt when donation was already SUCCEEDED (count=0)", async () => {
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 0 });
    await webhookRoute(webhookRequest(event));
    expect(mockCreateReceipt).not.toHaveBeenCalled();
  });

  it("returns { received: true }", async () => {
    const res = await webhookRoute(webhookRequest(event));
    expect(await res.json()).toEqual({ received: true });
  });
});

describe("POST /api/stripe/webhook — checkout.session.expired", () => {
  const event = makeEvent("checkout.session.expired", {
    metadata: { donationId: DONATION.id },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks the PENDING donation as FAILED", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id, status: "PENDING" },
        data: { status: "FAILED" },
      })
    );
  });

  it("returns { received: true }", async () => {
    const res = await webhookRoute(webhookRequest(event));
    expect(await res.json()).toEqual({ received: true });
  });
});

describe("POST /api/stripe/webhook — payment_intent.payment_failed", () => {
  const event = makeEvent("payment_intent.payment_failed", {
    id: "pi_fail_1",
    metadata: { donationId: DONATION.id },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockPrisma.donation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("marks the PENDING donation as FAILED", async () => {
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DONATION.id, status: "PENDING" },
        data: { status: "FAILED" },
      })
    );
  });
});

describe("POST /api/stripe/webhook — account.updated", () => {
  const activeAccount = {
    id: "acct_123",
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    metadata: { nonprofitId: NONPROFIT.id },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.stripeConnect.updateMany.mockResolvedValue({ count: 1 });
  });

  it("sets status ACTIVE when details submitted and charges enabled", async () => {
    const event = makeEvent("account.updated", activeAccount);
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.stripeConnect.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeAccountId: "acct_123" },
        data: expect.objectContaining({ status: "ACTIVE", chargesEnabled: true }),
      })
    );
  });

  it("sets status RESTRICTED when details submitted but charges NOT enabled", async () => {
    const event = makeEvent("account.updated", {
      ...activeAccount,
      charges_enabled: false,
    });
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.stripeConnect.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RESTRICTED" }),
      })
    );
  });

  it("sets status PENDING_VERIFICATION when details not yet submitted", async () => {
    const event = makeEvent("account.updated", {
      ...activeAccount,
      details_submitted: false,
      charges_enabled: false,
    });
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.stripeConnect.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_VERIFICATION" }),
      })
    );
  });
});

describe("POST /api/stripe/webhook — payout events", () => {
  const mockConnect = { id: "sc-1", nonprofitId: NONPROFIT.id };
  const payout = {
    id: "po_test_1",
    amount: 10000,
    currency: "usd",
    arrival_date: 1_700_100_000,
    description: "Stripe payout",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.stripeConnect.findUnique.mockResolvedValue(mockConnect);
    mockPrisma.payout.upsert.mockResolvedValue({});
  });

  it.each(["payout.created", "payout.paid", "payout.failed", "payout.canceled"])(
    "upserts a Payout record on %s",
    async (eventType) => {
      const event = { ...makeEvent(eventType, payout), account: "acct_abc" };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      await webhookRoute(webhookRequest(event));
      expect(mockPrisma.payout.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripePayoutId: "po_test_1" } })
      );
    }
  );

  it("maps payout.paid to PAID status", async () => {
    const event = { ...makeEvent("payout.paid", payout), account: "acct_abc" };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.payout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "PAID" }),
      })
    );
  });

  it("skips payout upsert when no stripeConnect record found for the account", async () => {
    mockPrisma.stripeConnect.findUnique.mockResolvedValue(null);
    const event = { ...makeEvent("payout.created", payout), account: "acct_abc" };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    await webhookRoute(webhookRequest(event));
    expect(mockPrisma.payout.upsert).not.toHaveBeenCalled();
  });
});
