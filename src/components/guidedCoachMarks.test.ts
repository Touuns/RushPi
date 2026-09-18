import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { COACH_MARKS, COACH_MARKS_END_MS, coachMarkWordCount } from "./coachMarks.ts";

/**
 * Phase 13E — Guided First Run coach marks + the dedicated First Result.
 *
 * Canonical requirement (docs/Brainstorm/PHASE-13-PLAN-FIRST-RUN-EXPERIENCE.md
 * §14 roadmap): "Three non-blocking coach marks in the first Training run;
 * first-result screen ('You've got it' + 'Try the Daily Run')". Canonical
 * validation: "second run shows nothing; Daily determinism byte-identical".
 * Canonical forbidden surfaces: spawns, collisions, scoring, Daily-only FX,
 * RNG / this.rng().
 *
 * Two kinds of test live here, and the split is deliberate:
 *
 *  - The cue table (`coachMarks.ts`) and the persistence rules (`storage.ts`)
 *    are Phaser-free and DOM-free, so they are executed for real — copy, order,
 *    word count, schedule, migration and idempotency are all behavioural.
 *  - The React wiring has no DOM renderer in this runner, so it keeps the
 *    repository's established source-pinned pattern (see
 *    dailyResultHierarchy.test.ts / firstRunRouting.test.ts) — narrowly, and
 *    only for what genuinely cannot be executed here.
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
const GAME_SCREEN = read("src/components/GameScreen.tsx");
const GAME_SCREEN_CODE = codeOnly(GAME_SCREEN);
const RESULT_SCREEN = read("src/components/ResultScreen.tsx");
const RESULT_SCREEN_CODE = codeOnly(RESULT_SCREEN);
const HOME_SCREEN_CODE = codeOnly(read("src/components/HomeScreen.tsx"));
const STORAGE_CODE = codeOnly(read("src/utils/storage.ts"));
const CSS = read("src/styles/global.css");

/** The dedicated First Result branch, isolated so assertions can't leak. */
const FIRST_RESULT_START = RESULT_SCREEN.indexOf("if (isTraining && guidedFirstRunResult) {");
const FIRST_RESULT_END = RESULT_SCREEN.indexOf("// ---- Campaign: Level Complete");
assert.ok(
  FIRST_RESULT_START > 0 && FIRST_RESULT_END > FIRST_RESULT_START,
  "could not isolate the First Result branch",
);
const FIRST_RESULT = RESULT_SCREEN.slice(FIRST_RESULT_START, FIRST_RESULT_END);

// ---- 1-5. coachMarksSeen persistence + migration ---------------------------

test("1. a brand-new device defaults to coachMarksSeen = false", () => {
  freshDevice();
  assert.equal(storage.areCoachMarksSeen(), false);
  assert.equal(storage.isFirstRunCompleted(), false, "and the run is not complete either");
});

test("2. a legacy save with neither field migrates to coachMarksSeen = TRUE", () => {
  // The critical rule: an already-onboarded player must never become eligible
  // for tutorial hints just because their save predates the field.
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 20, trainingRuns: 6, totalXp: 9000, level: 19 },
    leaderboard: [],
    badges: ["first-run"],
    dailyHistory: [],
    campaign: { unlockedLevel: 5, completed: [1, 2, 3, 4], bestScoreByLevel: {}, starsByLevel: {} },
  });
  assert.equal(storage.areCoachMarksSeen(), true);
});

test("3. an explicit coachMarksSeen boolean always wins over the inherited value", () => {
  freshDevice();
  // Explicit false on a COMPLETED first run — the explicit value must survive.
  seedSave({ version: 1, profile: {}, firstRunCompleted: true, coachMarksSeen: false });
  assert.equal(storage.areCoachMarksSeen(), false);

  freshDevice();
  // Explicit true on an INCOMPLETE first run — likewise.
  seedSave({ version: 1, profile: {}, firstRunCompleted: false, coachMarksSeen: true });
  assert.equal(storage.areCoachMarksSeen(), true);
});

