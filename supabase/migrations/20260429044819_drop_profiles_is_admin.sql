-- Drop profiles.is_admin column and its index.
-- Admin authorization moved from DB column to ADMIN_EMAILS env-var allowlist.
-- See apps/web/src/lib/auth/admin.ts for the new mechanism.
--
-- Historical context: is_admin was added by two prior migrations:
--   - 20260323000000_questions_reviews_notifications.sql:434 (multi-purpose, IF NOT EXISTS)
--   - 20260323600000_add_admin_flag.sql:3 (dedicated, IF NOT EXISTS)
-- Both are left intact as historical records. DROP COLUMN IF EXISTS is
-- idempotent regardless of which migration created the column.

DROP INDEX IF EXISTS idx_profiles_is_admin;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;
