-- ============================================================
-- Migration: Add delete policy for notifications (user can delete own)
-- ============================================================

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());