test("4. when absent, coachMarksSeen inherits the normalized firstRunCompleted", () => {
  // An explicitly unfinished first run stays eligible for the cues...
  freshDevice();
  seedSave({ version: 1, profile: {}, firstRunCompleted: false });
  assert.equal(storage.areCoachMarksSeen(), false);

  // ...while a completed player never is.
  freshDevice();
  seedSave({ version: 1, profile: {}, firstRunCompleted: true });
  assert.equal(storage.areCoachMarksSeen(), true);
});

test("5. reading the flag never writes a save", () => {
  freshDevice();
  storage.areCoachMarksSeen();
  storage.areCoachMarksSeen();
  assert.equal(memory.getItem(SAVE_KEY), null, "a pure read must not create a save");
});

// ---- 6-8. markCoachMarksSeen contract --------------------------------------

test("6. markCoachMarksSeen is idempotent", () => {
  freshDevice();
  seedSave({ version: 1, profile: { totalXp: 400, level: 2 }, firstRunCompleted: false });

  storage.markCoachMarksSeen();
  const first = memory.getItem(SAVE_KEY);
  storage.markCoachMarksSeen();
  storage.markCoachMarksSeen();

  assert.equal(memory.getItem(SAVE_KEY), first, "repeated marks must not alter the save");
  assert.equal(storage.areCoachMarksSeen(), true);
});

test("7. marking coach marks preserves firstRunCompleted and every other field", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 4, trainingRuns: 1, totalXp: 1700, level: 4, bestDailyScore: 6200 },
    leaderboard: [
      { score: 6200, energiesCollected: 31, maxCombo: 9, obstaclesHit: 3, dateISO: "2026-08-10T00:00:00.000Z" },
    ],
    badges: ["first-run", "combo-starter"],
    dailyHistory: [{ date: "2026-08-10", bestScore: 6200, runs: 1, rulesVersion: 3 }],
    campaign: { unlockedLevel: 2, completed: [1], bestScoreByLevel: { "1": 700 }, starsByLevel: { "1": 2 } },
    firstRunCompleted: false,
  });

  storage.markCoachMarksSeen();

  const after = storedSave();
  assert.equal(after.coachMarksSeen, true);
  assert.equal(
    after.firstRunCompleted,
    false,
    "seeing the lesson must NOT complete the first run — they flip separately",
  );
  const profile = after.profile as Record<string, unknown>;
  assert.equal(profile.dailyRuns, 4);
  assert.equal(profile.trainingRuns, 1);
  assert.equal(profile.totalXp, 1700);
  assert.equal(profile.level, 4);
  assert.equal(profile.bestDailyScore, 6200);
  assert.deepEqual(after.badges, ["first-run", "combo-starter"]);
  assert.equal((after.leaderboard as unknown[]).length, 1);
  assert.equal((after.dailyHistory as unknown[]).length, 1);
  const campaign = after.campaign as Record<string, unknown>;
  assert.equal(campaign.unlockedLevel, 2);
  assert.equal((campaign.starsByLevel as Record<string, number>)["1"], 2);
});

test("8. the two flags are independent in BOTH directions (reload semantics)", () => {
  // Reload after all cues but before the finish: the Guided First Run returns,
  // and the coach marks do not repeat.
  freshDevice();
  storage.markCoachMarksSeen();
  assert.equal(storage.isFirstRunCompleted(), false, "the run must still be offered");
  assert.equal(storage.areCoachMarksSeen(), true, "but the lesson must not repeat");

  // Skip before the cues finish: the run never returns, and pretending the cues
  // were seen is unnecessary — firstRunCompleted alone suppresses the run.
  freshDevice();
  storage.markFirstRunCompleted();
  assert.equal(storage.isFirstRunCompleted(), true);
  assert.equal(
    storedSave().coachMarksSeen,
    false,
    "Skip must not claim cues were seen",
  );
});

test("8b. Reset Local Data clears coachMarksSeen with the rest of the save", () => {
  freshDevice();
  seedSave({ version: 1, profile: { totalXp: 5000 }, firstRunCompleted: true, coachMarksSeen: true });
  storage.resetLocalProgress();
  assert.equal(memory.getItem(SAVE_KEY), null);
  assert.equal(storage.areCoachMarksSeen(), false, "a wiped device may be taught again");
  assert.equal(storage.isFirstRunCompleted(), false);
});

