-- Toinoma Database Schema
-- Iteration 0: PRE-001 Database Schema Alignment
-- Creates all tables, enums, RLS policies, triggers, and indexes

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.subject AS ENUM (
  'math',
  'english',
  'japanese',
  'physics',
  'chemistry',
  'biology',
  'japanese_history',
  'world_history',
  'geography'
);

CREATE TYPE public.difficulty AS ENUM (
  'easy',
  'medium',
  'hard'
);

CREATE TYPE public.problem_set_status AS ENUM (
  'draft',
  'published'
);

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: extends auth.users (no role field, no stripe fields)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seller_profiles: additive seller capability
CREATE TABLE public.seller_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_display_name TEXT NOT NULL,
  seller_description TEXT,
  university TEXT,
  circle_name TEXT,
  tos_accepted_at TIMESTAMPTZ,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- problem_sets: seller-published exam problems
CREATE TABLE public.problem_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject public.subject NOT NULL,
  university TEXT,
  difficulty public.difficulty NOT NULL,
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  status public.problem_set_status NOT NULL DEFAULT 'draft',
  problem_pdf_url TEXT,
  solution_pdf_url TEXT,
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- purchases: user purchases (unique per user + problem_set)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_set_id)
);

-- submissions: answer submissions with AI grading results
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER,
  max_score INTEGER,
  feedback JSONB,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- favorites: user wishlists (unique per user + problem_set)
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_set_id UUID NOT NULL REFERENCES public.problem_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_set_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_problem_sets_seller_id ON public.problem_sets(seller_id);
CREATE INDEX idx_problem_sets_status ON public.problem_sets(status);
CREATE INDEX idx_problem_sets_subject ON public.problem_sets(subject);
CREATE INDEX idx_problem_sets_status_subject ON public.problem_sets(status, subject);
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_problem_set_id ON public.purchases(problem_set_id);
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_problem_set_id ON public.submissions(problem_set_id);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_problem_set_id ON public.favorites(problem_set_id);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.problem_sets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- profiles: public read, self-update only
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- seller_profiles: public read, self-create, self-update
CREATE POLICY "seller_profiles_select" ON public.seller_profiles
  FOR SELECT USING (true);

CREATE POLICY "seller_profiles_insert" ON public.seller_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "seller_profiles_update" ON public.seller_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- problem_sets: published visible to all, drafts to owner, CRUD to owner
CREATE POLICY "problem_sets_select_published" ON public.problem_sets
  FOR SELECT USING (status = 'published');

CREATE POLICY "problem_sets_select_own" ON public.problem_sets
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "problem_sets_insert" ON public.problem_sets
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "problem_sets_update" ON public.problem_sets
  FOR UPDATE USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "problem_sets_delete" ON public.problem_sets
  FOR DELETE USING (seller_id = auth.uid());

-- purchases: self-read, self-create
CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "purchases_insert" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- submissions: self-read/create, sellers can view submissions for their problem sets
CREATE POLICY "submissions_select_own" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "submissions_select_seller" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.problem_sets
      WHERE problem_sets.id = submissions.problem_set_id
        AND problem_sets.seller_id = auth.uid()
    )
  );

CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- favorites: self-manage only
CREATE POLICY "favorites_select" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);
