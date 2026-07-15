-- Rush Pi — Phase 11B migration: Daily Token Rush leaderboard columns.
-- Run this in the Supabase SQL editor BEFORE deploying the new submit-score.
-- Non-destructive: no existing row is deleted or modified; legacy Daily v1 rows
-- simply keep rules_version = 1 (the default) and are excluded from v2 boards.

alter table public.rushpi_scores
  add column if not exists rules_version integer not null default 1,
  add column if not exists token_challenge_version integer null,
  add column if not exists token_points integer not null default 0,
  add column if not exists tokens_collected_count integer not null default 0,
  add column if not exists token_ids_collected jsonb not null default '[]'::jsonb;

-- Prudent value constraints (added only if not already present).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rushpi_scores_rules_version_chk'
  ) then
    alter table public.rushpi_scores
      add constraint rushpi_scores_rules_version_chk check (rules_version >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rushpi_scores_token_points_chk'
  ) then
    alter table public.rushpi_scores
      add constraint rushpi_scores_token_points_chk check (token_points >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rushpi_scores_tokens_count_chk'
  ) then
    alter table public.rushpi_scores
      add constraint rushpi_scores_tokens_count_chk check (tokens_collected_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rushpi_scores_token_ids_array_chk'
  ) then
    alter table public.rushpi_scores
      add constraint rushpi_scores_token_ids_array_chk
      check (jsonb_typeof(token_ids_collected) = 'array');
  end if;
end $$;

-- Board query index: today's challenge + version, best score first.
create index if not exists rushpi_scores_daily_v2_idx
  on public.rushpi_scores (challenge_date, rules_version, is_valid, score desc);
