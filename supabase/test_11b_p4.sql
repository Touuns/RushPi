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

  raise notice 'ALL PHASE 11B-P4 SQL TESTS PASSED';
end $$;

rollback;
