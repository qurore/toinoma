-- STD-016, STD-017, MKT-018: User notes, bookmarks, and recently viewed tracking
-- Creates tables with RLS for self-manage only access

-- ============================================================
-- TABLE: user_notes
-- Personal notes per question or problem set
-- ============================================================

CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT,
  problem_set_id UUID REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX idx_user_notes_problem_set_id ON public.user_notes(problem_set_id);
CREATE INDEX idx_user_notes_user_question ON public.user_notes(user_id, problem_set_id, question_id);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON public.user_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.user_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.user_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.user_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER set_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: bookmarks
-- Per-question or per-problem-set bookmarks (distinct from favorites)
-- ============================================================

CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  question_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one bookmark per user per problem_set per question
-- Uses COALESCE to handle nullable question_id in the unique constraint
CREATE UNIQUE INDEX idx_bookmarks_unique
  ON public.bookmarks(user_id, problem_set_id, COALESCE(question_id, '__null__'));

CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_problem_set ON public.bookmarks(user_id, problem_set_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: recently_viewed
-- Tracks which problem sets a user has recently viewed
-- ============================================================

CREATE TABLE public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique per user per problem_set (upsert pattern)
CREATE UNIQUE INDEX idx_recently_viewed_unique
  ON public.recently_viewed(user_id, problem_set_id);

CREATE INDEX idx_recently_viewed_user_recent
  ON public.recently_viewed(user_id, viewed_at DESC);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recently viewed"
  ON public.recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recently viewed"
  ON public.recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recently viewed"
  ON public.recently_viewed FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recently viewed"
  ON public.recently_viewed FOR DELETE
  USING (auth.uid() = user_id);
