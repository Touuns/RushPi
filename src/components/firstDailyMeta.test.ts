import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13F — first-Daily meta lesson, one-time first-Daily notice, and the
 * Daily-default Leaderboard.
 *
 * Canonical requirement (docs/Brainstorm/PHASE-13-PLAN-FIRST-RUN-EXPERIENCE.md
 * §14 roadmap): "Meta lesson on the first Daily result; leaderboard defaults to
 * Daily; one-time first-Daily panel". Canonical validation: "First vs second
 * Daily result differ once, then never." Canonical forbidden surfaces: ranked
 * submission, digest, anti-cheat.
 *
 * Split, as in the 13E suite: the persistence rules are Phaser-free and
 * DOM-free so they are executed for real; the React wiring has no DOM renderer
 * in this runner and keeps the repository's established source-pinned pattern,
 * narrowly and only where behaviour cannot be executed.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const SAVE_KEY = "rushpi.save";

/** Minimal in-memory localStorage, installed before storage.ts is imported. */
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
// Pure, DOM-free lesson copy — executed for real (see tests 15-15e).
const lesson = await import("./dailyMetaLesson.ts");

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
const RESULT_SCREEN = read("src/components/ResultScreen.tsx");
const RESULT_SCREEN_CODE = codeOnly(RESULT_SCREEN);
const HOME_SCREEN = read("src/components/HomeScreen.tsx");
const HOME_SCREEN_CODE = codeOnly(HOME_SCREEN);
const INTRO_MODAL_CODE = codeOnly(read("src/components/ModeIntroModal.tsx"));
const LEADERBOARD = read("src/components/LeaderboardScreen.tsx");
const LEADERBOARD_CODE = codeOnly(LEADERBOARD);
const STORAGE_CODE = codeOnly(read("src/utils/storage.ts"));
const PREP_CODE = codeOnly(read("src/components/DailyPreparationScreen.tsx"));

/** The Daily branch of the result screen, isolated. */
const DAILY_START = RESULT_SCREEN.indexOf("if (isDaily) {");
const DAILY_END = RESULT_SCREEN.indexOf("// ---- Training / Survival");
assert.ok(DAILY_START > 0 && DAILY_END > DAILY_START, "could not isolate the Daily branch");
const DAILY_BLOCK = RESULT_SCREEN.slice(DAILY_START, DAILY_END);

// ---- 1-5. firstDailyResultSeen persistence + the critical migration --------

test("1. a fresh device with zero Daily runs → firstDailyResultSeen false", () => {
  freshDevice();
  assert.equal(storage.isFirstDailyResultSeen(), false);
});

test("2. a legacy save with previous Daily runs migrates to TRUE", () => {
  // An experienced player must never be pushed through 13F onboarding.
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 12, trainingRuns: 3, totalXp: 6000, level: 13 },
    leaderboard: [],
    badges: [],
    dailyHistory: [],
    campaign: { unlockedLevel: 3, completed: [1, 2], bestScoreByLevel: {}, starsByLevel: {} },
  });
  assert.equal(storage.isFirstDailyResultSeen(), true);
});

test("3. CRITICAL — a 13D/13E player who finished Training but no Daily stays FALSE", () => {
  // This is the case a naive "a save exists → true" migration would break: the
  // player has a real save and completed onboarding, but is exactly who 13F is
  // for. The distinction must come from Daily history, not save existence.
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 0, trainingRuns: 1, totalXp: 9, level: 1 },
    leaderboard: [],
    badges: ["first-run"],
    dailyHistory: [],
    campaign: { unlockedLevel: 1, completed: [], bestScoreByLevel: {}, starsByLevel: {} },
    firstRunCompleted: true,
    coachMarksSeen: true,
  });
  assert.equal(storage.isFirstDailyResultSeen(), false, "still owed the first-Daily lesson");
  // ...and the 13D/13E flags are untouched by 13F's rule.
  assert.equal(storage.isFirstRunCompleted(), true);
  assert.equal(storage.areCoachMarksSeen(), true);
});

test("4. dailyHistory alone is also sufficient evidence of a finished Daily", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 0 },
    leaderboard: [],
    badges: [],
    dailyHistory: [{ date: "2026-09-01", bestScore: 4200, runs: 1, rulesVersion: 3 }],
    campaign: { unlockedLevel: 1, completed: [], bestScoreByLevel: {}, starsByLevel: {} },
  });
  assert.equal(storage.isFirstDailyResultSeen(), true);
});

