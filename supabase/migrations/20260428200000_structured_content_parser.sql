-- Structured-content parser system
-- Adds AST storage to problem_sets, plus content_assets and parse_jobs tables.
-- Coexists with legacy PDF columns; migration is additive.

-- ────────────────────────────────────────────────────────────────────
-- 1. problem_sets: add structured-content fields
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.problem_sets
  ADD COLUMN IF NOT EXISTS structured_content jsonb,
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'legacy_pdf'
    CHECK (content_format IN ('legacy_pdf', 'structured', 'hybrid')),
  ADD COLUMN IF NOT EXISTS writing_mode text NOT NULL DEFAULT 'horizontal'
    CHECK (writing_mode IN ('horizontal', 'vertical', 'auto')),
  ADD COLUMN IF NOT EXISTS source_pdf_path text,
  ADD COLUMN IF NOT EXISTS structured_content_version int NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS problem_sets_content_format_idx
  ON public.problem_sets (content_format);

-- ────────────────────────────────────────────────────────────────────
-- 2. content_assets: figures, table images, audio, photos
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id uuid NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('figure', 'table_image', 'audio', 'photo', 'math_image')),
  label text,
  storage_bucket text NOT NULL DEFAULT 'problem-assets',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  width int,
  height int,
  duration_ms int,
  alt_text text,
  byte_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_assets_problem_set_idx
  ON public.content_assets (problem_set_id);
CREATE INDEX IF NOT EXISTS content_assets_label_idx
  ON public.content_assets (problem_set_id, label);

ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;

-- Buyers/visitors of published problem sets see assets; owning seller always sees.
CREATE POLICY "content_assets_select_published"
  ON public.content_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
        AND ps.status = 'published'
    )
  );

CREATE POLICY "content_assets_select_owner"
  ON public.content_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
        AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "content_assets_insert_owner"
  ON public.content_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
        AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "content_assets_update_owner"
  ON public.content_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
        AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "content_assets_delete_owner"
  ON public.content_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
        AND ps.seller_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- 3. parse_jobs: async ingestion pipeline state
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parse_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_set_id uuid REFERENCES public.problem_sets(id) ON DELETE SET NULL,
  source_storage_bucket text NOT NULL DEFAULT 'problem-pdfs',
  source_storage_path text NOT NULL,
  source_mime text NOT NULL,
  source_subject public.subject,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_code text,
  error_message text,
  result_ast jsonb,
  result_warnings jsonb,
  pages_total int,
  pages_processed int,
  attempt int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parse_jobs_user_idx
  ON public.parse_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parse_jobs_status_idx
  ON public.parse_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS parse_jobs_problem_set_idx
  ON public.parse_jobs (problem_set_id);

ALTER TABLE public.parse_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parse_jobs_select_own"
  ON public.parse_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "parse_jobs_insert_own"
  ON public.parse_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "parse_jobs_update_own"
  ON public.parse_jobs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "parse_jobs_delete_own"
  ON public.parse_jobs FOR DELETE
  USING (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parse_jobs_set_updated_at ON public.parse_jobs;
CREATE TRIGGER parse_jobs_set_updated_at
  BEFORE UPDATE ON public.parse_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────
-- 4. problem-assets storage bucket (figures/audio/etc.)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'problem-assets',
  'problem-assets',
  true,
  104857600,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "problem_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'problem-assets');

CREATE POLICY "problem_assets_seller_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'problem-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "problem_assets_seller_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'problem-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "problem_assets_seller_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'problem-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────────────
-- 5. Backfill: existing rows get content_format='legacy_pdf' implicitly
-- ────────────────────────────────────────────────────────────────────

-- All existing rows already default to 'legacy_pdf' via column default; no extra UPDATE needed.

COMMENT ON COLUMN public.problem_sets.structured_content IS
  'AST root node (StructuredContent). Source of truth for renderer/editor. Null for legacy_pdf rows.';
COMMENT ON COLUMN public.problem_sets.content_format IS
  'legacy_pdf = old uploads only; structured = AST authoritative; hybrid = both present, structured preferred.';
COMMENT ON TABLE public.content_assets IS
  'Binary attachments referenced by AST nodes (figures, audio, photo-as-question images).';
COMMENT ON TABLE public.parse_jobs IS
  'Async PDF/DOCX → AST parsing pipeline. One job per upload attempt.';
