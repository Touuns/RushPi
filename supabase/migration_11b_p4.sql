-- Rush Pi — Phase 11B-P4 migration: atomic ranked-attempt reservations.
--
-- Run this in the Supabase SQL editor BEFORE deploying the new claim/submit code.
-- Non-destructive & idempotent: no score row is deleted or modified, ranking v1
-- is untouched, and re-running is safe. This migration hardens the ranked Daily
-- Token Rush only.
--
-- Deploy order:
--   1. verify the branch
--   2. run this migration
--   3. verify tables/functions exist (see the verification queries at the end)
--   4. deploy the code
--   5. test a real ranked attempt

-- ==========================================================================
-- 1. Reservation table (Bloc 4)
-- ==========================================================================

create table if not exists public.rushpi_ranked_attempts (
  submission_id           uuid primary key,
  pi_user_uid             text        not null,
  pi_username             text        not null,
  game_mode               text        not null default 'daily',
  challenge_date          date        not null,
  challenge_id            text        not null,
  rules_version           integer     not null,
  token_challenge_version integer     null,
  attempt_number          smallint    not null,
  status                  text        not null,
  result_digest           text        null,
  score_row_id            text        null,
  rejection_code          text        null,
  claimed_at              timestamptz not null default now(),
  completed_at            timestamptz null,
  updated_at              timestamptz not null default now()
);

