-- Rush Pi — Phase 11B-P4 SQL self-test for the ranked-attempt functions.
--
-- Run AFTER migration_11b_p4.sql, in a scratch/staging database. It wraps
-- everything in a transaction and ROLLBACKs at the end, so it leaves NO data.
-- All fixtures use clearly test-prefixed uids. Any failed assertion raises an
-- exception (which aborts + rolls back).
--
-- NOTE: this file is a deliverable; it has NOT been executed here (no database
-- was available). Run it manually to validate the functions.

begin;

do $$
declare
  v_date date := current_date;
  v_cid  text := 'RUSHPI-' || current_date::text || '-TOKEN-V1';
  r record;
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  claimed_count int := 0;
  limited_count int := 0;
  i int;
begin
  -- 1-3: three successive claims → attempts 1, 2, 3.
  select * into r from claim_rushpi_daily_attempt_v2(s1,'test-uid-alpha','testAlpha',v_date,v_cid,2,1);
  if r.status <> 'claimed' or r.attempt_number <> 1 then raise exception 'T1: %/%', r.status, r.attempt_number; end if;
  select * into r from claim_rushpi_daily_attempt_v2(s2,'test-uid-alpha','testAlpha',v_date,v_cid,2,1);
  if r.status <> 'claimed' or r.attempt_number <> 2 then raise exception 'T2: %/%', r.status, r.attempt_number; end if;
  select * into r from claim_rushpi_daily_attempt_v2(s3,'test-uid-alpha','testAlpha',v_date,v_cid,2,1);
  if r.status <> 'claimed' or r.attempt_number <> 3 then raise exception 'T3: %/%', r.status, r.attempt_number; end if;

  -- 4: fourth claim → limit_reached.
  select * into r from claim_rushpi_daily_attempt_v2(s4,'test-uid-alpha','testAlpha',v_date,v_cid,2,1);
  if r.status <> 'limit_reached' then raise exception 'T4: %', r.status; end if;

  -- 5: re-claiming the same submission id → already_claimed, same slot, no extra.
  select * into r from claim_rushpi_daily_attempt_v2(s1,'test-uid-alpha','testAlpha',v_date,v_cid,2,1);
  if r.status <> 'already_claimed' or r.attempt_number <> 1 then raise exception 'T5: %/%', r.status, r.attempt_number; end if;

  -- 6: same submission id, different uid → conflict.
  select * into r from claim_rushpi_daily_attempt_v2(s1,'test-uid-beta','testBeta',v_date,v_cid,2,1);
  if r.status <> 'submission_conflict' then raise exception 'T6: %', r.status; end if;

  -- 7: "concurrency" — 5 distinct ids for a fresh user yield at most 3 claims.
  for i in 1..5 loop
    select * into r from claim_rushpi_daily_attempt_v2(gen_random_uuid(),'test-uid-conc','testConc',v_date,v_cid,2,1);
    if r.status = 'claimed' then claimed_count := claimed_count + 1;
    elsif r.status = 'limit_reached' then limited_count := limited_count + 1; end if;
  end loop;
  if claimed_count <> 3 or limited_count <> 2 then raise exception 'T7: claimed=% limited=%', claimed_count, limited_count; end if;

  -- 8: finalize s1 → one score row.
  select * into r from finalize_rushpi_daily_score_v2(
    s1,'test-uid-alpha','testAlpha',v_date,v_cid,'digest-A',
    1000,10,3,2,60,2,1,750,1,'["bitcoin"]'::jsonb,true);
  if r.status <> 'completed' then raise exception 'T8: %', r.status; end if;
  if (select count(*) from public.rushpi_scores where submission_id = s1) <> 1 then raise exception 'T8b: score count'; end if;

  -- 9: re-finalize same digest → already_completed, still one row.
  select * into r from finalize_rushpi_daily_score_v2(
    s1,'test-uid-alpha','testAlpha',v_date,v_cid,'digest-A',
    1000,10,3,2,60,2,1,750,1,'["bitcoin"]'::jsonb,true);
  if r.status <> 'already_completed' then raise exception 'T9: %', r.status; end if;
  if (select count(*) from public.rushpi_scores where submission_id = s1) <> 1 then raise exception 'T9b: duplicate row'; end if;

  -- 10: re-finalize different digest → conflict.
  select * into r from finalize_rushpi_daily_score_v2(
    s1,'test-uid-alpha','testAlpha',v_date,v_cid,'digest-B',
    9999,10,3,2,60,2,1,750,1,'["bitcoin"]'::jsonb,true);
  if r.status <> 'submission_conflict' then raise exception 'T10: %', r.status; end if;

  -- 11: reject s2 → rejected.
  select * into r from reject_rushpi_daily_attempt_v2(s2,'test-uid-alpha',v_date,'BAD_PAYLOAD');
  if r.status <> 'rejected' then raise exception 'T11: %', r.status; end if;
  if (select status from public.rushpi_ranked_attempts where submission_id = s2) <> 'rejected' then raise exception 'T11b'; end if;

  -- 12: an expired reservation cannot be finalized.
  update public.rushpi_ranked_attempts set status='expired', completed_at=now() where submission_id = s3;
  select * into r from finalize_rushpi_daily_score_v2(
    s3,'test-uid-alpha','testAlpha',v_date,v_cid,'digest-C',
    500,5,1,2,60,2,1,200,1,'["aave"]'::jsonb,true);
  if r.status <> 'expired' then raise exception 'T12: %', r.status; end if;

  -- 13: status counts ALL reservations of the day (claimed+completed+rejected+expired).
  select * into r from get_rushpi_daily_attempt_status_v2('test-uid-alpha', v_date);
  if r.used_count <> 3 or r.left_count <> 0 or r.max_count <> 3 then
    raise exception 'T13: used=% left=%', r.used_count, r.left_count;
  end if;

  -- 14: a rejected attempt still consumes its slot.
  select * into r from claim_rushpi_daily_attempt_v2(gen_random_uuid(),'test-uid-gamma','testGamma',v_date,v_cid,2,1);
  if r.status <> 'claimed' then raise exception 'T14a: %', r.status; end if;
  perform reject_rushpi_daily_attempt_v2(r.submission_id,'test-uid-gamma',v_date,'X');
  select * into r from get_rushpi_daily_attempt_status_v2('test-uid-gamma', v_date);
  if r.used_count <> 1 then raise exception 'T14: used=%', r.used_count; end if;

  -- ==== Phase 11B-P4.1 lifecycle scenarios ================================

  -- 15: a claimed reservation older than 30 minutes expires atomically inside
  -- finalize: status expired, NO score row, attempt still counted.
  declare
    s_old uuid := gen_random_uuid();
    used_before int;
  begin
    select * into r from claim_rushpi_daily_attempt_v2(s_old,'test-uid-delta','testDelta',v_date,v_cid,2,1);
    if r.status <> 'claimed' then raise exception 'T15a: %', r.status; end if;
    update public.rushpi_ranked_attempts
      set claimed_at = now() - interval '31 minutes' where submission_id = s_old;
    select used_count into used_before from get_rushpi_daily_attempt_status_v2('test-uid-delta', v_date);
    select * into r from finalize_rushpi_daily_score_v2(
      s_old,'test-uid-delta','testDelta',v_date,v_cid,'digest-old',
      900,9,2,1,60,2,1,538,1,'["solana"]'::jsonb,true);
    if r.status <> 'expired' then raise exception 'T15b: %', r.status; end if;
    if (select count(*) from public.rushpi_scores where submission_id = s_old) <> 0 then
      raise exception 'T15c: score row created for expired reservation';
    end if;
    if (select status from public.rushpi_ranked_attempts where submission_id = s_old) <> 'expired' then
      raise exception 'T15d: reservation not marked expired';
    end if;
    select * into r from get_rushpi_daily_attempt_status_v2('test-uid-delta', v_date);
    if r.used_count <> used_before then raise exception 'T15e: attempt no longer counted'; end if;
  end;

  -- 16: re-claim rules — same id must NOT restart a run once closed.
  declare
    s_c uuid := gen_random_uuid();
  begin
    -- 16a: still-claimed same reservation → already_claimed (same slot).
    select * into r from claim_rushpi_daily_attempt_v2(s_c,'test-uid-eps','testEps',v_date,v_cid,2,1);
    if r.status <> 'claimed' then raise exception 'T16a1: %', r.status; end if;
    select * into r from claim_rushpi_daily_attempt_v2(s_c,'test-uid-eps','testEps',v_date,v_cid,2,1);
    if r.status <> 'already_claimed' then raise exception 'T16a2: %', r.status; end if;

    -- 16b: same id, DIFFERENT token_challenge_version → conflict.
    select * into r from claim_rushpi_daily_attempt_v2(s_c,'test-uid-eps','testEps',v_date,v_cid,2,2);
    if r.status <> 'submission_conflict' then raise exception 'T16b: %', r.status; end if;

    -- 16c: completed reservation → conflict on re-claim.
    perform finalize_rushpi_daily_score_v2(
      s_c,'test-uid-eps','testEps',v_date,v_cid,'digest-eps',
      800,8,2,1,60,2,1,416,1,'["ripple"]'::jsonb,true);
    select * into r from claim_rushpi_daily_attempt_v2(s_c,'test-uid-eps','testEps',v_date,v_cid,2,1);
    if r.status <> 'submission_conflict' then raise exception 'T16c: %', r.status; end if;
  end;

  -- 16d: rejected reservation → conflict on re-claim.
  declare
    s_r uuid := gen_random_uuid();
  begin
    perform claim_rushpi_daily_attempt_v2(s_r,'test-uid-zeta','testZeta',v_date,v_cid,2,1);
    perform reject_rushpi_daily_attempt_v2(s_r,'test-uid-zeta',v_date,'X');
    select * into r from claim_rushpi_daily_attempt_v2(s_r,'test-uid-zeta','testZeta',v_date,v_cid,2,1);
    if r.status <> 'submission_conflict' then raise exception 'T16d: %', r.status; end if;
  end;

  -- 16e: expired reservation → conflict on re-claim.
  declare
    s_e uuid := gen_random_uuid();
  begin
    perform claim_rushpi_daily_attempt_v2(s_e,'test-uid-eta','testEta',v_date,v_cid,2,1);
    update public.rushpi_ranked_attempts set status='expired', completed_at=now() where submission_id = s_e;
    select * into r from claim_rushpi_daily_attempt_v2(s_e,'test-uid-eta','testEta',v_date,v_cid,2,1);
    if r.status <> 'submission_conflict' then raise exception 'T16e: %', r.status; end if;
  end;

  -- 17: idempotent retry preserves is_valid — an is_valid=false score row stays
  -- false; already_completed exposes the SAME row (no second row, no flip).
  declare
    s_iv uuid := gen_random_uuid();
    v_row_id text;
  begin
    perform claim_rushpi_daily_attempt_v2(s_iv,'test-uid-theta','testTheta',v_date,v_cid,2,1);
    select * into r from finalize_rushpi_daily_score_v2(
      s_iv,'test-uid-theta','testTheta',v_date,v_cid,'digest-iv',
      99999,10,3,2,60,2,1,750,1,'["bitcoin"]'::jsonb,false); -- implausible → is_valid=false
    if r.status <> 'completed' then raise exception 'T17a: %', r.status; end if;
    v_row_id := r.score_row_id;
    if (select is_valid from public.rushpi_scores where submission_id = s_iv) <> false then
      raise exception 'T17b: stored is_valid should be false';
    end if;
    select * into r from finalize_rushpi_daily_score_v2(
      s_iv,'test-uid-theta','testTheta',v_date,v_cid,'digest-iv',
      99999,10,3,2,60,2,1,750,1,'["bitcoin"]'::jsonb,false);
    if r.status <> 'already_completed' or r.score_row_id <> v_row_id then
      raise exception 'T17c: %/%', r.status, r.score_row_id;
    end if;
    if (select count(*) from public.rushpi_scores where submission_id = s_iv) <> 1 then
      raise exception 'T17d: duplicate score row';
    end if;
    if (select is_valid from public.rushpi_scores where submission_id = s_iv) <> false then
      raise exception 'T17e: is_valid flipped on retry';
    end if;
  end;

  -- ==== Phase 11B-P4.1 leaderboard deduplication ==========================
  -- Isolated on a past date no real data uses; global assertions use very high
  -- test scores (< 50000 cap) so they rank first even on a populated database.
  declare
    lb_date  date := date '2001-01-01';
    lb_date2 date := date '2001-01-02';
    lb_cid   text := 'RUSHPI-2001-01-01-TOKEN-V1';
    lb_cid2  text := 'RUSHPI-2001-01-02-TOKEN-V1';
    lb_count int;
    lb_row   record;
    has_uid  boolean;
  begin
    -- Fixtures. LB1: same UID, three valid Daily v2 scores (1000 / 2500 / 1800).
    insert into public.rushpi_scores
      (pi_user_uid, pi_username, score, energy_collected, max_combo, obstacles_hit,
       duration_seconds, game_mode, is_valid, challenge_id, challenge_date,
       rules_version, token_points, tokens_collected_count)
    values
      ('test-lb-uid1','lbAlpha',1000,10,3,5,60,'daily',true,lb_cid,lb_date,2,300,2),
      ('test-lb-uid1','lbAlpha',2500,20,5,3,60,'daily',true,lb_cid,lb_date,2,900,4),
      ('test-lb-uid1','lbAlpha',1800,15,4,4,60,'daily',true,lb_cid,lb_date,2,600,3),
      -- LB2: same username as another user but a DIFFERENT uid → stays distinct.
      ('test-lb-uid2','lbAlpha',2000,12,4,6,60,'daily',true,lb_cid,lb_date,2,700,3),
      -- LB3: higher score but is_valid=false → ignored.
      ('test-lb-uid1','lbAlpha',9000,30,9,0,60,'daily',false,lb_cid,lb_date,2,1200,6),
      -- LB4: rules_version=1 row → ignored by v2 boards.
      ('test-lb-uid1','lbAlpha',8000,25,8,1,60,'daily',true,lb_cid,lb_date,1,0,0),
      -- LB5: other challenge_date and other challenge_id → ignored by daily.
      ('test-lb-uid1','lbAlpha',7000,22,7,2,60,'daily',true,lb_cid2,lb_date2,2,800,4),
      ('test-lb-uid1','lbAlpha',6500,21,6,2,60,'daily',true,'RUSHPI-OTHER',lb_date,2,750,4),
      -- LB7: exact-score tie between two users → token_points breaks it, then
      -- tokens_collected_count, then obstacles_hit, then created_at.
      ('test-lb-uid3','lbTieA',1500,10,3,4,60,'daily',true,lb_cid,lb_date,2,500,3),
      ('test-lb-uid4','lbTieB',1500,10,3,4,60,'daily',true,lb_cid,lb_date,2,400,3);

    -- 1) One row per uid, best kept: uid1 → 2500 (not 9000/8000/7000/6500).
    select count(*) into lb_count
    from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50) t
    where t.pi_username = 'lbAlpha';
    if lb_count <> 2 then raise exception 'LB1a: lbAlpha rows=% (want 2: uid1+uid2)', lb_count; end if;
    select * into lb_row from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50) t
      order by t.score desc limit 1;
    if lb_row.score <> 2500 then raise exception 'LB1b: top=% (want 2500)', lb_row.score; end if;

    -- 2) Two uids sharing a username remain two distinct entries (checked above:
    -- exactly 2 lbAlpha rows — one per uid: 2500 and 2000).

    -- 3/4/5) invalid, v1, other-date and other-cid rows are all absent: the only
    -- scores present must be 2500, 2000, 1500, 1500.
    select count(*) into lb_count from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50);
    if lb_count <> 4 then raise exception 'LB3-5: rows=% (want 4)', lb_count; end if;
    if exists (select 1 from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50) t
               where t.score in (9000, 8000, 7000, 6500)) then
      raise exception 'LB3-5b: excluded rows leaked into the board';
    end if;

    -- 7) Tie-break: lbTieA (token_points 500) must rank above lbTieB (400).
    -- Re-apply the documented ordering explicitly so the assertion is stable.
    select t.pi_username into lb_row
    from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50) t
    where t.score = 1500
    order by t.token_points desc, t.tokens_collected_count desc,
             t.obstacles_hit asc, t.created_at asc
    limit 1;
    if lb_row.pi_username <> 'lbTieA' then
      raise exception 'LB7: tie winner=%', lb_row.pi_username;
    end if;
    if (select count(*) from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 50) t
        where t.score = 1500) <> 2 then
      raise exception 'LB7b: both tied users must be present';
    end if;

    -- 8a) No pi_user_uid column in the result shape.
    select to_jsonb(t) ? 'pi_user_uid' into has_uid
    from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 1) t limit 1;
    if has_uid then raise exception 'LB8a: pi_user_uid exposed'; end if;

    -- 8b) Limit applies AFTER deduplication: 4 distinct users, p_limit=2 → the
    -- two best users (2500 then 2000), not two rows of the same user.
    select count(distinct t.pi_username || t.score::text) into lb_count
    from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 2) t;
    if lb_count <> 2 then raise exception 'LB8b: limit rows=%', lb_count; end if;
    if exists (select 1 from get_rushpi_daily_leaderboard_v2(lb_date, lb_cid, 2) t
               where t.score not in (2500, 2000)) then
      raise exception 'LB8c: limit kept the wrong users';
    end if;

    -- 6) Global: best valid v2 across ALL days per uid. Use huge test scores so
    -- they lead even on a populated database.
    insert into public.rushpi_scores
      (pi_user_uid, pi_username, score, energy_collected, max_combo, obstacles_hit,
       duration_seconds, game_mode, is_valid, challenge_id, challenge_date,
       rules_version, token_points, tokens_collected_count)
    values
      ('test-lb-uid9','lbGlobal',49000,10,3,5,60,'daily',true,lb_cid,lb_date,2,900,4),
      ('test-lb-uid9','lbGlobal',49900,12,4,4,60,'daily',true,lb_cid2,lb_date2,2,950,5);
    select count(*) into lb_count
    from get_rushpi_global_leaderboard_v2(100) t where t.pi_username = 'lbGlobal';
    if lb_count <> 1 then raise exception 'LB6a: lbGlobal rows=%', lb_count; end if;
    select t.score into lb_count
    from get_rushpi_global_leaderboard_v2(100) t where t.pi_username = 'lbGlobal';
    if lb_count <> 49900 then raise exception 'LB6b: global best=% (want 49900)', lb_count; end if;
  end;

  raise notice 'ALL PHASE 11B-P4 SQL TESTS PASSED';
end $$;

rollback;