test("8c. no parallel storage system was introduced for the coach marks", () => {
  assert.doesNotMatch(STORAGE_CODE, /rushpi\.coachMarksSeen|rushpi\.tutorial|rushpi\.onboarding2/);
  // Still ONE versioned blob, and no version bump was needed.
  assert.match(STORAGE_CODE, /const SAVE_KEY = "rushpi\.save"/);
  assert.match(STORAGE_CODE, /const SAVE_VERSION = 1/);
});

// ---- 9-13. The cue table: exactly three verbs, in order, ≤5 words ----------

test("9. there are exactly three cues, in the canonical Move → Avoid → Collect order", () => {
  assert.equal(COACH_MARKS.length, 3, "three verbs, one run");
  assert.deepEqual(
    COACH_MARKS.map((m) => m.id),
    ["move", "avoid", "collect"],
    "Avoid is deliberately taught before Collect (§7)",
  );
});

test("10. the cue copy is exactly the approved, visually honest wording", () => {
  assert.deepEqual(COACH_MARKS.map((m) => m.text), [
    "Swipe to change lane",
    "Avoid the red hazard",
    "Grab the gold",
  ]);
  // The design document's older example named "red spikes"; the runtime renders
  // a red hazard diamond, so onboarding must not describe art that isn't there.
  for (const mark of COACH_MARKS) {
    assert.doesNotMatch(mark.text, /spike/i);
  }
});

test("11. every cue is at most five words", () => {
  for (const mark of COACH_MARKS) {
    const words = coachMarkWordCount(mark);
    assert.ok(words <= 5, `"${mark.text}" is ${words} words — the limit is 5`);
  }
});

test("12. the first run teaches NOTHING beyond the three verbs", () => {
  // Tokens, combo maths, power-ups, charge, zones, stars, streaks, badges,
  // prices, Pi, ranked attempts are all deferred by design.
  const allCopy = COACH_MARKS.map((m) => m.text).join(" ").toLowerCase();
  for (const deferred of [
    "token", "combo", "power", "charge", "zone", "star", "streak",
    "badge", "price", "pi", "rank", "attempt", "leaderboard", "xp", "level",
  ]) {
    assert.ok(!allCopy.includes(deferred), `the first run must not teach "${deferred}"`);
  }
});

test("13. the schedule is ordered, non-overlapping and finishes early in the run", () => {
  let previousEnd = 0;
  for (const mark of COACH_MARKS) {
    assert.ok(mark.atMs > previousEnd, `${mark.id} must start after the previous cue ends`);
    assert.ok(mark.durationMs > 0, `${mark.id} must stay on screen for a real period`);
    previousEnd = mark.atMs + mark.durationMs;
  }
  assert.equal(COACH_MARKS_END_MS, previousEnd);
  // Begins shortly after gameplay is visible; all three complete inside the
  // first 15-20s of the 60s run, nowhere near the finish.
  assert.ok(COACH_MARKS[0].atMs >= 1000 && COACH_MARKS[0].atMs <= 4000);
  assert.ok(COACH_MARKS_END_MS <= 20000, "the sequence must not run past ~20s");
  assert.ok(COACH_MARKS_END_MS < 60000 / 2, "and must be long finished before the finish");
});

// ---- 14-17. Coach marks are Guided-First-Run only and non-blocking ---------

test("14. coach marks activate only when guidedFirstRun AND not yet seen", () => {
  assert.match(APP_CODE, /showCoachMarks=\{guidedFirstRun && !coachMarksSeen\}/);
  assert.match(APP_CODE, /useState\(\(\) => areCoachMarksSeen\(\)\)/);
  // GameScreen itself defaults the prop OFF, so no mode can opt in by accident.
  assert.match(GAME_SCREEN_CODE, /showCoachMarks = false/);
});