-- Prudent constraints (added only if absent so the migration is idempotent).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rushpi_attempts_game_mode_chk') then
    alter table public.rushpi_ranked_attempts
      add constraint rushpi_attempts_game_mode_chk check (game_mode = 'daily');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rushpi_attempts_number_chk') then
    alter table public.rushpi_ranked_attempts
      add constraint rushpi_attempts_number_chk check (attempt_number between 1 and 3);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rushpi_attempts_status_chk') then
    alter table public.rushpi_ranked_attempts
      add constraint rushpi_attempts_status_chk
      check (status in ('claimed', 'completed', 'rejected', 'expired'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rushpi_attempts_digest_chk') then
    alter table public.rushpi_ranked_attempts
      add constraint rushpi_attempts_digest_chk
      check (result_digest is null or length(result_digest) > 0);
  end if;

  -- completed/rejected reservations should carry a completion timestamp.
  if not exists (select 1 from pg_constraint where conname = 'rushpi_attempts_completed_at_chk') then
    alter table public.rushpi_ranked_attempts
      add constraint rushpi_attempts_completed_at_chk
      check (status not in ('completed', 'rejected') or completed_at is not null);
  end if;
end $$;

-- One reservation per (user, day, attempt slot); helpful lookup indexes.
create unique index if not exists rushpi_attempts_user_day_slot_uidx
  on public.rushpi_ranked_attempts (pi_user_uid, challenge_date, attempt_number);
create index if not exists rushpi_attempts_user_day_idx
  on public.rushpi_ranked_attempts (pi_user_uid, challenge_date);
create index if not exists rushpi_attempts_day_status_idx
  on public.rushpi_ranked_attempts (challenge_date, status);

-- RLS on, no policy: only the service role (which bypasses RLS) may touch it.
alter table public.rushpi_ranked_attempts enable row level security;

-- Link a score row back to its reservation (Bloc 4).
alter table public.rushpi_scores
  add column if not exists submission_id uuid null;
create unique index if not exists rushpi_scores_submission_id_uidx
  on public.rushpi_scores (submission_id) where submission_id is not null;

-- ==========================================================================
-- 2. Non-destructive backfill of historical Daily attempts (Bloc 5)
-- ==========================================================================
-- Rebuild reservations for existing ranked Daily scores so the 3/day limit
-- keeps counting past runs. Synthetic uuid per row; marked 'completed'. Old
-- number collisions keep a single reservation (ON CONFLICT DO NOTHING) — no
-- score row is touched.

insert into public.rushpi_ranked_attempts (
  submission_id, pi_user_uid, pi_username, game_mode, challenge_date, challenge_id,
  rules_version, token_challenge_version, attempt_number, status,
  score_row_id, claimed_at, completed_at, updated_at
)
select
  gen_random_uuid(),
  s.pi_user_uid,
  coalesce(nullif(s.pi_username, ''), 'pioneer'),
  'daily',
  s.challenge_date,
  coalesce(nullif(s.challenge_id, ''), 'RUSHPI-' || s.challenge_date::text),
  coalesce(s.rules_version, 1),
  s.token_challenge_version,
  s.ranked_attempt_number::smallint,
  'completed',
  s.id::text,
  s.created_at,
  s.created_at,
  now()
from public.rushpi_scores s
where s.game_mode = 'daily'
  and s.pi_user_uid is not null
  and s.challenge_date is not null
  and s.ranked_attempt_number between 1 and 3
on conflict (pi_user_uid, challenge_date, attempt_number) do nothing;

-- ==========================================================================
-- 3. Atomic reservation functions (Bloc 6)
-- ==========================================================================

-- ---- CLAIM ---------------------------------------------------------------
create or replace function public.claim_rushpi_daily_attempt_v2(
  p_submission_id           uuid,
  p_pi_user_uid             text,
  p_pi_username             text,
  p_challenge_date          date,
  p_challenge_id            text,
  p_rules_version           integer,
  p_token_challenge_version integer
)
returns table (
  status         text,
  attempt_number smallint,
  used_count     integer,
  left_count     integer,
  submission_id  uuid,
  challenge_date date,
  challenge_id   text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.rushpi_ranked_attempts%rowtype;
  v_used     integer;
  v_slot     smallint;
begin
  -- Serialize all claim/finalize work for this (user, day).
  perform pg_advisory_xact_lock(hashtext(p_pi_user_uid), hashtext(p_challenge_date::text));

  -- Idempotent re-claim / conflict detection by submission_id.
  select * into v_existing
  from public.rushpi_ranked_attempts r
  where r.submission_id = p_submission_id;

  if found then
    -- already_claimed ONLY for a still-open reservation of the exact same
    -- identity/challenge/version (token version compared null-safely). A closed
    -- reservation (completed/rejected/expired) can never back a new run (P4.1).
    if v_existing.pi_user_uid = p_pi_user_uid
       and v_existing.challenge_date = p_challenge_date
       and v_existing.challenge_id = p_challenge_id
       and v_existing.rules_version = p_rules_version
       and v_existing.token_challenge_version is not distinct from p_token_challenge_version
       and v_existing.status = 'claimed' then
      select count(*)::int into v_used
      from public.rushpi_ranked_attempts r
      where r.pi_user_uid = p_pi_user_uid and r.challenge_date = p_challenge_date;
      return query select 'already_claimed'::text, v_existing.attempt_number, v_used,
                          greatest(0, 3 - v_used), v_existing.submission_id,
                          v_existing.challenge_date, v_existing.challenge_id;
      return;
    end if;
    -- Same id but different identity/challenge/version, or a closed reservation
    -- → conflict, consume nothing.
    return query select 'submission_conflict'::text, null::smallint, null::int,
                        null::int, p_submission_id, p_challenge_date, p_challenge_id;
    return;
  end if;

  -- Count ALL Daily reservations for this user/day (every version & status).
  select count(*)::int into v_used
  from public.rushpi_ranked_attempts r
  where r.pi_user_uid = p_pi_user_uid and r.challenge_date = p_challenge_date;

  if v_used >= 3 then
    return query select 'limit_reached'::text, null::smallint, v_used, 0,
                        p_submission_id, p_challenge_date, p_challenge_id;
    return;
  end if;

  -- First free slot in 1..3 (never blindly count+1 — respect historical holes).
  select min(n)::smallint into v_slot
  from generate_series(1, 3) n
  where not exists (
    select 1 from public.rushpi_ranked_attempts r
    where r.pi_user_uid = p_pi_user_uid
      and r.challenge_date = p_challenge_date
      and r.attempt_number = n
  );

  if v_slot is null then
    return query select 'limit_reached'::text, null::smallint, v_used, 0,
                        p_submission_id, p_challenge_date, p_challenge_id;
    return;
  end if;

  insert into public.rushpi_ranked_attempts (
    submission_id, pi_user_uid, pi_username, game_mode, challenge_date, challenge_id,
    rules_version, token_challenge_version, attempt_number, status
  ) values (
    p_submission_id, p_pi_user_uid, p_pi_username, 'daily', p_challenge_date, p_challenge_id,
    p_rules_version, p_token_challenge_version, v_slot, 'claimed'
  );

  return query select 'claimed'::text, v_slot, v_used + 1, greatest(0, 3 - (v_used + 1)),
                      p_submission_id, p_challenge_date, p_challenge_id;
end;
$$;

-- ---- ATTEMPT STATUS ------------------------------------------------------
create or replace function public.get_rushpi_daily_attempt_status_v2(
  p_pi_user_uid  text,
  p_challenge_date date
)
returns table (used_count integer, left_count integer, max_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  select count(*)::int into v_used
  from public.rushpi_ranked_attempts r
  where r.pi_user_uid = p_pi_user_uid and r.challenge_date = p_challenge_date;
  return query select v_used, greatest(0, 3 - v_used), 3;
end;
$$;

-- ---- FINALIZE ------------------------------------------------------------
create or replace function public.finalize_rushpi_daily_score_v2(
  p_submission_id           uuid,
  p_pi_user_uid             text,
  p_pi_username             text,
  p_challenge_date          date,
  p_challenge_id            text,
  p_result_digest           text,
  p_score                   integer,
  p_energy_collected        integer,
  p_max_combo               integer,
  p_obstacles_hit           integer,
  p_duration_seconds        integer,
  p_rules_version           integer,
  p_token_challenge_version integer,
  p_token_points            integer,
  p_tokens_collected_count  integer,
  p_token_ids_collected     jsonb,
  p_is_valid                boolean
)
returns table (status text, score_row_id text, attempt_number smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res     public.rushpi_ranked_attempts%rowtype;
  v_score_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_pi_user_uid), hashtext(p_challenge_date::text));

  select * into v_res
  from public.rushpi_ranked_attempts r
  where r.submission_id = p_submission_id;

  if not found then
    return query select 'not_claimed'::text, null::text, null::smallint;
    return;
  end if;

  -- The reservation must belong to the verified identity and challenge.
  if v_res.pi_user_uid <> p_pi_user_uid
     or v_res.challenge_date <> p_challenge_date
     or v_res.challenge_id <> p_challenge_id then
    return query select 'submission_conflict'::text, null::text, null::smallint;
    return;
  end if;

  -- 30-minute finalize window, enforced HERE under the advisory lock (P4.1):
  -- a claimed reservation older than the window expires atomically — no score
  -- row is created and the attempt stays consumed.
  if v_res.status = 'claimed'
     and v_res.claimed_at < now() - interval '30 minutes' then
    update public.rushpi_ranked_attempts
    set status = 'expired',
        completed_at = now(),
        updated_at = now()
    where submission_id = p_submission_id;
    return query select 'expired'::text, null::text, v_res.attempt_number;
    return;
  end if;

  -- Idempotent replays.
  if v_res.status = 'completed' or v_res.status = 'rejected' then
    if v_res.result_digest is not distinct from p_result_digest then
      return query select 'already_completed'::text, v_res.score_row_id, v_res.attempt_number;
    else
      return query select 'submission_conflict'::text, null::text, null::smallint;
    end if;
    return;
  end if;

  if v_res.status = 'expired' then
    return query select 'expired'::text, null::text, v_res.attempt_number;
    return;
  end if;

  -- status = 'claimed' (within the window) → insert + finalize, one transaction.
  insert into public.rushpi_scores (
    pi_user_uid, pi_username, score, energy_collected, max_combo, obstacles_hit,
    duration_seconds, game_mode, is_valid, challenge_id, challenge_date,
    ranked_attempt_number, rules_version, token_challenge_version,
    token_points, tokens_collected_count, token_ids_collected, submission_id
  ) values (
    p_pi_user_uid, p_pi_username, p_score, p_energy_collected, p_max_combo, p_obstacles_hit,
    p_duration_seconds, 'daily', p_is_valid, p_challenge_id, p_challenge_date,
    v_res.attempt_number, p_rules_version, p_token_challenge_version,
    p_token_points, p_tokens_collected_count, coalesce(p_token_ids_collected, '[]'::jsonb),
    p_submission_id
  )
  returning id into v_score_id;

  update public.rushpi_ranked_attempts
  set status = 'completed',
      result_digest = p_result_digest,
      score_row_id = v_score_id::text,
      completed_at = now(),
      updated_at = now()
  where submission_id = p_submission_id;

  return query select 'completed'::text, v_score_id::text, v_res.attempt_number;
end;
$$;

-- ---- REJECT --------------------------------------------------------------
create or replace function public.reject_rushpi_daily_attempt_v2(
  p_submission_id  uuid,
  p_pi_user_uid    text,
  p_challenge_date date,
  p_rejection_code text
)
returns table (status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.rushpi_ranked_attempts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_pi_user_uid), hashtext(p_challenge_date::text));

  select * into v_res
  from public.rushpi_ranked_attempts r
  where r.submission_id = p_submission_id;

  if not found then
    return query select 'not_claimed'::text;
    return;
  end if;

  if v_res.pi_user_uid <> p_pi_user_uid or v_res.challenge_date <> p_challenge_date then
    return query select 'submission_conflict'::text;
    return;
  end if;

  -- Already finalized → idempotent (keep the attempt consumed).
  if v_res.status in ('completed', 'rejected', 'expired') then
    return query select v_res.status;
    return;
  end if;

  update public.rushpi_ranked_attempts
  set status = 'rejected',
      rejection_code = left(coalesce(p_rejection_code, 'REJECTED'), 64),
      completed_at = now(),
      updated_at = now()
  where submission_id = p_submission_id;

  return query select 'rejected'::text;
end;
$$;

-- ==========================================================================
-- 4. Lock down function execution to the service role only
-- ==========================================================================
do $$
declare fn text;
begin
  foreach fn in array array[
    'claim_rushpi_daily_attempt_v2(uuid,text,text,date,text,integer,integer)',
    'get_rushpi_daily_attempt_status_v2(text,date)',
    'finalize_rushpi_daily_score_v2(uuid,text,text,date,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,jsonb,boolean)',
    'reject_rushpi_daily_attempt_v2(uuid,text,date,text)'
  ]
  loop
    execute format('revoke all on function public.%s from public;', fn);
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('revoke all on function public.%s from authenticated;', fn);
    execute format('grant execute on function public.%s to service_role;', fn);
  end loop;
end $$;

-- ==========================================================================
-- 5. Verification queries (run manually; not part of the migration effect)
-- ==========================================================================
-- Reservation table present:
--   select count(*) from public.rushpi_ranked_attempts;
--
-- Backfill sanity — reservations vs distinct ranked Daily score slots:
--   select
--     (select count(*) from public.rushpi_ranked_attempts) as reservations,
--     (select count(*) from (
--        select distinct pi_user_uid, challenge_date, ranked_attempt_number
--        from public.rushpi_scores
--        where game_mode='daily' and pi_user_uid is not null
--          and challenge_date is not null and ranked_attempt_number between 1 and 3
--      ) d) as distinct_score_slots;
--
-- Historical (uid, date, attempt_number) collisions that were de-duplicated:
--   select pi_user_uid, challenge_date, ranked_attempt_number, count(*)
--   from public.rushpi_scores
--   where game_mode='daily' and challenge_date is not null
--     and ranked_attempt_number between 1 and 3
--   group by 1,2,3 having count(*) > 1;
--
-- Functions present:
--   select proname from pg_proc where proname like '%rushpi_daily%';
