import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

/**
 * Phase 13G — canonical Phase-13 closure.
 *
 *  Part 1: `attemptCostAcknowledged` — a one-time confirmation before a player
 *          spends their LAST ranked Daily attempt (canonical §9 / §11).
 *  Part 2: Home's two Daily gate modals folded into DailyPreparationScreen
 *          (canonical §15), which becomes the single pre-claim authority.
 *
 * Split, as in the 13E/13F suites:
 *  - persistence (storage.ts) and the gate policy (dailyEntryGate.ts) are
 *    Phaser-free and DOM-free, so they are EXECUTED for real — including with
 *    fake status/claim functions, which is how "no claim" and "exactly one
 *    claim" are proven without touching a production ranked attempt;
 *  - the React wiring has no DOM renderer in this runner and keeps the
 *    repository's source-pinned pattern, narrowly.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const SAVE_KEY = "rushpi.save";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const memory = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = { localStorage: memory };

const storage = await import("../utils/storage.ts");
const gate = await import("./dailyEntryGate.ts");

function freshDevice(): void {
  memory.clear();
}
function seedSave(blob: Record<string, unknown>): void {
  memory.setItem(SAVE_KEY, JSON.stringify(blob));
}
function storedSave(): Record<string, unknown> {
  const raw = memory.getItem(SAVE_KEY);
  assert.ok(raw, "expected a persisted save");
  return JSON.parse(raw as string);
}

const APP_CODE = codeOnly(read("src/App.tsx"));
const HOME = read("src/components/HomeScreen.tsx");
const HOME_CODE = codeOnly(HOME);
const PREP = read("src/components/DailyPreparationScreen.tsx");
const PREP_CODE = codeOnly(PREP);
const RESULT_CODE = codeOnly(read("src/components/ResultScreen.tsx"));
const LEADERBOARD_CODE = codeOnly(read("src/components/LeaderboardScreen.tsx"));
const SERVER_LB = read("src/utils/serverLeaderboard.ts");

/** A status as the read-only endpoint returns it. */
const status = (left: number, max = 3) => ({
  used: max - left,
  left,
  max,
  challengeDate: "2026-09-19",
});

/** Every production source file under src/, excluding tests. */
function sourceFiles(dir = resolve(REPO, "src")): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

// ---- 1-7. attemptCostAcknowledged persistence ------------------------------

test("1. a fresh device defaults to attemptCostAcknowledged = false", () => {
  freshDevice();
  assert.equal(storage.isAttemptCostAcknowledged(), false);
});

test("2. an absent field on a legacy save is FALSE — even with rich Daily history", () => {
  // Unlike the first-run teaching flags, history does not imply this cost was
  // ever confirmed: a veteran is still owed the confirmation once.
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 40, trainingRuns: 9, totalXp: 20000, level: 41 },
    leaderboard: [],
    badges: ["first-run"],
    dailyHistory: [{ date: "2026-09-18", bestScore: 9900, runs: 3, rulesVersion: 3 }],
    campaign: { unlockedLevel: 8, completed: [1, 2, 3], bestScoreByLevel: {}, starsByLevel: {} },
    firstRunCompleted: true,
    coachMarksSeen: true,
    firstDailyResultSeen: true,
  });
  assert.equal(storage.isAttemptCostAcknowledged(), false);
  // ...and the other onboarding flags are untouched by 13G's rule.
  assert.equal(storage.isFirstRunCompleted(), true);
  assert.equal(storage.isFirstDailyResultSeen(), true);
});

test("3/4. explicit false and explicit true are preserved", () => {
  freshDevice();
  seedSave({ version: 1, profile: {}, attemptCostAcknowledged: false });
  assert.equal(storage.isAttemptCostAcknowledged(), false);
  freshDevice();
  seedSave({ version: 1, profile: {}, attemptCostAcknowledged: true });
  assert.equal(storage.isAttemptCostAcknowledged(), true);
});

test("4b. a non-boolean value is not mistaken for an acknowledgement", () => {
  freshDevice();
  seedSave({ version: 1, profile: {}, attemptCostAcknowledged: "yes" });
  assert.equal(storage.isAttemptCostAcknowledged(), false);
});