test("15. Daily / Survival / Campaign and normal Training can never receive them", () => {
  // There is exactly ONE <GameScreen> in the app, and exactly ONE place the
  // flag is computed — the expression above. No mode-specific override exists.
  assert.equal((APP_CODE.match(/<GameScreen/g) ?? []).length, 1);
  assert.equal((APP_CODE.match(/showCoachMarks=/g) ?? []).length, 1);
  // guidedFirstRun is force-cleared by beginRun, which is the ONLY way Daily,
  // Survival, Campaign or a manual/second Training run can start.
  const beginRun = APP_CODE.slice(
    APP_CODE.indexOf("const beginRun"),
    APP_CODE.indexOf("const skipGuidedFirstRun"),
  );
  assert.match(beginRun, /guidedFirstRunRef\.current = false/);
  assert.match(beginRun, /setGuidedFirstRun\(false\)/);
});

test("16. the second Training run shows nothing (canonical 13E validation)", () => {
  // "Play again" on the First Result routes through playAgain → playTraining →
  // beginRun, which clears guidedFirstRun; and coachMarksSeen is already true
  // by then. Either condition alone suppresses the cues.
  assert.match(APP_CODE, /if \(mode === "training"\) playTraining\(\)/);
  assert.match(
    APP_CODE,
    /const playTraining = useCallback\(\(\) => beginRun\("training", "training"\)/,
  );
  assert.match(FIRST_RESULT, /onClick=\{onPlayAgain\}/);
});

test("17. the cue layer is non-blocking: no pause, no input capture, no button", () => {
  const layer = GAME_SCREEN.slice(
    GAME_SCREEN.indexOf("{coachMarksArmed && ("),
    GAME_SCREEN.indexOf("{confirmQuit && ("),
  );
  assert.ok(layer.length > 0, "the coach-mark layer must exist");
  assert.doesNotMatch(layer, /<button|onClick|role="dialog"|aria-modal/);
  assert.doesNotMatch(layer, /Next|Step \d|1\/3|Got it|Continue/);
  // Never pauses or resumes the Phaser scene (only the quit modal may).
  const coachEffect = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("if (!coachMarksArmedRef.current) return;"),
    GAME_SCREEN_CODE.indexOf("const isSurvival ="),
  );
  assert.doesNotMatch(coachEffect, /scene\.pause|scene\.resume|gameRef/);
  // The CSS contract that makes it inert.
  const layerCss = CSS.slice(
    CSS.indexOf(".coach-mark-layer {"),
    CSS.indexOf(".coach-mark {"),
  );
  assert.match(layerCss, /pointer-events: none/);
});

// ---- 18-20. Timing architecture: cheap, one-shot, leak-free ---------------

test("18. the schedule is UI-only: no RNG, no Phaser hook, no per-frame loop", () => {
  const coachEffect = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("if (!coachMarksArmedRef.current) return;"),
    GAME_SCREEN_CODE.indexOf("const isSurvival ="),
  );
  for (const forbidden of [
    "requestAnimationFrame",
    "setInterval",
    "this.rng",
    "Math.random",
    "events.on",
    "update",
    "hud",
    "spawn",
  ]) {
    assert.ok(
      !coachEffect.includes(forbidden),
      `the coach-mark schedule must not use ${forbidden}`,
    );
  }
  assert.match(coachEffect, /setTimeout/);
});

test("19. every timer is cleared, so no cue can fire after the run is left", () => {
  const coachEffect = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("if (!coachMarksArmedRef.current) return;"),
    GAME_SCREEN_CODE.indexOf("const isSurvival ="),
  );
  assert.match(coachEffect, /return \(\) => \{/, "the effect must return a cleanup");
  assert.match(coachEffect, /clearTimeout\(t\)/);
});

