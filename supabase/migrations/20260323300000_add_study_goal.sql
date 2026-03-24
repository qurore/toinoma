-- ============================================================
-- Migration: Add study_goal column to profiles for onboarding
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS study_goal text;

COMMENT ON COLUMN public.profiles.study_goal IS 'User study goal chosen during onboarding wizard';
