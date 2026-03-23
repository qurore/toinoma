-- ============================================================
-- Migration: Add questions pool, reviews, notifications, Q&A,
-- reports, and alter existing tables for enterprise features
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.answer_type AS ENUM (
  'essay',
  'mark_sheet',
  'fill_in_blank',
  'multiple_choice'
);

CREATE TYPE public.report_reason AS ENUM (
  'copyright',
  'inappropriate',
  'spam',
  'other'
);

CREATE TYPE public.report_status AS ENUM (
  'pending',
  'reviewed',
  'action_taken',
  'dismissed'
);

CREATE TYPE public.notification_type AS ENUM (
  'purchase',
  'grading',
  'review',
  'announcement',
  'subscription',
  'system'
);

-- ============================================================
-- TABLE: questions (Problem Pool)
-- Individual questions owned by sellers, reusable across sets
-- ============================================================

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,

  -- Content
  question_type public.answer_type NOT NULL,
  question_text TEXT NOT NULL,
  question_images JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Answer definition
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_answer TEXT,
  model_answer_images JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  subject public.subject NOT NULL,
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty public.difficulty NOT NULL DEFAULT 'medium',
  estimated_minutes INTEGER,
  points INTEGER NOT NULL DEFAULT 10,

  -- Media
  video_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Rendering
  vertical_text BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_seller_id ON public.questions(seller_id);
CREATE INDEX idx_questions_subject ON public.questions(subject);
CREATE INDEX idx_questions_type ON public.questions(question_type);

-- RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_own"
  ON public.questions FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "questions_insert"
  ON public.questions FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "questions_update"
  ON public.questions FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "questions_delete"
  ON public.questions FOR DELETE
  USING (seller_id = auth.uid());

-- Trigger: auto-update updated_at
CREATE TRIGGER set_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: problem_set_questions (Junction: Set <-> Question)
-- ============================================================

CREATE TABLE public.problem_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  section_number INTEGER NOT NULL DEFAULT 1,
  section_title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  points_override INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(problem_set_id, question_id)
);

CREATE INDEX idx_psq_problem_set ON public.problem_set_questions(problem_set_id);
CREATE INDEX idx_psq_question ON public.problem_set_questions(question_id);

-- RLS: same access as problem_sets (seller can manage their own)
ALTER TABLE public.problem_set_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psq_select"
  ON public.problem_set_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id
      AND (ps.status = 'published' OR ps.seller_id = auth.uid())
    )
  );

CREATE POLICY "psq_insert"
  ON public.problem_set_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "psq_update"
  ON public.problem_set_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "psq_delete"
  ON public.problem_set_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id AND ps.seller_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: reviews
-- ============================================================

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT CHECK (char_length(body) >= 10 AND char_length(body) <= 500),
  seller_response TEXT,
  seller_responded_at TIMESTAMPTZ,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_set_id)
);

CREATE INDEX idx_reviews_problem_set ON public.reviews(problem_set_id, created_at DESC);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "reviews_select"
  ON public.reviews FOR SELECT
  USING (true);

-- Only purchasers with at least 1 submission can create reviews
CREATE POLICY "reviews_insert"
  ON public.reviews FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.user_id = auth.uid() AND p.problem_set_id = reviews.problem_set_id
    )
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.user_id = auth.uid() AND s.problem_set_id = reviews.problem_set_id
    )
  );

-- Self-update only (for editing review text)
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Seller can update seller_response on their own sets' reviews
CREATE POLICY "reviews_update_seller_response"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets ps
      WHERE ps.id = problem_set_id AND ps.seller_id = auth.uid()
    )
  );

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: review_votes (helpful votes)
-- ============================================================

CREATE TABLE public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_votes_select"
  ON public.review_votes FOR SELECT
  USING (true);

CREATE POLICY "review_votes_insert"
  ON public.review_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_votes_delete"
  ON public.review_votes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Insert via service role only (server actions, webhooks)

-- ============================================================
-- TABLE: qa_questions (Q&A per problem set)
-- ============================================================

CREATE TABLE public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_questions_set ON public.qa_questions(problem_set_id, created_at DESC);

ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_questions_select"
  ON public.qa_questions FOR SELECT
  USING (true);

CREATE POLICY "qa_questions_insert"
  ON public.qa_questions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.user_id = auth.uid() AND p.problem_set_id = qa_questions.problem_set_id
    )
  );

CREATE POLICY "qa_questions_update_own"
  ON public.qa_questions FOR UPDATE
  USING (user_id = auth.uid());

CREATE TRIGGER set_qa_questions_updated_at
  BEFORE UPDATE ON public.qa_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: qa_answers
-- ============================================================

CREATE TABLE public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_answers_question ON public.qa_answers(qa_question_id, created_at);

ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_answers_select"
  ON public.qa_answers FOR SELECT
  USING (true);

CREATE POLICY "qa_answers_insert"
  ON public.qa_answers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "qa_answers_update_own"
  ON public.qa_answers FOR UPDATE
  USING (user_id = auth.uid());

CREATE TRIGGER set_qa_answers_updated_at
  BEFORE UPDATE ON public.qa_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABLE: reports (content moderation)
-- ============================================================

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  description TEXT,
  status public.report_status NOT NULL DEFAULT 'pending',

  -- Polymorphic target
  problem_set_id UUID REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  qa_question_id UUID REFERENCES public.qa_questions(id) ON DELETE CASCADE,

  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one target must be set
  CHECK (
    (problem_set_id IS NOT NULL)::int +
    (review_id IS NOT NULL)::int +
    (qa_question_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Select via service role only (admin)

-- ============================================================
-- ALTER: problem_sets — add cover image, time limit, total points
-- ============================================================

ALTER TABLE public.problem_sets
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_question_ids UUID[] NOT NULL DEFAULT '{}';

-- ============================================================
-- ALTER: profiles — add admin flag and study preferences
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_subjects public.subject[] NOT NULL DEFAULT '{}';

-- ============================================================
-- STORAGE: question-videos bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-videos',
  'question-videos',
  false,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for question-videos
CREATE POLICY "question_videos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'question-videos');

CREATE POLICY "question_videos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'question-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "question_videos_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'question-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "question_videos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'question-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