test("20. completion is recorded after the THIRD cue, never when the run starts", () => {
  const coachEffect = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("if (!coachMarksArmedRef.current) return;"),
    GAME_SCREEN_CODE.indexOf("const isSurvival ="),
  );
  assert.match(coachEffect, /const isLast = index === COACH_MARKS\.length - 1/);
  assert.match(coachEffect, /if \(isLast\) onCoachMarksSeenRef\.current\?\.\(\)/);
  // ...and the callback that persists it exists, on the dismissal path only.
  assert.match(APP_CODE, /const handleCoachMarksSeen = useCallback\(\(\) => \{/);
  assert.match(APP_CODE, /markCoachMarksSeen\(\)/);
  assert.equal(
    (APP_CODE.match(/markCoachMarksSeen\(\)/g) ?? []).length,
    1,
    "exactly one call site",
  );
});

// ---- 21. Skip and the status chip -----------------------------------------

test("21. Skip is unchanged by 13E and still coexists with the cues", () => {
  assert.match(GAME_SCREEN, /Skip →/);
  assert.match(GAME_SCREEN_CODE, /className="guided-skip"/);
  assert.match(GAME_SCREEN_CODE, /onClick=\{onSkipGuidedFirstRun\}/);
  // Skip still records nothing and never authenticates.
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const skipGuidedFirstRun"),
    APP_CODE.indexOf("const handleCoachMarksSeen"),
  );
  for (const forbidden of ["recordRun", "consumeRankedAttempt", "authenticatePi", "markCoachMarksSeen"]) {
    assert.doesNotMatch(handler, new RegExp(forbidden), `Skip must not call ${forbidden}`);
  }
});