test("5. markAttemptCostAcknowledged is idempotent, and reading never writes", () => {
  freshDevice();
  storage.isAttemptCostAcknowledged();
  assert.equal(memory.getItem(SAVE_KEY), null, "a pure read must not create a save");
  seedSave({ version: 1, profile: { totalXp: 100 } });
  storage.markAttemptCostAcknowledged();
  const first = memory.getItem(SAVE_KEY);
  storage.markAttemptCostAcknowledged();
  storage.markAttemptCostAcknowledged();
  assert.equal(memory.getItem(SAVE_KEY), first);
  assert.equal(storage.isAttemptCostAcknowledged(), true);
});

test("6. marking preserves progression and every other onboarding flag", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 6, trainingRuns: 2, totalXp: 3100, level: 7, bestDailyScore: 8300, streak: 3 },
    leaderboard: [{ score: 8300, energiesCollected: 30, maxCombo: 9, obstaclesHit: 2, dateISO: "2026-09-18T00:00:00.000Z" }],
    badges: ["first-run", "combo-starter"],
    dailyHistory: [{ date: "2026-09-18", bestScore: 8300, runs: 2, rulesVersion: 3 }],
    campaign: { unlockedLevel: 3, completed: [1, 2], bestScoreByLevel: {}, starsByLevel: { "1": 2 } },
    firstRunCompleted: true,
    coachMarksSeen: true,
    firstDailyResultSeen: true,
  });
  storage.markAttemptCostAcknowledged();
  const after = storedSave();
  assert.equal(after.attemptCostAcknowledged, true);
  assert.equal(after.firstRunCompleted, true);
  assert.equal(after.coachMarksSeen, true);
  assert.equal(after.firstDailyResultSeen, true);
  const profile = after.profile as Record<string, unknown>;
  assert.equal(profile.dailyRuns, 6);
  assert.equal(profile.totalXp, 3100);
  assert.equal(profile.bestDailyScore, 8300);
  assert.equal(profile.streak, 3);
  assert.deepEqual(after.badges, ["first-run", "combo-starter"]);
  assert.equal((after.dailyHistory as unknown[]).length, 1);
});

test("7. Reset Local Data clears the acknowledgement with every other flag", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { totalXp: 900 },
    firstRunCompleted: true,
    coachMarksSeen: true,
    firstDailyResultSeen: true,
    attemptCostAcknowledged: true,
  });
  storage.resetLocalProgress();
  assert.equal(memory.getItem(SAVE_KEY), null);
  assert.equal(storage.isAttemptCostAcknowledged(), false);
  assert.equal(storage.isFirstRunCompleted(), false);
  assert.equal(storage.areCoachMarksSeen(), false);
  assert.equal(storage.isFirstDailyResultSeen(), false);
});

// ---- 8-19. The gate policy, EXECUTED -----------------------------------------

test("8. a local Daily never needs auth, a status read or a claim", () => {
  for (const authenticated of [true, false]) {
    for (const left of [null, 0, 1, 2, 3]) {
      for (const acknowledged of [true, false]) {
        assert.equal(
          gate.decidePrepGate({ ranked: false, authenticated, left, acknowledged }),
          "local",
        );
      }
    }
  }
  // And the component only enters the ranked gate after the local branch has
  // already returned — a local run never reaches fetchAttemptStatus.
  const localReturn = PREP_CODE.indexOf("if (!ranked) {\n");
  const gateEntry = PREP_CODE.indexOf("await continueRanked();");
  assert.ok(localReturn > 0 && gateEntry > localReturn);
  assert.match(PREP_CODE.slice(localReturn, gateEntry), /onReadyRef\.current\(c, null\);\s*return;/);
});

test("9. ranked + unauthenticated → auth gate; no status read, no claim", async () => {
  assert.equal(
    gate.decidePrepGate({ ranked: true, authenticated: false, left: 2, acknowledged: false }),
    "auth",
  );
  let statusReads = 0;
  const outcome = await gate.preflightRankedClaim({
    accessToken: null,
    fetchStatus: async () => {
      statusReads += 1;
      return status(3);
    },
    isAcknowledged: () => false,
  });
  assert.deepEqual(outcome, { gate: "auth" });
  assert.equal(statusReads, 0, "no token → the status endpoint is not even called");
});

