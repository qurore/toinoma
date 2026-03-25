-- Atomic increment/decrement functions to eliminate read-then-write race conditions.

-- Add missing enum value for unban audit logging
ALTER TYPE public.admin_action_type ADD VALUE IF NOT EXISTS 'user_unbanned';

-- Atomic coupon usage increment
-- Used by the purchase route to safely increment current_uses without a race condition.
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id uuid)
RETURNS void AS $$
  UPDATE coupons SET current_uses = current_uses + 1 WHERE id = coupon_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Atomic review helpful count adjustment
-- delta = +1 when adding a vote, -1 when removing.
-- GREATEST ensures the count never goes below 0.
CREATE OR REPLACE FUNCTION adjust_helpful_count(review_id_param uuid, delta integer)
RETURNS void AS $$
  UPDATE reviews SET helpful_count = GREATEST(helpful_count + delta, 0) WHERE id = review_id_param;
$$ LANGUAGE sql SECURITY DEFINER;
