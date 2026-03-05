/**
 * Simple in-memory sliding window rate limiter.
 *
 * Suitable for single-instance deployments (dev, small-scale prod).
 * For multi-instance deployments, swap the Map for Redis.
 *
 * Usage:
 *   const ok = rateLimit(`search:${userId}`, 20, 60_000); // 20 req/min
 *   if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

const store = new Map<string, number[]>();

// Prune the store every 5 minutes to avoid unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, timestamps] of store) {
    const pruned = timestamps.filter((t) => t > cutoff);
    if (pruned.length === 0) {
      store.delete(key);
    } else {
      store.set(key, pruned);
    }
  }
}, 5 * 60_000);

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 *
 * @param key     Unique identifier (e.g. `search:userId` or `feed:ip`)
 * @param limit   Max requests allowed within the window
 * @param windowMs Window size in milliseconds (default: 60 seconds)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) return false;

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
