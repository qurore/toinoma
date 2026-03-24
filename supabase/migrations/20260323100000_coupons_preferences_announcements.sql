-- ============================================================
-- Migration: Add coupons, notification preferences, announcements,
-- admin audit logs, and QA upvotes tables
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.admin_action_type AS ENUM (
  'user_banned',
  'user_suspended',
  'user_warned',
  'content_removed',
  'report_reviewed',
  'report_dismissed',
  'announcement_created',
  'seller_verified'
);

-- ============================================================
-- TABLE: coupons (Seller-created discount codes)
-- ============================================================

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  coupon_type public.coupon_type NOT NULL,
  discount_value INTEGER NOT NULL,
  min_purchase INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,

  -- Scope
  problem_set_id UUID REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  applies_to_all BOOLEAN NOT NULL DEFAULT false,

  -- Validity
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Stripe
  stripe_coupon_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(seller_id, code),
  CHECK (discount_value > 0),
  CHECK (
    (coupon_type = 'percentage' AND discount_value <= 100) OR
    (coupon_type = 'fixed')
  ),
  CHECK (
    (problem_set_id IS NOT NULL AND applies_to_all = false) OR
    (problem_set_id IS NULL AND applies_to_all = true)
  )
);

CREATE INDEX idx_coupons_seller ON public.coupons(seller_id);
CREATE INDEX idx_coupons_code ON public.coupons(seller_id, code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_own"
  ON public.coupons FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "coupons_select_active"
  ON public.coupons FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "coupons_insert"
  ON public.coupons FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "coupons_update"
  ON public.coupons FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "coupons_delete"
  ON public.coupons FOR DELETE
  USING (seller_id = auth.uid());

CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: notification_preferences
-- ============================================================

CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Email notification categories
  email_purchase BOOLEAN NOT NULL DEFAULT true,
  email_grading BOOLEAN NOT NULL DEFAULT true,
  email_review BOOLEAN NOT NULL DEFAULT true,
  email_announcement BOOLEAN NOT NULL DEFAULT true,
  email_subscription BOOLEAN NOT NULL DEFAULT true,
  email_qa BOOLEAN NOT NULL DEFAULT true,
  email_marketing BOOLEAN NOT NULL DEFAULT false,

  -- In-app notification categories
  inapp_purchase BOOLEAN NOT NULL DEFAULT true,
  inapp_grading BOOLEAN NOT NULL DEFAULT true,
  inapp_review BOOLEAN NOT NULL DEFAULT true,
  inapp_announcement BOOLEAN NOT NULL DEFAULT true,
  inapp_subscription BOOLEAN NOT NULL DEFAULT true,
  inapp_qa BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: announcements (Platform-wide admin announcements)
-- ============================================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT 'all',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_published ON public.announcements(published, published_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read published announcements
CREATE POLICY "announcements_select_published"
  ON public.announcements FOR SELECT
  USING (published = true);

-- Insert/update/delete via service role only (admin actions)

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: admin_audit_logs
-- ============================================================

CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action public.admin_action_type NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Select/insert via service role only (admin)

-- ============================================================
-- TABLE: qa_upvotes (Q&A answer upvoting)
-- ============================================================

CREATE TABLE public.qa_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_answer_id UUID NOT NULL REFERENCES public.qa_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(qa_answer_id, user_id)
);

ALTER TABLE public.qa_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_upvotes_select"
  ON public.qa_upvotes FOR SELECT
  USING (true);

CREATE POLICY "qa_upvotes_insert"
  ON public.qa_upvotes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "qa_upvotes_delete"
  ON public.qa_upvotes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- ALTER: profiles — add banned_at and suspension fields
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- ============================================================
-- ALTER: purchases — add coupon reference
-- ============================================================

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- GRANTS for service role operations
-- ============================================================

GRANT ALL ON public.admin_audit_logs TO service_role;
GRANT ALL ON public.announcements TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.reports TO service_role;
