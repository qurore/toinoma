/**
 * Supabase-backed rate limiter for API routes.
 * Uses an atomic PostgreSQL function (check_rate_limit) that performs
 * upsert + increment + window-reset in a single SQL call.
 * Eliminates the TOCTOU race condition of separate read-then-update.
 * Works correctly across multiple Vercel serverless instances.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key.
 * Calls the `check_rate_limit` PostgreSQL function which atomically:
 *   1. Inserts or updates the rate_limits row (resets if window expired)
 *   2. Increments the counter
 *   3. Returns whether the request is within limits
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_ms: windowMs,
  });

  // If the RPC fails (e.g., function not yet deployed), fail open
  // to avoid blocking all requests. Log for observability.
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    if (error) {
      console.error("[rate-limit] RPC error, failing open:", error.message);
    }
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs,
    };
  }

  // The RPC returns a single-row table; Supabase may return it as an array or object
  const row = Array.isArray(data) ? data[0] : data;

  return {
    allowed: row.allowed,
    remaining: Math.max(0, maxRequests - row.current_count),
    resetAt: Number(row.window_end_ms),
  };
}

/**
 * Rate limit by user ID.
 * Default: 100 requests per minute.
 */
export async function rateLimitByUser(
  userId: string,
  maxRequests = 100,
  windowMs = 60_000
): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, maxRequests, windowMs);
}

/**
 * Rate limit by IP address.
 * Default: 30 requests per minute for unauthenticated routes.
 */
export async function rateLimitByIp(
  ip: string,
  maxRequests = 30,
  windowMs = 60_000
): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${ip}`, maxRequests, windowMs);
}
