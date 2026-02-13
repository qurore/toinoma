-- Subscription tiers and user subscriptions for FR-026, FR-027, FR-028
-- Token usage tracking for FR-031

-- Subscription tier enum
create type public.subscription_tier as enum ('free', 'basic', 'pro');

-- Subscription interval enum
create type public.subscription_interval as enum ('monthly', 'annual');

-- User subscriptions table
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  interval public.subscription_interval,
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_user_id_unique unique (user_id)
);

-- Token usage tracking
create table public.token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  tokens_used integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  model text not null default 'gemini-2.0-flash',
  created_at timestamptz not null default now()
);

-- Index for efficient subscription lookups
create index idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index idx_user_subscriptions_stripe_sub_id on public.user_subscriptions(stripe_subscription_id);
create index idx_user_subscriptions_stripe_cust_id on public.user_subscriptions(stripe_customer_id);

-- Index for token usage queries
create index idx_token_usage_user_id on public.token_usage(user_id);
create index idx_token_usage_created_at on public.token_usage(created_at);

-- RLS policies for user_subscriptions
alter table public.user_subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can read own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert/update/delete subscriptions (via webhooks)
-- No insert/update/delete policies for regular users

-- RLS policies for token_usage
alter table public.token_usage enable row level security;

-- Users can read their own token usage
create policy "Users can read own token usage"
  on public.token_usage for select
  using (auth.uid() = user_id);

-- Updated at trigger for user_subscriptions
create trigger user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.handle_updated_at();

-- Grant access
grant usage on type public.subscription_tier to anon, authenticated;
grant usage on type public.subscription_interval to anon, authenticated;
grant select on public.user_subscriptions to authenticated;
grant select on public.token_usage to authenticated;