test("5. an explicit boolean always wins over the derived value", () => {
  // Explicit false even though the player has Daily history.
  freshDevice();
  seedSave({ version: 1, profile: { dailyRuns: 9 }, firstDailyResultSeen: false });
  assert.equal(storage.isFirstDailyResultSeen(), false);

  // Explicit true even though the player has none.
  freshDevice();
  seedSave({ version: 1, profile: { dailyRuns: 0 }, firstDailyResultSeen: true });
  assert.equal(storage.isFirstDailyResultSeen(), true);
});

// ---- 6-8. mark contract ----------------------------------------------------

test("6. markFirstDailyResultSeen is idempotent", () => {
  freshDevice();
  seedSave({ version: 1, profile: { dailyRuns: 0 }, firstDailyResultSeen: false });
  storage.markFirstDailyResultSeen();
  const first = memory.getItem(SAVE_KEY);
  storage.markFirstDailyResultSeen();
  storage.markFirstDailyResultSeen();
  assert.equal(memory.getItem(SAVE_KEY), first, "repeated marks must not alter the save");
  assert.equal(storage.isFirstDailyResultSeen(), true);
});

test("7. marking preserves all progression and the 13D/13E flags", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 1, trainingRuns: 2, totalXp: 2400, level: 5, bestDailyScore: 7700, streak: 4, bestStreak: 6 },
    leaderboard: [
      { score: 7700, energiesCollected: 33, maxCombo: 11, obstaclesHit: 1, dateISO: "2026-09-14T00:00:00.000Z" },
    ],
    badges: ["first-run", "combo-starter"],
    dailyHistory: [{ date: "2026-09-14", bestScore: 7700, runs: 1, rulesVersion: 3 }],
    campaign: { unlockedLevel: 3, completed: [1, 2], bestScoreByLevel: { "1": 900 }, starsByLevel: { "1": 3 } },
    firstRunCompleted: true,
    coachMarksSeen: true,
    firstDailyResultSeen: false,
  });

  storage.markFirstDailyResultSeen();

  const after = storedSave();
  assert.equal(after.firstDailyResultSeen, true);
  assert.equal(after.firstRunCompleted, true);
  assert.equal(after.coachMarksSeen, true);
  const profile = after.profile as Record<string, unknown>;
  assert.equal(profile.dailyRuns, 1);
  assert.equal(profile.trainingRuns, 2);
  assert.equal(profile.totalXp, 2400);
  assert.equal(profile.bestDailyScore, 7700);
  assert.equal(profile.streak, 4, "streak must not be touched by 13F");
  assert.equal(profile.bestStreak, 6);
  assert.deepEqual(after.badges, ["first-run", "combo-starter"]);
  assert.equal((after.leaderboard as unknown[]).length, 1);
  assert.equal((after.dailyHistory as unknown[]).length, 1);
  assert.equal((after.campaign as Record<string, unknown>).unlockedLevel, 3);
});

test("8. reading the flag never writes a save", () => {
  freshDevice();
  storage.isFirstDailyResultSeen();
  storage.isFirstDailyResultSeen();
  assert.equal(memory.getItem(SAVE_KEY), null, "a pure read must not create a save");
});

test("8b. Reset Local Data clears it with the rest of the save", () => {
  freshDevice();
  seedSave({ version: 1, profile: { dailyRuns: 5 }, firstDailyResultSeen: true, firstRunCompleted: true, coachMarksSeen: true });
  storage.resetLocalProgress();
  assert.equal(memory.getItem(SAVE_KEY), null);
  assert.equal(storage.isFirstDailyResultSeen(), false, "full FTUE is owed again");
  assert.equal(storage.isFirstRunCompleted(), false);
  assert.equal(storage.areCoachMarksSeen(), false);
});

test("8c. no parallel storage system and no SAVE_VERSION bump", () => {
  assert.doesNotMatch(STORAGE_CODE, /rushpi\.firstDaily|rushpi\.meta|rushpi\.onboarding3/);
  assert.match(STORAGE_CODE, /const SAVE_KEY = "rushpi\.save"/);
  assert.match(STORAGE_CODE, /const SAVE_VERSION = 1/);
});

