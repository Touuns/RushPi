-- Rush Pi — Phase 11A migration: immutable daily market snapshots.
-- Run this in the Supabase SQL editor. Non-destructive; leaderboard tables and
-- policies are untouched.

create table if not exists public.daily_market_snapshots (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  currency text not null default 'usd',
  version integer not null default 1,
  source text not null default 'coingecko',
  coins jsonb not null,
  provider_updated_at timestamptz null,
  created_at timestamptz not null default now()
);

-- One immutable snapshot per UTC day (per currency/version): concurrent
-- creators race on this constraint and everyone re-reads the winning row.
create unique index if not exists daily_market_snapshots_unique_day
  on public.daily_market_snapshots (challenge_date, currency, version);

-- RLS on with NO policies: the anon/authenticated clients can neither read nor
-- write; only the server (service role, which bypasses RLS) touches this table.
alter table public.daily_market_snapshots enable row level security;
