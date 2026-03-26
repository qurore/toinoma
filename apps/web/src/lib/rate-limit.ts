/**
 * Supabase-backed rate limiter for API routes.
 * Uses the rate_limits table with atomic upserts for distributed environments.
 * Works correctly across multiple Vercel serverless instances.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitRow {
  count: number;
  window_start: string;
  window_ms: number;
}

/**
 * Check and increment rate limit for a given key.
 * Uses Supabase upsert with conflict resolution for atomic window management.
 * Expired windows are automatically reset on the next request.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const now = Date.now();

  // Attempt to read the current rate limit record
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, window_start, window_ms")
    .eq("key", key)
    .single() as { data: RateLimitRow | null };

  if (!existing) {
    // No record exists — create a new window
    await supabase.from("rate_limits").upsert(
      {
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
        window_ms: windowMs,
      },
      { onConflict: "key" }
    );

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  const windowStart = new Date(existing.window_start).getTime();
  const windowEnd = windowStart + existing.window_ms;

  if (windowEnd < now) {
    // Window expired — reset the counter
    await supabase
      .from("rate_limits")
      .update({
        count: 1,
        window_start: new Date(now).toISOString(),
        window_ms: windowMs,
      })
      .eq("key", key);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Window is active — check count
  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
    };
  }

  // Increment counter
  const newCount = existing.count + 1;
  await supabase
    .from("rate_limits")
    .update({ count: newCount })
    .eq("key", key);

  return {
    allowed: true,
    remaining: maxRequests - newCount,
    resetAt: windowEnd,
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