test("10. authoritative left = 0 → limit gate; no claim", async () => {
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => status(0),
    isAcknowledged: () => false,
  });
  assert.equal(outcome.gate, "limit");
  // The last-attempt confirmation is never shown with zero remaining.
  assert.notEqual(outcome.gate, "confirm-last");
});

test("11. left = 1 and not acknowledged → confirmation, and nothing is reserved", async () => {
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => status(1),
    isAcknowledged: () => false,
  });
  assert.equal(outcome.gate, "confirm-last");
  // preflightRankedClaim is never given a claim function: it is structurally
  // incapable of reserving an attempt.
  assert.equal(gate.preflightRankedClaim.length, 1, "takes only the args object");
  // Code only: the module's doc comment legitimately NAMES claimAttempt().
  assert.doesNotMatch(codeOnly(read("src/components/dailyEntryGate.ts")), /claimAttempt\(/);
});

test("12. the confirmation appearing does NOT persist the acknowledgement", async () => {
  freshDevice();
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => status(1),
    isAcknowledged: storage.isAttemptCostAcknowledged,
  });
  assert.equal(outcome.gate, "confirm-last");
  assert.equal(storage.isAttemptCostAcknowledged(), false);
  assert.equal(memory.getItem(SAVE_KEY), null, "showing the gate must not even create a save");
  // In the component, the confirm-last outcome only changes the step.
  const confirmCase = PREP_CODE.slice(
    PREP_CODE.indexOf('case "confirm-last":'),
    PREP_CODE.indexOf('case "claim":'),
  );
  assert.match(confirmCase, /setStep\("confirm-last"\)/);
  assert.doesNotMatch(confirmCase, /markAttemptCostAcknowledged|claimOnce/);
});

test("13/14. Cancel and Play locally from the confirmation write nothing and claim nothing", () => {
  const panel = PREP.slice(
    PREP.indexOf('step === "confirm-last" ?'),
    PREP.indexOf('step === "limit" ?'),
  );
  assert.ok(panel.length > 0);
  // Exactly three actions; only the primary is wired to the acceptance.
  assert.equal((panel.match(/<button/g) ?? []).length, 3);
  assert.match(panel, /onClick=\{acceptLastAttempt\}/);
  assert.match(panel, /onClick=\{\(\) => playLocally\(\)\}/);
  assert.match(panel, /onClick=\{onCancel\}/);
  // playLocally hands off without any reservation or acknowledgement.
  const playLocallyFn = PREP_CODE.slice(
    PREP_CODE.indexOf("const playLocally ="),
    PREP_CODE.indexOf("const playAnyway"),
  );
  assert.doesNotMatch(playLocallyFn, /claim|markAttemptCostAcknowledged|consumeRankedAttempt/);
  assert.match(playLocallyFn, /onPlayLocally\(challenge, limitReached\)/);
  // And the acknowledgement has exactly one writer in the whole app.
  let writers = 0;
  for (const file of sourceFiles()) {
    const src = codeOnly(readFileSync(file, "utf8"));
    // Call sites only — not storage.ts's own `function` definition.
    writers += (src.match(/(?<!function )markAttemptCostAcknowledged\(\)/g) ?? []).length;
  }
  assert.equal(writers, 1, "only the explicit acceptance may write the flag");
});

test("15. accepting persists the acknowledgement, then exactly one claim — even on a double tap", async () => {
  // The component's acceptance is exactly: mark, then the single-flight claim.
  const accept = PREP_CODE.slice(
    PREP_CODE.indexOf("const acceptLastAttempt"),
    PREP_CODE.indexOf("const playLocally ="),
  );
  const markAt = accept.indexOf("markAttemptCostAcknowledged()");
  const claimAt = accept.indexOf("void claimOnce()");
  assert.ok(markAt > 0 && claimAt > markAt, "acknowledge first, then claim");

  // Executed model of that exact sequence, with a fake claim.
  freshDevice();
  let claims = 0;
  const order: string[] = [];
  let release!: () => void;
  const claimOnce = gate.singleFlight(async () => {
    claims += 1;
    order.push(`claim(ack=${storage.isAttemptCostAcknowledged()})`);
    await new Promise<void>((r) => (release = r));
  });
  const acceptLastAttempt = () => {
    storage.markAttemptCostAcknowledged();
    void claimOnce();
  };
  acceptLastAttempt();
  acceptLastAttempt(); // double tap while the first claim is in flight
  acceptLastAttempt();
  release();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(claims, 1, "exactly one claim");
  assert.deepEqual(order, ["claim(ack=true)"], "the flag is true before the claim starts");
  assert.equal(storage.isAttemptCostAcknowledged(), true);
});

