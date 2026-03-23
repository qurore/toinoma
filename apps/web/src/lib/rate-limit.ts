/**
 * Simple in-memory rate limiter for API routes.
 * For production, replace with Redis-backed solution.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  // Clean up expired entries periodically
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  if (!bucket || bucket.resetAt < now) {
    // New window
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Rate limit by user ID.
 * Default: 100 requests per minute.
 */
export function rateLimitByUser(userId: string, maxRequests = 100, windowMs = 60_000) {
  return checkRateLimit(`user:${userId}`, maxRequests, windowMs);
}

/**
 * Rate limit by IP address.
 * Default: 30 requests per minute for unauthenticated routes.
 */
export function rateLimitByIp(ip: string, maxRequests = 30, windowMs = 60_000) {
  return checkRateLimit(`ip:${ip}`, maxRequests, windowMs);
}
