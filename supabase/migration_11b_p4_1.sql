-- Rush Pi — Phase 11B-P4.1 corrective migration: reservation lifecycle fixes.
--
-- For databases where migration_11b_p4.sql has ALREADY been executed. Run this
-- in the Supabase SQL editor. Idempotent; deletes nothing; modifies no score
-- row; only replaces the claim/finalize functions (same signatures) and
-- re-applies their grants. Fresh installations get the same corrected bodies
-- directly from the updated migration_11b_p4.sql.
--
-- Fixes:
--   1. finalize: the 30-minute expiry window is now enforced INSIDE the
--      function, under the same advisory transaction lock (no separate
--      PostgREST PATCH from the endpoint).
--   2. claim: a closed reservation (completed/rejected/expired) can never be
--      re-claimed for a new run; already_claimed also requires a null-safe
--      token_challenge_version match.

-- ---- CLAIM (corrected re-claim rules) -------------------------------------
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
    -- reservation (completed/rejected/expired) can never back a new run.
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

-- ---- FINALIZE (expiry enforced atomically) ---------------------------------
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

-- ---- LEADERBOARDS: one best score per Pi user (P4.1) -----------------------
-- Deduplicated ranked boards. rushpi_scores keeps EVERY run (audit/attempts/
-- idempotence untouched); only this leaderboard view picks one row per player.
-- Best-row selection and global ordering both use the deterministic order:
--   score DESC, token_points DESC, tokens_collected_count DESC,
--   obstacles_hit ASC, created_at ASC, id ASC.
-- pi_user_uid is used for the partition but NEVER returned.

create or replace function public.get_rushpi_daily_leaderboard_v2(
  p_challenge_date date,
  p_challenge_id   text,
  p_limit          integer default 50
)
returns table (
  pi_username            text,
  score                  integer,
  energy_collected       integer,
  max_combo              integer,
  obstacles_hit          integer,
  created_at             timestamptz,
  token_points           integer,
  tokens_collected_count integer
)
language sql
security definer
set search_path = public
as $$
  select b.pi_username, b.score, b.energy_collected, b.max_combo, b.obstacles_hit,
         b.created_at, b.token_points, b.tokens_collected_count
  from (
    select s.*,
           row_number() over (
             partition by s.pi_user_uid
             order by s.score desc, s.token_points desc, s.tokens_collected_count desc,
                      s.obstacles_hit asc, s.created_at asc, s.id asc
           ) as rn
    from public.rushpi_scores s
    where s.game_mode = 'daily'
      and s.is_valid = true
      and s.rules_version = 2
      and s.challenge_date = p_challenge_date
      and s.challenge_id = p_challenge_id
      and s.pi_user_uid is not null
  ) b
  where b.rn = 1
  order by b.score desc, b.token_points desc, b.tokens_collected_count desc,
           b.obstacles_hit asc, b.created_at asc, b.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.get_rushpi_global_leaderboard_v2(
  p_limit integer default 50
)
returns table (
  pi_username            text,
  score                  integer,
  energy_collected       integer,
  max_combo              integer,
  obstacles_hit          integer,
  created_at             timestamptz,
  token_points           integer,
  tokens_collected_count integer
)
language sql
security definer
set search_path = public
as $$
  select b.pi_username, b.score, b.energy_collected, b.max_combo, b.obstacles_hit,
         b.created_at, b.token_points, b.tokens_collected_count
  from (
    select s.*,
           row_number() over (
             partition by s.pi_user_uid
             order by s.score desc, s.token_points desc, s.tokens_collected_count desc,
                      s.obstacles_hit asc, s.created_at asc, s.id asc
           ) as rn
    from public.rushpi_scores s
    where s.game_mode = 'daily'
      and s.is_valid = true
      and s.rules_version = 2
      and s.pi_user_uid is not null
  ) b
  where b.rn = 1
  order by b.score desc, b.token_points desc, b.tokens_collected_count desc,
           b.obstacles_hit asc, b.created_at asc, b.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- ---- Re-apply execution grants (service role only) -------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'claim_rushpi_daily_attempt_v2(uuid,text,text,date,text,integer,integer)',
    'finalize_rushpi_daily_score_v2(uuid,text,text,date,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,jsonb,boolean)',
    'get_rushpi_daily_leaderboard_v2(date,text,integer)',
    'get_rushpi_global_leaderboard_v2(integer)'
  ]
  loop
    execute format('revoke all on function public.%s from public;', fn);
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('revoke all on function public.%s from authenticated;', fn);
    execute format('grant execute on function public.%s to service_role;', fn);
  end loop;
end $$;

-- ==========================================================================
-- Verification queries (run manually; not part of the migration effect)
-- ==========================================================================
-- Both functions present and updated:
--   select proname, prosrc like '%30 minutes%' as has_expiry
--   from pg_proc where proname in
--     ('claim_rushpi_daily_attempt_v2','finalize_rushpi_daily_score_v2');
--
-- Claim body now checks the reservation status:
--   select prosrc like '%status = ''claimed''%' as claim_checks_status
--   from pg_proc where proname = 'claim_rushpi_daily_attempt_v2';
