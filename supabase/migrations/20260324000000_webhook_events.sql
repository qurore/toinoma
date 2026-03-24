-- Webhook events table for idempotent webhook processing.
-- Replaces in-memory deduplication with durable, DB-backed idempotency.
-- Each Stripe webhook event ID is recorded on first processing;
-- subsequent deliveries of the same event are skipped via UNIQUE constraint.

CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for periodic cleanup of old events (retention query)
CREATE INDEX idx_webhook_events_processed_at ON webhook_events (processed_at);

-- RLS: webhook_events should only be accessed by service role (server-side).
-- Enable RLS and add no policies so that anon/authenticated roles cannot access.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Secure RPC to look up a user ID by email from auth.users.
-- Replaces the dangerous listUsers() pattern that loads all users into memory.
-- Only callable by service_role (SECURITY DEFINER runs as the function owner).
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email TEXT)
RETURNS TABLE(id UUID) AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Revoke public access — only service_role should call this
REVOKE ALL ON FUNCTION get_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_id_by_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION get_user_id_by_email(TEXT) FROM authenticated;