// ---- 9-11. Timing: only a COMPLETED Daily marks the flag -------------------

test("9. the flag is marked only from the game-over path, never on entry/start", () => {
  // Exactly one call site, and it lives inside handleGameOver.
  assert.equal(
    (APP_CODE.match(/markFirstDailyResultSeen\(\)/g) ?? []).length,
    1,
    "exactly one call site",
  );
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const handleGameOver"),
    APP_CODE.indexOf("const retrySync"),
  );
  assert.match(handler, /markFirstDailyResultSeen\(\)/);
  // Entering/preparing/claiming Daily must not mark it.
  for (const entry of [
    "const goDailyPrep",
    "const playRankedDaily",
    "const playDailyLocalOnly",
    "const startPreparedDaily",
    "const tryDailyRunFromFirstResult",
  ]) {
    const start = APP_CODE.indexOf(entry);
    assert.ok(start > 0, `${entry} must exist`);
    const region = APP_CODE.slice(start, start + 900);
    assert.doesNotMatch(region, /markFirstDailyResultSeen/, `${entry} must not mark it`);
  }
  // The preparation screen (which owns the claim) knows nothing about 13F.
  assert.doesNotMatch(PREP_CODE, /firstDailyResultSeen|firstDailyResultLesson/);
});

test("10. the decision is captured BEFORE recordRun increments dailyRuns", () => {
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const handleGameOver"),
    APP_CODE.indexOf("const retrySync"),
  );
  const decisionAt = handler.indexOf("const isFirstDaily = !isFirstDailyResultSeen()");
  const recordAt = handler.indexOf("const o = recordRun(enriched)");
  assert.ok(decisionAt > 0, "the first-Daily decision must exist");
  assert.ok(recordAt > 0, "recordRun must still be called");
  assert.ok(
    decisionAt < recordAt,
    "reading the flag after recordRun would always say 'seen' and the lesson would never appear",
  );
  // recordRun is still called exactly once, unchanged.
  assert.equal((handler.match(/recordRun\(/g) ?? []).length, 1);
});

test("11. only a Daily run can trigger the lesson", () => {
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const handleGameOver"),
    APP_CODE.indexOf("const retrySync"),
  );
  assert.match(handler, /if \(r\.mode === "daily"\) \{[\s\S]*?isFirstDailyResultSeen/);
  assert.match(handler, /setFirstDailyResultLesson\(false\)/, "non-Daily results clear it");
});

// ---- 12-15. First vs second Daily result -----------------------------------