test("15b. singleFlight allows an explicit retry once the first run has settled", async () => {
  let calls = 0;
  const run = gate.singleFlight(async () => {
    calls += 1;
    throw new Error("network");
  });
  await assert.rejects(run());
  await assert.rejects(run()); // e.g. Retry after a failed claim
  assert.equal(calls, 2);
});

test("16. left = 1 and already acknowledged → no confirmation, claim allowed", async () => {
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => status(1),
    isAcknowledged: () => true,
  });
  assert.equal(outcome.gate, "claim");
});

test("17. left > 1 → no confirmation, claim allowed, and nothing is acknowledged", async () => {
  freshDevice();
  for (const left of [2, 3]) {
    const outcome = await gate.preflightRankedClaim({
      accessToken: "token",
      fetchStatus: async () => status(left),
      isAcknowledged: storage.isAttemptCostAcknowledged,
    });
    assert.equal(outcome.gate, "claim", `${left} left`);
  }
  assert.equal(storage.isAttemptCostAcknowledged(), false, ">1 left must never set the flag");
});

test("17b. the authoritative status is mirrored before the decision", async () => {
  const seen: number[] = [];
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => status(2),
    isAcknowledged: () => false,
    onStatus: (st) => seen.push(st.left),
  });
  assert.equal(outcome.gate, "claim");
  assert.deepEqual(seen, [2]);
  // App mirrors it through the EXISTING sync helper — no second counter.
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const handleAttemptStatus"),
    APP_CODE.indexOf("const startDailyAuto"),
  );
  assert.match(handler, /syncRankedAttemptsFromServer\(status\.challengeDate, status\.used, status\.max\)/);
  assert.match(APP_CODE, /onAttemptStatus=\{handleAttemptStatus\}/);
});

