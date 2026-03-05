/**
 * Tests: lib/rateLimit.ts
 *
 * Pure sliding-window rate limiter — no mocks needed.
 * Uses fake timers to control the passage of time.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Fresh import each test group by using dynamic imports after clearing module cache.
// Since the store is module-level, we re-import to reset it between describes.

describe("rateLimit — basic allow / deny", () => {
  let rateLimit: (key: string, limit: number, windowMs?: number) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const mod = await import("@/lib/rateLimit");
    rateLimit = mod.rateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    expect(rateLimit("key:1", 5)).toBe(true);
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("key:2", 5)).toBe(true);
    }
  });

  it("denies the request that exceeds the limit", () => {
    for (let i = 0; i < 5; i++) rateLimit("key:3", 5);
    expect(rateLimit("key:3", 5)).toBe(false);
  });

  it("continues denying requests after limit is hit", () => {
    for (let i = 0; i < 5; i++) rateLimit("key:4", 5);
    expect(rateLimit("key:4", 5)).toBe(false);
    expect(rateLimit("key:4", 5)).toBe(false);
  });
});

describe("rateLimit — window expiry (time-based)", () => {
  let rateLimit: (key: string, limit: number, windowMs?: number) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const mod = await import("@/lib/rateLimit");
    rateLimit = mod.rateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests again after the window expires", () => {
    for (let i = 0; i < 3; i++) rateLimit("expiry:1", 3, 1000);
    expect(rateLimit("expiry:1", 3, 1000)).toBe(false);

    // Advance past the 1-second window
    vi.advanceTimersByTime(1001);
    expect(rateLimit("expiry:1", 3, 1000)).toBe(true);
  });

  it("only counts requests within the window, not older ones", () => {
    rateLimit("expiry:2", 3, 2000); // t=0
    rateLimit("expiry:2", 3, 2000); // t=0
    vi.advanceTimersByTime(1500);
    rateLimit("expiry:2", 3, 2000); // t=1500 — 3rd request, at limit
    expect(rateLimit("expiry:2", 3, 2000)).toBe(false); // t=1500 — denied

    vi.advanceTimersByTime(600); // t=2100 — first two requests (t=0) are now outside window
    expect(rateLimit("expiry:2", 3, 2000)).toBe(true);
  });
});

describe("rateLimit — key isolation", () => {
  let rateLimit: (key: string, limit: number, windowMs?: number) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const mod = await import("@/lib/rateLimit");
    rateLimit = mod.rateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) rateLimit("user:alice", 5);
    expect(rateLimit("user:alice", 5)).toBe(false); // alice is blocked
    expect(rateLimit("user:bob", 5)).toBe(true);    // bob is unaffected
  });

  it("a per-user key isolates limits by user ID", () => {
    for (let i = 0; i < 3; i++) rateLimit("search:user-1", 3);
    expect(rateLimit("search:user-1", 3)).toBe(false);
    expect(rateLimit("search:user-2", 3)).toBe(true);
  });
});

describe("rateLimit — custom window sizes", () => {
  let rateLimit: (key: string, limit: number, windowMs?: number) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const mod = await import("@/lib/rateLimit");
    rateLimit = mod.rateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to a 60-second window", () => {
    for (let i = 0; i < 1; i++) rateLimit("default:1", 1);
    expect(rateLimit("default:1", 1)).toBe(false);
    vi.advanceTimersByTime(59_999);
    expect(rateLimit("default:1", 1)).toBe(false); // still blocked
    vi.advanceTimersByTime(2);
    expect(rateLimit("default:1", 1)).toBe(true);  // window expired
  });

  it("respects a custom 5-second window", () => {
    for (let i = 0; i < 2; i++) rateLimit("custom:1", 2, 5000);
    expect(rateLimit("custom:1", 2, 5000)).toBe(false);
    vi.advanceTimersByTime(5001);
    expect(rateLimit("custom:1", 2, 5000)).toBe(true);
  });
});
