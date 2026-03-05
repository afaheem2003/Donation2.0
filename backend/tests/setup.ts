/**
 * Shared test helpers and fixture factories used across all test files.
 */
import { NextRequest } from "next/server";

// ─── Request Factory ──────────────────────────────────────────────────────────

export function makeRequest(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const url = new URL(`http://localhost:3001${path}`);
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), {
    method,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export const GET = (path: string, opts?: { searchParams?: Record<string, string>; headers?: Record<string, string> }) =>
  makeRequest("GET", path, opts);

export const POST = (path: string, body?: unknown, headers?: Record<string, string>) =>
  makeRequest("POST", path, { body, headers });

export const PATCH = (path: string, body?: unknown) =>
  makeRequest("PATCH", path, { body });

export const DELETE = (path: string) =>
  makeRequest("DELETE", path);

// ─── Route Params ─────────────────────────────────────────────────────────────

/** Wraps a param value in a Promise to match Next.js 15 dynamic route signature */
export function routeParams<T extends Record<string, string>>(
  p: T
): { params: Promise<T> } {
  return { params: Promise.resolve(p) };
}

// ─── Session Fixtures ─────────────────────────────────────────────────────────

export const SESSION_DONOR = {
  user: {
    id: "user-donor-1",
    name: "Sarah Chen",
    email: "sarah@example.com",
    username: "sarah",
    role: "DONOR",
    usernameSet: true,
    hasNonprofitAccess: false,
  },
};

export const SESSION_ADMIN = {
  user: {
    ...SESSION_DONOR.user,
    id: "user-admin-1",
    email: "admin@example.com",
    role: "PLATFORM_ADMIN",
  },
};

export const SESSION_PORTAL = {
  session: SESSION_DONOR,
  adminRole: "OWNER" as const,
};

// ─── DB Fixtures ──────────────────────────────────────────────────────────────

export const NONPROFIT = {
  id: "np-1",
  name: "Doctors Without Borders USA",
  ein: "13-3433452",
  description: "International medical humanitarian organization.",
  category: "HEALTH",
  logoUrl: null,
  website: "https://www.doctorswithoutborders.org",
  verified: true,
  createdAt: new Date("2024-01-01"),
};

export const DONATION = {
  id: "don-1",
  userId: SESSION_DONOR.user.id,
  nonprofitId: NONPROFIT.id,
  amountCents: 5000,
  currency: "usd",
  status: "SUCCEEDED",
  donatedAt: new Date("2025-06-15"),
  stripePaymentIntentId: "pi_test_123",
  nonprofit: NONPROFIT,
};

export const RECEIPT = {
  id: "rcpt-1",
  donationId: DONATION.id,
  receiptNumber: "RCT-2025-ABCD1234",
  taxYear: 2025,
  legalText: "This is a valid legal receipt.",
  issuedAt: new Date("2025-06-15"),
};