test("18. a claim-side ATTEMPT_LIMIT race still lands safely on the limit state", () => {
  // Status is the preflight authority; the claim is the transactional one. If
  // the claim says ATTEMPT_LIMIT after status said otherwise, the same honest
  // limit state is shown — the client never overrides the server.
  const handler = PREP_CODE.slice(
    PREP_CODE.indexOf("const handleRankedError"),
    PREP_CODE.indexOf("const claimOnce"),
  );
  assert.match(handler, /if \(err\.code === "ATTEMPT_LIMIT"\) \{\s*setStep\("limit"\);/);
  const claim = PREP_CODE.slice(PREP_CODE.indexOf("const claimOnce"), PREP_CODE.indexOf("const continueRanked"));
  assert.match(claim, /catch \(err\) \{\s*handleRankedError\(err\);/);
});

test("19. a failing status read never falls through to a claim", async () => {
  let mirrored = false;
  const outcome = await gate.preflightRankedClaim({
    accessToken: "token",
    fetchStatus: async () => {
      throw new Error("network down");
    },
    isAcknowledged: () => true,
    onStatus: () => {
      mirrored = true;
    },
  });
  assert.equal(outcome.gate, "error");
  assert.equal(mirrored, false, "no status → nothing mirrored");
  const errorCase = PREP_CODE.slice(PREP_CODE.indexOf('case "error":'), PREP_CODE.indexOf("}),", PREP_CODE.indexOf('case "error":')));
  assert.match(errorCase, /handleRankedError\(outcome\.error\)/);
  assert.doesNotMatch(errorCase, /claimOnce/);
});

test("19b. a retry after a claim was already sent re-uses that same idempotent claim", () => {
  // A lost claim response may still have reserved the attempt server-side;
  // re-gating could report "no attempts left" for an attempt this preparation
  // already owns. Retry therefore goes straight back to the same submissionId.
  const retry = PREP_CODE.slice(PREP_CODE.indexOf("const retry ="), PREP_CODE.indexOf("const connect ="));
  assert.match(retry, /if \(claimSentRef\.current && challengeRef\.current && tokenRef\.current\) \{\s*void claimOnce\(\);/);
  const claim = PREP_CODE.slice(PREP_CODE.indexOf("const claimOnce"), PREP_CODE.indexOf("const continueRanked"));
  assert.match(claim, /if \(!submissionIdRef\.current\) submissionIdRef\.current = newSubmissionId\(\);/);
  assert.match(claim, /claimSentRef\.current = true;/);
});

// ---- 20-26. Part 2 — one Daily entry authority -------------------------------

test("20/21. Home no longer owns the connect or no-attempts modal", () => {
  assert.doesNotMatch(HOME, /Connect to Pi to rank your score/);
  assert.doesNotMatch(HOME, /No ranked attempts left today/);
  assert.doesNotMatch(HOME_CODE, /type ModalKind|setModal|modal === "connect"|modal === "no-attempts"/);
  assert.doesNotMatch(HOME_CODE, /onConnectAndPlayDaily|onPlayDailyLocalOnly|onPlayDailyUnranked/);
  assert.doesNotMatch(APP_CODE, /const connectAndPlayDaily|const playDailyLocalOnly|const playDailyUnranked/);
  // Both states now live in the preparation screen, as inline panels.
  assert.match(PREP, /Connect Pi to rank your score/);
  assert.match(PREP, /No ranked attempts left today/);
  assert.doesNotMatch(PREP_CODE, /className="modal-overlay"/, "no modal pasted over preparation");
});

test("22. Home's Daily card routes straight to preparation, deciding nothing", () => {
  assert.match(HOME_CODE, /daily: onPlayRankedDaily,/);
  assert.match(APP_CODE, /const playRankedDaily = useCallback\(\(\) => goDailyPrep\("ranked"\), \[goDailyPrep\]\)/);
  // Home no longer branches on connection or attempts to launch the Daily.
  const launch = HOME_CODE.slice(HOME_CODE.indexOf("const LAUNCH"), HOME_CODE.indexOf("const handleModeClick"));
  assert.doesNotMatch(launch, /piUser|attemptsLeft/);
});

test("23. 13E Try the Daily Run still enters Home's real Daily handler → preparation", () => {
  assert.match(APP_CODE, /setAutoOpenDaily\(true\)/);
  assert.match(HOME_CODE, /handleModeClickRef\.current\("daily"\)/);
  assert.match(HOME_CODE, /onClick=\{\(\) => handleModeClick\("daily"\)\}/);
  // The CTA itself still reaches into no Daily machinery.
  const cta = APP_CODE.slice(
    APP_CODE.indexOf("const tryDailyRunFromFirstResult"),
    APP_CODE.indexOf("const clearAutoOpenDaily"),
  );
  assert.doesNotMatch(cta, /goDailyPrep|claimAttempt|startDailyAuto/);
});

test("24/25. no ranked path — Result, Leaderboard or otherwise — can bypass the gate", () => {
  // claimAttempt has exactly ONE caller in the whole app: the preparation
  // screen's single-flight claimOnce, reachable only through the gate.
  const callers: string[] = [];
  for (const file of sourceFiles()) {
    if (file.endsWith("serverLeaderboard.ts")) continue; // its definition
    const src = codeOnly(readFileSync(file, "utf8"));
    const n = (src.match(/claimAttempt\(/g) ?? []).length;
    if (n > 0) callers.push(`${file.replace(REPO, "")}:${n}`);
  }
  assert.equal(callers.length, 1, `unexpected claim callers: ${callers.join(", ")}`);
  assert.match(callers[0], /DailyPreparationScreen\.tsx:1$/);
  // Result "Play Again" and Leaderboard "Play Daily Run" both go through
  // startDailyAuto → goDailyPrep, never around it.
  assert.match(APP_CODE, /onPlayAgain=\{startDailyAuto\}/);
  assert.match(APP_CODE, /else startDailyAuto\(\);/);
  assert.doesNotMatch(RESULT_CODE, /claimAttempt|goDailyPrep/);
  assert.doesNotMatch(LEADERBOARD_CODE, /claimAttempt|goDailyPrep/);
});

test("26. disconnected Result / Leaderboard replays stay local — no new Pi prompt", () => {
  assert.match(APP_CODE, /goDailyPrep\(piUser \? "ranked" : "local-only"\)/);
});

test("26b. a local choice made at the limit keeps its honest 'limit reached' result", () => {
  assert.match(PREP_CODE, /onClick=\{\(\) => playLocally\(true\)\}/);
  assert.match(APP_CODE, /startPreparedDaily\(c, limitReached \? "limit-reached" : "local-only"\)/);
});

test("26c. the auth gate is an expected state with Connect / Play locally / Cancel", () => {
  const panel = PREP.slice(PREP.indexOf('step === "auth" ?'), PREP.indexOf('step === "confirm-last" ?'));
  assert.match(panel, /Connect Pi to rank your score/);
  assert.match(panel, /onClick=\{connect\}/);
  assert.match(panel, /onClick=\{\(\) => playLocally\(\)\}/);
  assert.match(panel, /onClick=\{onCancel\}/);
  // The attempt cost is still stated before any login (canonical §8).
  assert.match(panel, /Ranked Daily Runs are limited to 3 attempts per day\./);
  // A failed connection stays here with clear copy — never back to Home.
  const connect = PREP_CODE.slice(PREP_CODE.indexOf("const connect ="), PREP_CODE.indexOf("const acceptLastAttempt"));
  assert.match(connect, /setAuthNotice\("Couldn't connect to Pi\. Try again, or play locally\."\);\s*setStep\("auth"\);/);
});

test("26d. the last-attempt copy is the canonical wording, and never styled as an error", () => {
  assert.equal(gate.LAST_ATTEMPT_COPY.title, "This is your last ranked run today.");
  assert.equal(gate.LAST_ATTEMPT_COPY.accept, "Use last ranked run");
  assert.equal(gate.LAST_ATTEMPT_COPY.local, "Play locally");
  const css = read("src/styles/global.css");
  const lastCss = css.slice(css.indexOf(".daily-prep__panel--last {"), css.indexOf(".daily-prep__panel--last .daily-prep__heading"));
  assert.doesNotMatch(lastCss, /--danger|#ff|red/i, "an informed cost, not a destructive action");
});

// ---- 27-30. Regression boundaries --------------------------------------------

test("27. 13F firstDailyResultSeen is untouched and not conflated", () => {
  assert.equal((APP_CODE.match(/markFirstDailyResultSeen\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(PREP_CODE, /firstDailyResultSeen/);
  assert.doesNotMatch(read("src/components/dailyEntryGate.ts"), /firstDailyResultSeen/);
  // 13F's live notice is still built in Home, before preparation.
  assert.match(HOME_CODE, /intro === "daily" && firstDailyPending/);
});

test("28. the Leaderboard still opens on Daily", () => {
  assert.match(LEADERBOARD_CODE, /useState<Tab>\("daily"\)/);
});

test("29. the 13B remaining-attempt label and ranked quit wording are unchanged", () => {
  assert.match(RESULT_CODE, /piConnected \? `Play Again \(\$\{attemptsLeft\} left\)` : "Play Again"/);
  assert.match(
    read("src/components/GameScreen.tsx"),
    /This ranked run is already counted\. Quitting won't give the attempt back\./,
  );
  assert.match(PREP, /No tokens today — this run won't be ranked\. Play anyway\?/);
});

test("30. no API, claim contract, submission, digest or gameplay change", () => {
  // The client functions hit the same unchanged endpoints.
  assert.match(SERVER_LB, /fetch\("\/api\/leaderboard\/attempt-status"/);
  assert.match(SERVER_LB, /fetch\("\/api\/leaderboard\/claim-attempt"/);
  assert.match(SERVER_LB, /body: JSON\.stringify\(\{ submission_id: submissionId \}\)/);
  // Local ranked accounting keeps its single original call site.
  assert.equal((APP_CODE.match(/consumeRankedAttempt\(\)/g) ?? []).length, 1);
  assert.match(APP_CODE, /if \(rankState === "ranked"\) consumeRankedAttempt\(\)/);
  // The gate module and the prep screen never touch scoring or submission.
  for (const src of [PREP_CODE, codeOnly(read("src/components/dailyEntryGate.ts"))]) {
    assert.doesNotMatch(src, /submitServerScore|rulesVersion\s*[:=]\s*\d|consumeRankedAttempt/);
  }
});
