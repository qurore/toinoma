-- FR-D6 Submission Drafts: Persist auto-saved in-progress answers per (user, problem_set).
-- Drafts are wiped after final submission and auto-purged after 90 days of inactivity.
--
-- Design notes:
--   - Composite UNIQUE (user_id, problem_set_id) supports `upsert` semantics
--     (one active draft per user per problem set).
--   - JSONB `answers` stores a polymorphic map { questionId: DraftAnswer }.
--   - `last_active_at` is used for purge eligibility; `updated_at` reflects
--     the last write of any column.
--   - Self-only RLS — no seller visibility.
--   - Auto-purge runs daily via pg_cron when the extension is available;
--     when it isn't (local dev), Vercel Cron (apps/web/api/cron/purge-drafts)
--     fills the gap.

-- ============================================================
-- TABLE: submission_drafts
-- ============================================================

CREATE TABLE public.submission_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active draft per (user, problem_set) — enables ON CONFLICT upsert
CREATE UNIQUE INDEX idx_submission_drafts_unique
  ON public.submission_drafts(user_id, problem_set_id);

CREATE INDEX idx_submission_drafts_user_id
  ON public.submission_drafts(user_id);

-- For the purge job: scan oldest-first by last_active_at
CREATE INDEX idx_submission_drafts_last_active
  ON public.submission_drafts(last_active_at);

-- ============================================================
-- RLS — self-manage only
-- ============================================================

ALTER TABLE public.submission_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON public.submission_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
  ON public.submission_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.submission_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.submission_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-update updated_at on every row update
CREATE TRIGGER set_submission_drafts_updated_at
  BEFORE UPDATE ON public.submission_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Purge function — delete drafts inactive for >= 90 days
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_old_drafts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.submission_drafts
   WHERE last_active_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.purge_old_drafts() IS
  'Deletes submission_drafts rows where last_active_at is more than 90 days old. '
  'Returns the number of rows deleted. Invoked daily by pg_cron and/or Vercel Cron.';

-- Restrict execution to the service role / authenticated cron caller
REVOKE ALL ON FUNCTION public.purge_old_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_drafts() TO service_role;

-- ============================================================
-- pg_cron schedule (best-effort — extension may not be installed)
-- ============================================================
-- When pg_cron is available (Supabase managed Postgres), schedule a daily
-- purge at 03:00 UTC. The Vercel Cron route is a redundant fallback so the
-- system stays correct even when this DO block is skipped.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule any pre-existing job with the same name to keep the
    -- migration idempotent across re-applies.
    PERFORM cron.unschedule('purge_old_drafts_daily')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'purge_old_drafts_daily'
      );

    PERFORM cron.schedule(
      'purge_old_drafts_daily',
      '0 3 * * *',
      $cron$SELECT public.purge_old_drafts();$cron$
    );
  END IF;
EXCEPTION WHEN others THEN
  -- Never fail the migration if pg_cron behaves unexpectedly.
  RAISE NOTICE 'Skipped pg_cron schedule for purge_old_drafts: %', SQLERRM;
END;
$$;
