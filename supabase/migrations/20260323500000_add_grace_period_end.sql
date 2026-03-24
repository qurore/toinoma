-- Add grace_period_end column to user_subscriptions for payment failure handling
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.grace_period_end IS 'Grace period end date after payment failure. User retains access until this date.';