test("12. the first Daily result renders the one-time meta lesson", () => {
  assert.match(DAILY_BLOCK, /\{firstDailyResultLesson && \(/);
  assert.match(DAILY_BLOCK, /className="daily-meta"/);
  assert.match(DAILY_BLOCK, /firstDailyLesson\(serverSync\)\.title/);
  assert.match(DAILY_BLOCK, /firstDailyLesson\(serverSync\)\.text/);
});

test("13. the second Daily result is the ordinary 13C presentation", () => {
  // The lesson and the promoted CTA are both gated on the same session flag,
  // and the else-arm restores the exact 13C action order.
  const actions = DAILY_BLOCK.slice(DAILY_BLOCK.indexOf('<div className="result__actions">'));
  assert.match(actions, /\{firstDailyResultLesson \? \(/);
  assert.match(actions, /\) : \(/, "there must be an ordinary else arm");
  const ordinary = actions.slice(actions.indexOf(") : ("));
  const playIdx = ordinary.indexOf("Play Again");
  const lbIdx = ordinary.indexOf("Leaderboard");
  const homeIdx = ordinary.indexOf("Back Home");
  assert.ok(playIdx > 0 && lbIdx > playIdx && homeIdx > lbIdx, "13C order: Play Again → Leaderboard → Back Home");
  assert.match(ordinary, /className="btn btn--primary"[\s\S]{0,120}onPlayAgain/);
});

test("14. state information is never suppressed on any Daily result", () => {
  // Attempts label, sync status, streak line and the token summary are STATE,
  // not teaching — they must sit outside the one-time gate, above the actions.
  const beforeActions = DAILY_BLOCK.slice(0, DAILY_BLOCK.indexOf('<div className="result__actions">'));
  assert.match(beforeActions, /\{syncMessage && <p className=\{`result__sync/);
  assert.match(beforeActions, /\{streakMessage && <p className="result__streak"/);
  assert.match(beforeActions, /className="token-summary"/);
  assert.match(beforeActions, /\{scoreHero\}/);
  assert.match(beforeActions, /<KeyStats/);
  // Nothing above the actions is gated on the one-time lesson, so the layout
  // above the fold is identical on the first and every later Daily result.
  assert.doesNotMatch(beforeActions, /firstDailyResultLesson/);
});

test("14b. the lesson never pushes the primary CTA below the 13C fold", () => {
  // Canonical acceptance #5 (fixed by Phase 13C): the Daily result's primary
  // action must be reachable without scrolling at 375x667. Measured on a real
  // first Daily, this block is ~104px; above the actions it moved the CTA from
  // 649px to 769px. It therefore renders AFTER the actions and BEFORE details.
  const actionsAt = DAILY_BLOCK.indexOf('<div className="result__actions">');
  const lessonAt = DAILY_BLOCK.indexOf('className="daily-meta"');
  const detailsAt = DAILY_BLOCK.indexOf('<details className="result__details">');
  assert.ok(actionsAt > 0 && lessonAt > 0 && detailsAt > 0);
  assert.ok(lessonAt > actionsAt, "the lesson must not sit above the actions");
  assert.ok(detailsAt > lessonAt, "the lesson must stay above the collapsible details");
});

/**
 * The honesty rule is EXECUTED, not source-pinned: `firstDailyLesson` is a pure
 * function in its own DOM-free module, so every reachable sync state is run for
 * real. This is the deterministic coverage for the ranked (`ok`) branch — the
 * branch that must never be validated by consuming a real production ranked
 * attempt or by fabricating a server submission.
 */
const ALL_SYNC_STATES = [
  "idle",
  "pending",
  "ok",
  "local-only",
  "limit-reached",
  "auth-required",
  "failed-retryable",
  "rejected",
  "conflict",
] as const;

/** Every state whose score did NOT reach the ranked leaderboard. */
const UNRANKED_STATES = ALL_SYNC_STATES.filter((s) => s !== "ok" && s !== "pending");

test("15. ONLY serverSync 'ok' may claim ranked leaderboard placement", () => {
  for (const state of ALL_SYNC_STATES) {
    assert.equal(
      lesson.claimsRankedPlacement(state),
      state === "ok",
      `${state} must ${state === "ok" ? "" : "not "}claim ranked placement`,
    );
  }
  // The ranked branch — deterministic, no production attempt consumed.
  const ok = lesson.firstDailyLesson("ok");
  assert.equal(ok.title, "You're on today's leaderboard");
  assert.match(ok.text, /Ranked Daily runs are scored against every other Pioneer today\./);
});

test("15b. no unranked state is ever told it reached the leaderboard", () => {
  for (const state of UNRANKED_STATES) {
    const { title, text } = lesson.firstDailyLesson(state);
    assert.equal(title, "This run stayed local", `${state} must read as local`);
    assert.doesNotMatch(title, /on today's leaderboard/, `${state} must not claim placement`);
    assert.match(text, /Connect Pi before a Daily run/, `${state} must offer the honest path`);
    // The word "leaderboard" may appear, but only as the thing to connect FOR.
    assert.doesNotMatch(text, /is on today's leaderboard|are on today's leaderboard/);
  }
});

test("15c. 'pending' promises nothing it cannot keep", () => {
  const p = lesson.firstDailyLesson("pending");
  assert.equal(p.title, "Sending your score");
  assert.notEqual(p.title, "You're on today's leaderboard", "must not claim arrival yet");
  assert.equal(lesson.claimsRankedPlacement("pending"), false);
});

test("15d. every variant teaches the streak and adds no reward or new mechanic", () => {
  for (const state of ALL_SYNC_STATES) {
    const { title, text } = lesson.firstDailyLesson(state);
    assert.match(text, /Your streak grows on each day you play a Daily run\./, `${state}`);
    // Compact: one short title + one short sentence pair.
    assert.ok(title.length <= 40, `${state} title stays short`);
    for (const forbidden of ["bonus", "reward", "+XP", "badge", "claim your", "tomorrow"]) {
      const blob = `${title} ${text}`.toLowerCase();
      assert.ok(!blob.includes(forbidden.toLowerCase()), `${state} must not mention ${forbidden}`);
    }
  }
});

test("15e. the lesson module is pure — no React, Phaser, network or storage", () => {
  const src = read("src/components/dailyMetaLesson.ts");
  // Code only: the module's own doc comment legitimately NAMES what it avoids.
  const srcCode = codeOnly(src).toLowerCase();
  for (const forbidden of ["react", "phaser", "fetch(", "localstorage", "usestate", "jsx"]) {
    assert.ok(!srcCode.includes(forbidden), `must not use ${forbidden}`);
  }
  // Only a type-only import, so nothing pulls App.tsx in at runtime.
  assert.match(src, /^import type \{ ServerSyncStatus \} from "\.\.\/App";/m);
  // Streak data is read by the screen, never recomputed anywhere.
  assert.doesNotMatch(RESULT_SCREEN_CODE, /updateStreak|getStreakInfo/);
});

// ---- 16-17. One-time first-Daily notice ------------------------------------

test("16. the first-Daily notice reuses the existing intro modal, not a new one", () => {
  // No second Daily intro component/modal was created.
  assert.match(HOME_SCREEN_CODE, /notice=\{/);
  assert.match(HOME_SCREEN_CODE, /intro === "daily" && firstDailyPending/);
  assert.match(INTRO_MODAL_CODE, /\{notice && <p className="intro-modal__notice">\{notice\}<\/p>\}/);
  assert.match(INTRO_MODAL_CODE, /notice = null/, "must default off for every other mode");
  // ModalKind is unchanged — no extra Home modal state was introduced.
  assert.match(HOME_SCREEN_CODE, /type ModalKind = "none" \| "connect" \| "no-attempts"/);
});

test("17. the notice states LIVE attempt state, never a hardcoded 'run 1 of 3'", () => {
  const noticeExpr = HOME_SCREEN.slice(
    HOME_SCREEN.indexOf("notice={"),
    HOME_SCREEN.indexOf("onPlay={handleIntroPlay}"),
  );
  assert.match(noticeExpr, /\$\{attemptsLeft\} of \$\{maxAttempts\} ranked runs left today/);
  assert.ok(!noticeExpr.includes("1 of 3"), "must not hardcode an attempt position");
  assert.match(noticeExpr, /A local run costs none\./, "local play must be stated as free");
});

test("17b. the notice is shown before any attempt is reserved", () => {
  // The intro modal is a Home surface; the claim lives in the preparation
  // screen, which is only reachable after the intro's Play button.
  assert.match(PREP_CODE, /claimAttempt\(/);
  assert.doesNotMatch(HOME_SCREEN_CODE, /claimAttempt/);
  assert.match(HOME_SCREEN_CODE, /const handleIntroPlay = \(\) => \{/);
});

// ---- 18-21. Leaderboard ----------------------------------------------------

test("18. the Leaderboard opens on the Daily tab", () => {
  assert.match(LEADERBOARD_CODE, /useState<Tab>\("daily"\)/);
  assert.doesNotMatch(LEADERBOARD_CODE, /useState<Tab>\("local"\)/);
});

test("19/20. Local and Global tabs still exist and still work", () => {
  assert.match(LEADERBOARD_CODE, /type Tab = "local" \| "daily" \| "global"/);
  assert.match(LEADERBOARD_CODE, /onClick=\{\(\) => setTab\("local"\)\}/);
  assert.match(LEADERBOARD_CODE, /onClick=\{\(\) => setTab\("global"\)\}/);
  // The on-demand fetch architecture is untouched.
  assert.match(LEADERBOARD_CODE, /const load = tab === "daily" \? fetchDailyLeaderboard : fetchGlobalLeaderboard/);
  assert.match(LEADERBOARD_CODE, /if \(tab === "local"\) return;/);
  assert.match(LEADERBOARD_CODE, /<LocalList entries=\{entries\} \/>/);
});

test("21. the first-result leaderboard action reuses the existing route", () => {
  const actions = DAILY_BLOCK.slice(DAILY_BLOCK.indexOf('<div className="result__actions">'));
  const firstArm = actions.slice(0, actions.indexOf(") : ("));
  assert.match(firstArm, /onClick=\{onLeaderboard\}/, "no separate leaderboard was invented");
  assert.match(firstArm, /className="btn btn--primary"[\s\S]{0,120}onLeaderboard/);
});

// ---- 22-25. Regression boundaries ------------------------------------------

test("22. the 13B attempt label is preserved on both arms", () => {
  const actions = DAILY_BLOCK.slice(DAILY_BLOCK.indexOf('<div className="result__actions">'));
  const occurrences = actions.match(/piConnected \? `Play Again \(\$\{attemptsLeft\} left\)` : "Play Again"/g) ?? [];
  assert.equal(occurrences.length, 2, "first-Daily and ordinary arms must both keep it");
});

test("23. Training / Survival / Campaign results are unaffected", () => {
  const nonDaily = RESULT_SCREEN.slice(RESULT_SCREEN.indexOf("// ---- Training / Survival"));
  assert.doesNotMatch(nonDaily, /firstDailyResultLesson|daily-meta/);
  const campaign = RESULT_SCREEN.slice(
    RESULT_SCREEN.indexOf("// ---- Campaign: Level Complete"),
    DAILY_START,
  );
  assert.doesNotMatch(campaign, /firstDailyResultLesson|daily-meta/);
});

test("24. the 13D/13E First Run Experience is unchanged", () => {
  // 13E's First Result is untouched and still gates on its own marker.
  assert.match(RESULT_SCREEN_CODE, /if \(isTraining && guidedFirstRunResult\) \{/);
  assert.match(RESULT_SCREEN_CODE, /result result--first-run is-first-run/);
  // The Try-Daily one-shot intent still routes through Home's own handler.
  assert.match(APP_CODE, /setAutoOpenDaily\(true\)/);
  assert.match(HOME_SCREEN_CODE, /handleModeClickRef\.current\("daily"\)/);
  // Guided-run auth suppression intact.
  assert.match(APP_CODE, /if \(available && !guidedFirstRunRef\.current\)/);
  // The 13E First Result must not gain a Daily meta lesson.
  const firstResult = RESULT_SCREEN.slice(
    RESULT_SCREEN.indexOf("if (isTraining && guidedFirstRunResult) {"),
    RESULT_SCREEN.indexOf("// ---- Campaign: Level Complete"),
  );
  assert.doesNotMatch(firstResult, /daily-meta|firstDailyResultLesson/);
});

test("25. no ranked / submission / digest / anti-cheat surface was touched", () => {
  // 13F reads attempt state; it never writes it.
  assert.equal((APP_CODE.match(/consumeRankedAttempt\(\)/g) ?? []).length, 1);
  assert.match(APP_CODE, /if \(rankState === "ranked"\) consumeRankedAttempt\(\)/);
  assert.match(APP_CODE, /const submitRankedRun = useCallback/);
  // The new surfaces contain no submission/claim/digest concern whatsoever.
  const lessonRegion = RESULT_SCREEN.slice(
    RESULT_SCREEN.indexOf("function firstDailyLesson"),
    RESULT_SCREEN.indexOf("* Grouped badge presentation"),
  );
  for (const forbidden of ["submit", "claim", "digest", "rulesVersion", "fetch", "token_ids"]) {
    assert.ok(!lessonRegion.includes(forbidden), `the lesson must not reference ${forbidden}`);
  }
  assert.doesNotMatch(RESULT_SCREEN_CODE, /submitServerScore|claimAttempt|newSubmissionId/);
  assert.doesNotMatch(HOME_SCREEN_CODE, /submitServerScore|claimAttempt/);
  assert.doesNotMatch(LEADERBOARD_CODE, /submitServerScore|claimAttempt/);
});

test("25b. Phase 13F introduced no attempt-accounting or streak mutation", () => {
  assert.doesNotMatch(HOME_SCREEN_CODE, /consumeRankedAttempt|syncRankedAttemptsFromServer/);
  assert.doesNotMatch(RESULT_SCREEN_CODE, /consumeRankedAttempt|syncRankedAttemptsFromServer/);
  // storage.ts gained ONLY the read + the idempotent mark for this phase.
  assert.match(STORAGE_CODE, /export function isFirstDailyResultSeen\(\): boolean/);
  assert.match(STORAGE_CODE, /export function markFirstDailyResultSeen\(\): void/);
  // updateStreak / recordRun signatures untouched.
  assert.match(STORAGE_CODE, /function updateStreak\(profile: ProfileStats, now: Date\): void/);
  assert.match(STORAGE_CODE, /export function recordRun\(run: GameResult\): RunOutcome/);
});
