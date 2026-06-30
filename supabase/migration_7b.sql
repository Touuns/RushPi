-- Rush Pi — Phase 7A/7B migration: daily challenge + ranked attempts
-- Run this in the Supabase SQL editor on an existing rushpi_scores table.
-- Non-destructive: existing rows keep NULL for the new columns.

alter table public.rushpi_scores
  add column if not exists challenge_id text,
  add column if not exists challenge_date date,
  add column if not exists ranked_attempt_number integer;

create index if not exists rushpi_scores_challenge_date_idx
  on public.rushpi_scores (challenge_date);
create index if not exists rushpi_scores_challenge_id_idx
  on public.rushpi_scores (challenge_id);
create index if not exists rushpi_scores_uid_challenge_date_idx
  on public.rushpi_scores (pi_user_uid, challenge_date);
-- (score desc index already created in the base schema)
