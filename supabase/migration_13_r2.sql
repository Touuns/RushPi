-- Rush Pi — Phase 13-R2: ranked rules version 3 leaderboard isolation.
--
-- WHY
-- Phase 13-R1 corrected the collision model (the player's visible horizontal
-- position is now authoritative during lane transitions), so scores produced
-- under the corrected rules are not comparable with earlier ones. The two
-- leaderboard functions currently hardcode `s.rules_version = 2`, which would
-- silently keep serving v2 rows as if they were the active board.
--
-- WHAT THIS DOES
-- Replaces the two read-only leaderboard functions with versions that take the
-- rules version as a PARAMETER, defaulting to 3. Nothing else changes.
--
-- SAFETY
--   * Additive and non-destructive: no row is inserted, updated or deleted.
--   * No column is added, renamed or dropped.
--   * Historical v2 rows keep rules_version = 2 and are simply not selected by
--     the active board. They are never relabelled.
--   * NULL / unversioned rows are excluded by the equality test, exactly as
--     before — they can never be treated as v3.
--   * The claim and finalize functions are untouched: they already accept
--     p_rules_version from the API, which now passes the reservation's version.
--   * Idempotent: safe to run more than once.
--
-- DEPLOYMENT ORDER (do NOT run during Phase 13-R2 — branch-only)
--   1. Apply this migration in the Supabase SQL editor.
--        At this point the boards read v3 and are empty; v2 rows still exist
--        and are simply not shown. Nothing breaks: the API is still on v2 and
--        keeps writing v2 rows, which are now invisible on the active board.
--   2. Deploy the application (API starts issuing v3 challenges and claims).
--        New scores are written as v3 and appear on the boards immediately.
--   Running the migration FIRST is the safe order: a deployed-but-unmigrated
--   database would serve a v2-filtered board while the API writes v3 rows,
--   making every new score invisible.
--
-- The existing index from migration_11b.sql already covers the new predicate:
--   (challenge_date, rules_version, is_valid, score desc)
-- so no new index is required.

-- ---- DAILY BOARD (rules version parameterised) -----------------------------
create or replace function public.get_rushpi_daily_leaderboard_v2(
  p_challenge_date date,
  p_challenge_id   text,
  p_limit          integer default 50,
  p_rules_version  integer default 3
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
      and s.rules_version = p_rules_version
      and s.challenge_date = p_challenge_date
      and s.challenge_id = p_challenge_id
      and s.pi_user_uid is not null
  ) b
  where b.rn = 1
  order by b.score desc, b.token_points desc, b.tokens_collected_count desc,
           b.obstacles_hit asc, b.created_at asc, b.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- ---- GLOBAL BOARD (rules version parameterised) ----------------------------
create or replace function public.get_rushpi_global_leaderboard_v2(
  p_limit         integer default 50,
  p_rules_version integer default 3
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
      and s.rules_version = p_rules_version
      and s.pi_user_uid is not null
  ) b
  where b.rn = 1
  order by b.score desc, b.token_points desc, b.tokens_collected_count desc,
           b.obstacles_hit asc, b.created_at asc, b.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- ---- Drop the superseded 3-arg / 1-arg signatures ---------------------------
-- `create or replace` cannot change a signature, so the previous overloads
-- still exist and would make an unqualified call ambiguous. Dropping them is
-- non-destructive (functions only; no data is touched).
drop function if exists public.get_rushpi_daily_leaderboard_v2(date, text, integer);
drop function if exists public.get_rushpi_global_leaderboard_v2(integer);

-- ---- Re-apply execution grants (service role only) --------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'get_rushpi_daily_leaderboard_v2(date,text,integer,integer)',
    'get_rushpi_global_leaderboard_v2(integer,integer)'
  ]
  loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon', fn);
    execute format('revoke all on function public.%s from authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;
