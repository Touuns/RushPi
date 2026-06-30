-- Rush Pi — Supabase schema for the server leaderboard (Phase 6A)
-- Run this in the Supabase SQL editor.

create table if not exists public.rushpi_scores (
  id uuid primary key default gen_random_uuid(),
  pi_user_uid text,
  pi_username text,
  score integer not null,
  energy_collected integer not null,
  max_combo integer not null,
  obstacles_hit integer not null,
  duration_seconds integer not null,
  game_mode text not null,
  is_valid boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes for the leaderboard queries.
create index if not exists rushpi_scores_score_idx on public.rushpi_scores (score desc);
create index if not exists rushpi_scores_created_at_idx on public.rushpi_scores (created_at desc);
create index if not exists rushpi_scores_pi_user_uid_idx on public.rushpi_scores (pi_user_uid);
create index if not exists rushpi_scores_game_mode_idx on public.rushpi_scores (game_mode);

-- Row Level Security: enable it and add NO policies.
-- => anon/authenticated clients can neither read nor write directly.
-- All access goes through the Vercel serverless routes using the service role
-- key, which bypasses RLS. The frontend never talks to Supabase directly and
-- the service role key is never exposed to the client.
alter table public.rushpi_scores enable row level security;
