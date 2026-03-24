-- ADM-012: Add admin flag to profiles for admin role guard
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Index for efficient admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles (is_admin) WHERE is_admin = true;

-- RLS: is_admin is readable by the owner only, not publicly
-- (existing RLS policies already restrict profile reads appropriately)

COMMENT ON COLUMN profiles.is_admin IS 'Admin flag. Only modifiable via direct DB access or service role.';
