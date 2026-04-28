-- Admin user management enhancement (FR-A1..A4)
-- Adds tier override + AI usage adjustment tracking, with version-based optimistic concurrency
-- and append-only audit-log integration.

-- ============================================================
-- 1. user_subscriptions: manual override + version (FR-A1, REQ-1)
-- ============================================================

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS manual_override_tier public.subscription_tier NULL,
  ADD COLUMN IF NOT EXISTS manual_override_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS manual_override_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT manual_override_complete CHECK (
    (manual_override_tier IS NULL
      AND manual_override_reason IS NULL
      AND manual_override_at IS NULL)
    OR
    (manual_override_tier IS NOT NULL
      AND manual_override_reason IS NOT NULL
      AND manual_override_at IS NOT NULL)
  ),
  ADD CONSTRAINT manual_override_reason_length CHECK (
    manual_override_reason IS NULL
    OR (LENGTH(TRIM(manual_override_reason)) BETWEEN 10 AND 500)
  ),
  ADD CONSTRAINT manual_override_at_not_future CHECK (
    manual_override_at IS NULL
    OR manual_override_at <= NOW() + INTERVAL '1 minute'
  );

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_override
  ON public.user_subscriptions(user_id)
  WHERE manual_override_tier IS NOT NULL;

COMMENT ON COLUMN public.user_subscriptions.manual_override_tier
  IS 'Admin-set tier override. When non-null, supersedes Stripe-driven tier via getResolvedTier(). Stripe webhook skips tier writes when this is set.';
COMMENT ON COLUMN public.user_subscriptions.version
  IS 'Optimistic concurrency token. Incremented atomically on every write (Stripe webhook + admin actions). Admin overrides use version-CAS to prevent admin-vs-admin races.';

-- ============================================================
-- 2. token_usage: adjustment_type + sign CHECK (FR-A2, REQ-2)
-- ============================================================

CREATE TYPE public.token_adjustment_type AS ENUM ('credit', 'deduct', 'reset');

ALTER TABLE public.token_usage
  ADD COLUMN IF NOT EXISTS adjustment_type public.token_adjustment_type NULL;

-- Consumption rows (adjustment_type IS NULL) must have non-negative tokens_used.
-- Adjustment rows can be negative (credit, reset) or positive (deduct).
ALTER TABLE public.token_usage
  ADD CONSTRAINT token_usage_adjustment_sign CHECK (
    (adjustment_type IS NULL AND tokens_used >= 0)
    OR adjustment_type IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_token_usage_adjustment
  ON public.token_usage(user_id, created_at DESC)
  WHERE adjustment_type IS NOT NULL;

GRANT USAGE ON TYPE public.token_adjustment_type TO authenticated;

COMMENT ON COLUMN public.token_usage.adjustment_type
  IS 'NULL = organic AI usage. Non-null = operator adjustment row written by admin server action. Analytics MUST filter via token_usage_consumption view.';

-- ============================================================
-- 3. admin_action_type: 4 new values (FR-A3, REQ-3)
-- ============================================================

ALTER TYPE public.admin_action_type ADD VALUE IF NOT EXISTS 'subscription_tier_overridden';
ALTER TYPE public.admin_action_type ADD VALUE IF NOT EXISTS 'ai_usage_credited';
ALTER TYPE public.admin_action_type ADD VALUE IF NOT EXISTS 'ai_usage_deducted';
ALTER TYPE public.admin_action_type ADD VALUE IF NOT EXISTS 'ai_usage_reset';

-- ============================================================
-- 4. token_usage_consumption view (FR-A4, REQ-13)
-- ============================================================
-- Binding analytics enforcement: any aggregation of organic usage MUST query
-- this view (or use getTokenConsumption helper). Direct token_usage SELECT is
-- reserved for getUsageBudget() which intentionally sums adjustments.

CREATE OR REPLACE VIEW public.token_usage_consumption
  WITH (security_invoker = true)
  AS SELECT * FROM public.token_usage WHERE adjustment_type IS NULL;

GRANT SELECT ON public.token_usage_consumption TO authenticated;

COMMENT ON VIEW public.token_usage_consumption
  IS 'Organic AI usage rows only. Excludes operator adjustments (credit/deduct/reset). Use this for analytics and dashboards. NEVER use for budget enforcement (use getUsageBudget which sums raw token_usage).';