test("22. the Training status chip is hidden ONLY during the Guided First Run", () => {
  assert.match(
    GAME_SCREEN_CODE,
    /\{mode === "training" && !guidedFirstRun && \(/,
    "normal Training must keep its chip",
  );
  assert.match(GAME_SCREEN, /Training scores are not ranked/);
  // No replacement sentence was introduced — the three cues are the whole
  // instructional layer.
  assert.equal((GAME_SCREEN.match(/game-screen__mode-tag/g) ?? []).length, 3);
  // Survival/Campaign chips untouched.
  assert.match(GAME_SCREEN_CODE, /\{mode === "survival" && \(/);
  assert.match(GAME_SCREEN_CODE, /\{mode === "campaign" && \(/);
});

// ---- 23-28. The dedicated First Result ------------------------------------

test("23. the First Result requires BOTH a Training result and the 13D marker", () => {
  assert.match(RESULT_SCREEN_CODE, /if \(isTraining && guidedFirstRunResult\) \{/);
  assert.match(RESULT_SCREEN_CODE, /const isTraining = result\.mode === "training"/);
});

test("24. the headline is exactly \"You've got it\", with one explanatory line", () => {
  assert.match(FIRST_RESULT, /<h2 className="result__first-run-title">You've got it<\/h2>/);
  assert.match(FIRST_RESULT, /You're ready for the Daily Run\./);
  // Exactly one headline and one line — no third sentence.
  assert.equal((FIRST_RESULT.match(/<h2/g) ?? []).length, 1);
  assert.equal((FIRST_RESULT.match(/<p /g) ?? []).length, 1);
});

test("25. the score is the canonical result.score, never recomputed, never graded", () => {
  assert.match(FIRST_RESULT, /\{result\.score\.toLocaleString\(\)\}/);
  // Rendered output only — the surrounding comment legitimately NAMES the
  // judgements it forbids.
  const rendered = codeOnly(FIRST_RESULT);
  for (const judgement of [
    "Great", "Amazing", "Poor", "Bronze", "Silver", "Gold medal", "New Best",
  ]) {
    assert.ok(!rendered.includes(judgement), `no score judgement: "${judgement}"`);
  }
  // ...and it is presented as secondary in the stylesheet.
  assert.match(CSS, /\.result__first-run-score-value \{/);
});

test("26. ordinary Training analytics are absent from the First Result", () => {
  for (const hidden of [
    "scoreHero",           // XP gained, level-up, New Best
    "badgesBlock",         // badge unlocks
    "KeyStats",            // Energy Collected / Max Combo / Obstacles Hit
    "ResultDetails",       // View details
    "result__training-tag", // "Training score — not ranked"
    "onLeaderboard",       // Leaderboard
    "ScreenBackButton",    // the ordinary back arrow
    "result__sync",
    "result__streak",
  ]) {
    assert.ok(!FIRST_RESULT.includes(hidden), `the First Result must not render ${hidden}`);
  }
  // The ordinary Training result still renders every one of them.
  const ordinary = RESULT_SCREEN.slice(RESULT_SCREEN.indexOf("// ---- Training / Survival"));
  for (const kept of ["{scoreHero}", "{badgesBlock}", "<KeyStats", "<ResultDetails", "<ScreenBackButton"]) {
    assert.ok(ordinary.includes(kept), `normal Training must keep ${kept}`);
  }
});

test("27. exactly three actions, no fourth navigation route, no back arrow", () => {
  const buttons = FIRST_RESULT.match(/<button/g) ?? [];
  assert.equal(buttons.length, 3, "Try the Daily Run / Play again / Explore");
  assert.match(FIRST_RESULT, /Try the Daily Run/);
  assert.match(FIRST_RESULT, /Play again/);
  assert.match(FIRST_RESULT, /Explore/);
  assert.doesNotMatch(FIRST_RESULT, /<ScreenBackButton/);
  // Real semantic buttons, never divs with handlers.
  assert.equal((FIRST_RESULT.match(/type="button"/g) ?? []).length, 3);
});

test("28. Try Daily is primary; Play again and Explore are equal secondaries", () => {
  assert.match(FIRST_RESULT, /className="btn btn--primary" type="button" onClick=\{onTryDailyRun\}/);
  assert.equal(
    (FIRST_RESULT.match(/className="btn btn--secondary"/g) ?? []).length,
    2,
    "Play again and Explore must carry identical weight",
  );
  assert.doesNotMatch(FIRST_RESULT, /disabled|btn--ghost/, "neither may be greyed out");
});

// ---- 29-32. Action wiring --------------------------------------------------

test("29. Try the Daily Run reuses the EXISTING Home Daily flow, never a bypass", () => {
  const cta = APP_CODE.slice(
    APP_CODE.indexOf("const tryDailyRunFromFirstResult"),
    APP_CODE.indexOf("const clearAutoOpenDaily"),
  );
  assert.ok(cta.length > 0);
  assert.match(cta, /setAutoOpenDaily\(true\)/);
  assert.match(cta, /setScreen\("home"\)/);
  // It must NOT reach into the Daily machinery itself.
  for (const bypass of [
    "startDailyAuto",
    "goDailyPrep",
    "setPendingDailyRank",
    "consumeRankedAttempt",
    "authenticatePi",
    "startPreparedDaily",
  ]) {
    assert.doesNotMatch(cta, new RegExp(bypass), `the CTA must not call ${bypass}`);
  }
  // Home consumes the intent through its own Daily card handler — the same
  // function the card's onClick calls — so intro/connect/attempts are reused.
  assert.match(HOME_SCREEN_CODE, /handleModeClickRef\.current\("daily"\)/);
  assert.match(HOME_SCREEN_CODE, /onClick=\{\(\) => handleModeClick\("daily"\)\}/);
});

test("30. the Daily intent is one-shot and cannot fire twice", () => {
  assert.match(HOME_SCREEN_CODE, /if \(!autoOpenDaily \|\| autoDailyFiredRef\.current\) return;/);
  assert.match(HOME_SCREEN_CODE, /autoDailyFiredRef\.current = true/);
  assert.match(HOME_SCREEN_CODE, /onAutoOpenDailyConsumed\?\.\(\)/);
  assert.match(APP_CODE, /const clearAutoOpenDaily = useCallback\(\(\) => setAutoOpenDaily\(false\)/);
});

test("31. Explore is the plain Home route and triggers no side effect", () => {
  assert.match(FIRST_RESULT, /onClick=\{onHome\}[\s\S]{0,80}Explore/);
  const goHome = APP_CODE.slice(
    APP_CODE.indexOf("const goHome = useCallback"),
    APP_CODE.indexOf("const tryDailyRunFromFirstResult"),
  );
  assert.match(goHome, /setScreen\("home"\)/);
  for (const forbidden of ["authenticatePi", "goDailyPrep", "setAutoOpenDaily", "consumeRankedAttempt"]) {
    assert.doesNotMatch(goHome, new RegExp(forbidden), `Explore must not call ${forbidden}`);
  }
});

test("32. no auth is triggered by the cues, the First Result, Play again or Explore", () => {
  // The 13D suppression of guided auto-auth is intact...
  assert.match(APP_CODE, /if \(available && !guidedFirstRunRef\.current\)/);
  // ...and nothing in the new surfaces authenticates.
  assert.doesNotMatch(RESULT_SCREEN_CODE, /authenticatePi|piClient/);
  assert.doesNotMatch(GAME_SCREEN_CODE, /authenticatePi|piClient/);
  // Auth is reachable only through Home's existing connect paths.
  assert.match(APP_CODE, /const connectAndPlayDaily = useCallback/);
});

// ---- 33-36. Nothing outside the UI layer moved -----------------------------

test("33. no gameplay rule, RNG or Daily accounting was touched", () => {
  // The guided run is still ordinary Training with the ordinary duration.
  assert.match(APP_CODE, /setMode\("training"\)/);
  assert.doesNotMatch(codeOnly(read("src/types.ts")), /"guided"|"tutorial"|"coach"/);
  // No new mode, seed, spawn table or scene was introduced for the tutorial.
  for (const src of [GAME_SCREEN_CODE, APP_CODE, RESULT_SCREEN_CODE]) {
    assert.doesNotMatch(src, /tutorialSeed|tutorialScene|guidedSpawn|coachSpawn/);
  }
  // Ranked accounting is untouched: consumeRankedAttempt keeps its single
  // gameplay call site (beginRun).
  assert.equal((APP_CODE.match(/consumeRankedAttempt\(\)/g) ?? []).length, 1);
});

test("34. no Daily attempt is consumed or accounted differently by 13E", () => {
  const cta = APP_CODE.slice(
    APP_CODE.indexOf("const tryDailyRunFromFirstResult"),
    APP_CODE.indexOf("const clearAutoOpenDaily"),
  );
  assert.doesNotMatch(cta, /consumeRankedAttempt|syncRankedAttemptsFromServer|claim/i);
  // The claim/submit path is still reached only from the untouched Daily flow.
  assert.match(APP_CODE, /const startPreparedDaily = useCallback/);
  assert.match(APP_CODE, /if \(rankState === "ranked"\) consumeRankedAttempt\(\)/);
});

test("35. 13E did not reach into a later phase's persistence", () => {
  // `firstDailyResultSeen` graduated off this list in Phase 13F, which is the
  // phase that delivers it (see PHASE-13-PLAN §9/§14) — it is now pinned by
  // src/components/firstDailyMeta.test.ts, exactly as `firstRunCompleted`
  // graduated in 13D and `coachMarksSeen` in 13E. `attemptCostAcknowledged` is
  // still unimplemented canonical work and remains forbidden here.
  const all = [APP_CODE, GAME_SCREEN_CODE, RESULT_SCREEN_CODE, HOME_SCREEN_CODE, STORAGE_CODE].join("\n");
  for (const notYet of ["attemptCostAcknowledged", "firstDailyPanel", "metaLesson"]) {
    assert.ok(!all.includes(notYet), `${notYet} is not Phase 13E work`);
  }
  // The coach-mark layer itself must still carry no Daily/meta concern.
  assert.ok(!GAME_SCREEN_CODE.includes("firstDailyResultSeen"));
});

test("36. the coach-mark styling respects the motion preference and never flashes", () => {
  const coachCss = CSS.slice(CSS.indexOf(".coach-mark-layer {"), CSS.indexOf("   Result screen"));
  assert.match(coachCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.coach-mark \{[\s\S]*?animation: none/);
  // A single one-shot entrance; nothing loops.
  assert.doesNotMatch(coachCss, /infinite|alternate/);
  // Meaning is never carried by colour alone — the cue is text.
  assert.match(coachCss, /font-weight: 700/);
});
