-- Rate limiting table to replace in-memory Map
-- Survives server restarts and works across multiple Vercel serverless instances

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  count integer not null default 1,
  window_start timestamptz not null default now(),
  window_ms integer not null,
  created_at timestamptz not null default now()
);

-- Unique constraint on key ensures one active window per rate-limit key
create unique index idx_rate_limits_key on public.rate_limits(key);

-- Index for cleanup of expired windows
create index idx_rate_limits_window_start on public.rate_limits(window_start);

-- RLS: rate_limits is only accessed via service role (admin client)
-- No user-facing policies needed
alter table public.rate_limits enable row level security;

-- Grant access to service role only (no anon/authenticated access)
-- Service role bypasses RLS by default

-- Cleanup function: remove expired rate limit windows older than 10 minutes
-- Can be invoked periodically via pg_cron or a scheduled function
create or replace function public.cleanup_expired_rate_limits()
returns void
language sql
security definer
as $$
  delete from public.rate_limits
  where window_start + (window_ms || ' milliseconds')::interval < now();
$$;
