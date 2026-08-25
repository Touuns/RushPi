import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13D — first-launch Guided First Run routing.
 *
 * The persistence half of this phase is genuinely testable: storage.ts and its
 * whole dependency chain (badges, campaign, dailyRulesVersion) are Phaser-free
 * and touch nothing but `window.localStorage`, so a minimal stub lets these
 * tests exercise the REAL functions rather than asserting on source text. The
 * legacy-save migration is the highest-risk rule in the phase, so it is tested
 * behaviourally, from both directions.
 *
 * The React wiring (bootstrap routing, Skip rendering, Pi suppression) has no
 * DOM renderer in this runner, so it keeps the repository's established
 * source-pinned pattern — narrowly, and only for what cannot be executed here.
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

const storage = await import("./storage.ts");

/** Reset to a pristine "never launched Rush Pi" device. */
function freshDevice(): void {
  memory.clear();
}

/** Seed a stored save blob verbatim (simulating an existing player's device). */
function seedSave(blob: Record<string, unknown>): void {
  memory.setItem(SAVE_KEY, JSON.stringify(blob));
}

function storedSave(): Record<string, unknown> {
  const raw = memory.getItem(SAVE_KEY);
  assert.ok(raw, "expected a persisted save");
  return JSON.parse(raw as string);
}

// ---- 1-4. Defaults and the legacy-save migration rule ----------------------

test("1. a brand-new device defaults to firstRunCompleted = false", () => {
  freshDevice();
  assert.equal(storage.isFirstRunCompleted(), false);
});

test("2. an existing PRE-13D save with no firstRunCompleted field migrates to TRUE", () => {
  // This is the critical rule: an already-onboarded player must never be sent
  // back through the tutorial just because their save predates the field.
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 12, trainingRuns: 4, totalXp: 3200, level: 7 },
    leaderboard: [],
    badges: ["first-run"],
    dailyHistory: [],
    campaign: { unlockedLevel: 3, completed: [1, 2], bestScoreByLevel: {}, starsByLevel: {} },
  });
  assert.equal(storage.isFirstRunCompleted(), true);
});

test("3. an explicit persisted false stays false", () => {
  freshDevice();
  seedSave({ version: 1, profile: {}, firstRunCompleted: false });
  assert.equal(storage.isFirstRunCompleted(), false);
});

test("4. an explicit persisted true stays true", () => {
  freshDevice();
  seedSave({ version: 1, profile: {}, firstRunCompleted: true });
  assert.equal(storage.isFirstRunCompleted(), true);
});

test("4b. the absent-field default is derived from save EXISTENCE, not the field alone", () => {
  // Same absent field, opposite answers — proves the distinction is real.
  freshDevice();
  const noSave = storage.isFirstRunCompleted();
  seedSave({ version: 1, profile: {} });
  const emptyButExistingSave = storage.isFirstRunCompleted();
  assert.equal(noSave, false, "no save at all → a genuinely new player");
  assert.equal(emptyButExistingSave, true, "an existing save → already onboarded");
});

// ---- 5-6. markFirstRunCompleted contract ----------------------------------

test("5. marking completion preserves every other saved field", () => {
  freshDevice();
  seedSave({
    version: 1,
    profile: { dailyRuns: 9, trainingRuns: 3, totalXp: 2500, level: 6, bestDailyScore: 8100 },
    leaderboard: [
      { score: 8100, energiesCollected: 40, maxCombo: 12, obstaclesHit: 2, dateISO: "2026-08-01T00:00:00.000Z" },
    ],
    badges: ["first-run", "combo-starter"],
    dailyHistory: [{ date: "2026-08-01", bestScore: 8100, runs: 2, rulesVersion: 3 }],
    campaign: { unlockedLevel: 4, completed: [1, 2, 3], bestScoreByLevel: { "1": 500 }, starsByLevel: { "1": 3 } },
    firstRunCompleted: false,
  });

  storage.markFirstRunCompleted();

  const after = storedSave();
  assert.equal(after.firstRunCompleted, true);
  const profile = after.profile as Record<string, unknown>;
  assert.equal(profile.dailyRuns, 9);
  assert.equal(profile.trainingRuns, 3);
  assert.equal(profile.totalXp, 2500);
  assert.equal(profile.level, 6);
  assert.equal(profile.bestDailyScore, 8100);
  assert.deepEqual(after.badges, ["first-run", "combo-starter"]);
  assert.equal((after.leaderboard as unknown[]).length, 1);
  assert.equal((after.dailyHistory as unknown[]).length, 1);
  const campaign = after.campaign as Record<string, unknown>;
  assert.equal(campaign.unlockedLevel, 4);
  assert.deepEqual(campaign.completed, [1, 2, 3]);
  // Level 1's explicit 3 stars must survive verbatim. (Levels 2/3 additionally
  // receive the pre-existing 9F-C backfill of 1 star for a completed level —
  // untouched by 13D, asserted here so this test documents rather than fights
  // that migration.)
  const stars = campaign.starsByLevel as Record<string, number>;
  assert.equal(stars["1"], 3, "an explicit star rating must not be downgraded");
});

test("6. marking completion is idempotent and does not churn progression", () => {
  freshDevice();
  seedSave({ version: 1, profile: { totalXp: 1000, level: 3 }, firstRunCompleted: false });

  storage.markFirstRunCompleted();
  const first = memory.getItem(SAVE_KEY);
  storage.markFirstRunCompleted();
  storage.markFirstRunCompleted();
  const third = memory.getItem(SAVE_KEY);

  assert.equal(first, third, "repeated marks must not alter the stored save");
  assert.equal(storage.isFirstRunCompleted(), true);
});

test("6b. reading the flag never writes a save (a first-time player stays first-time)", () => {
  freshDevice();
  storage.isFirstRunCompleted();
  storage.isFirstRunCompleted();
  assert.equal(memory.getItem(SAVE_KEY), null, "a pure read must not create a save");
  assert.equal(storage.isFirstRunCompleted(), false);
});

test("6c. marking completion on a fresh device creates a save without inventing progress", () => {
  freshDevice();
  storage.markFirstRunCompleted();
  assert.equal(storage.isFirstRunCompleted(), true);
  const profile = storedSave().profile as Record<string, unknown>;
  assert.equal(profile.trainingRuns, 0, "Skip must not award a training run");
  assert.equal(profile.totalXp, 0, "Skip must not award XP");
  assert.equal(profile.dailyRuns, 0);
});

// ---- 7. Reset ---------------------------------------------------------------

test("7. resetLocalProgress clears first-run completion (next bootstrap is guided again)", () => {
  freshDevice();
  seedSave({ version: 1, profile: { totalXp: 5000 }, firstRunCompleted: true });
  assert.equal(storage.isFirstRunCompleted(), true);

  storage.resetLocalProgress();

  assert.equal(memory.getItem(SAVE_KEY), null);
  assert.equal(storage.isFirstRunCompleted(), false, "a wiped device is a new player again");
});

// ---- 8-9. Bootstrap routing (source-pinned: no DOM renderer here) ----------

const APP = read("src/App.tsx");
const APP_CODE = codeOnly(APP);
const GAME_SCREEN = read("src/components/GameScreen.tsx");
const GAME_SCREEN_CODE = codeOnly(GAME_SCREEN);
const STORAGE_SRC = read("src/utils/storage.ts");

test("8/9. the initial screen and mode are derived lazily from persistence", () => {
  // Lazy useState initializers run during the FIRST render — this is what makes
  // the routing flash-free. A useEffect redirect would paint Home first.
  assert.match(
    APP_CODE,
    /useState<Screen>\(\(\) =>\s*\n?\s*guidedFirstRunRef\.current \? "game" : "home",?\s*\n?\s*\)/,
  );
  assert.match(
    APP_CODE,
    /useState<GameResult\["mode"\]>\(\(\) =>\s*\n?\s*guidedFirstRunRef\.current \? "training" : "daily",?\s*\n?\s*\)/,
  );
  assert.match(APP_CODE, /useRef\(!isFirstRunCompleted\(\)\)/);
});

test("8b. no timer/delayed-redirect trick is used for first-launch routing", () => {
  const bootstrapRegion = APP_CODE.slice(
    APP_CODE.indexOf("export default function App"),
    APP_CODE.indexOf("const refresh ="),
  );
  assert.doesNotMatch(bootstrapRegion, /setTimeout|requestAnimationFrame/);
});

// ---- 10-11. Skip is first-run only; normal Training keeps quit --------------

test("10. Skip renders only in the guided first-run context", () => {
  assert.match(GAME_SCREEN_CODE, /\{guidedFirstRun \? \(/);
  assert.match(GAME_SCREEN, /Skip →/);
  assert.match(GAME_SCREEN_CODE, /className="guided-skip"/);
  assert.match(GAME_SCREEN_CODE, /guidedFirstRun = false/, "must default off");
});

test("11. every non-guided run keeps the ordinary back/quit button + confirmation", () => {
  // The ScreenBackButton lives in the ELSE arm, so Daily/Survival/Campaign and
  // a returning player's manual Training are untouched.
  const branch = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("{guidedFirstRun ? ("),
    GAME_SCREEN_CODE.indexOf("{confirmQuit &&"),
  );
  assert.match(branch, /\) : \(/, "there must be an else arm");
  assert.match(branch, /<ScreenBackButton/);
  assert.match(branch, /onBack=\{openQuitConfirm\}/);
  assert.match(GAME_SCREEN_CODE, /const openQuitConfirm = \(\) => \{/);
});

test("11b. the guided run exposes exactly one navigation action", () => {
  const guidedArm = GAME_SCREEN_CODE.slice(
    GAME_SCREEN_CODE.indexOf("{guidedFirstRun ? ("),
    GAME_SCREEN_CODE.indexOf(") : ("),
  );
  assert.doesNotMatch(guidedArm, /<ScreenBackButton/, "no second navigation route");
});

// ---- 12. Skip has no progression / ranked side effects ---------------------

test("12. the Skip handler records nothing, awards nothing and never authenticates", () => {
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const skipGuidedFirstRun"),
    APP_CODE.indexOf("const playTraining"),
  );
  assert.ok(handler.length > 0, "skipGuidedFirstRun must exist");
  assert.match(handler, /markFirstRunCompleted\(\)/);
  assert.match(handler, /setScreen\("home"\)/);
  for (const forbidden of [
    "recordRun",
    "beginRun",
    "consumeRankedAttempt",
    "claimAttempt",
    "submitServerScore",
    "authenticatePi",
    "fetchDailyTokenChallenge",
    "setConfirmQuit",
  ]) {
    assert.doesNotMatch(
      handler,
      new RegExp(forbidden),
      `Skip must not call ${forbidden}`,
    );
  }
});

// ---- 13. Natural completion marks the flag at the result ------------------

test("13. natural guided completion marks the flag when the first result is reached", () => {
  const handler = APP_CODE.slice(
    APP_CODE.indexOf("const handleGameOver"),
    APP_CODE.indexOf("const retrySync"),
  );
  assert.match(handler, /if \(guidedFirstRunRef\.current\) \{/);
  assert.match(handler, /markFirstRunCompleted\(\)/);
  assert.match(handler, /setGuidedFirstRunResult\(true\)/);
  // The run itself is still recorded exactly once by the untouched path.
  assert.match(handler, /const o = recordRun\(enriched\)/);
  assert.equal(
    (handler.match(/recordRun\(/g) ?? []).length,
    1,
    "the run must be recorded exactly once",
  );
});

test("13b. entering Training alone never marks completion (close-before-finish stays false)", () => {
  // Only handleGameOver and skipGuidedFirstRun may mark it — never beginRun,
  // never the bootstrap, never a render.
  const marks = APP_CODE.match(/markFirstRunCompleted\(\)/g) ?? [];
  assert.equal(marks.length, 2, "exactly two call sites: skip and game-over");
  const beginRun = APP_CODE.slice(
    APP_CODE.indexOf("const beginRun"),
    APP_CODE.indexOf("const skipGuidedFirstRun"),
  );
  assert.doesNotMatch(beginRun, /markFirstRunCompleted/);
});

// ---- 14. Daily/ranked untouched --------------------------------------------

test("14. Daily seed, ranked accounting and rulesVersion are untouched by 13D", () => {
  assert.match(STORAGE_SRC, /export function consumeRankedAttempt\(\): void/);
  assert.match(STORAGE_SRC, /export function getRankedAttemptsToday\(\): RankedAttempts/);
  assert.doesNotMatch(codeOnly(STORAGE_SRC), /rulesVersion\s*=\s*\d/);
  // The guided run is Training: no Daily preparation is reachable from it.
  const skipHandler = APP_CODE.slice(
    APP_CODE.indexOf("const skipGuidedFirstRun"),
    APP_CODE.indexOf("const playTraining"),
  );
  assert.doesNotMatch(skipHandler, /goDailyPrep|setPendingDailyRank/);
});

// ---- 15-16. Pi authentication ordering -------------------------------------

test("15/16. Pi auto-connect is suppressed for the guided first run only", () => {
  const effect = APP_CODE.slice(
    APP_CODE.indexOf("const available = isPiBrowser()"),
    APP_CODE.indexOf("const connectPi"),
  );
  // SDK init still happens (cheap, no UI); the AUTH call is gated.
  assert.match(effect, /void initPi\(\)/);
  assert.match(effect, /if \(available && !guidedFirstRunRef\.current\)/);
  assert.match(effect, /authenticatePi\(\)/);
  // Manual Connect Pi remains available to everyone.
  assert.match(APP_CODE, /const connectPi = useCallback\(async \(\) => \{/);
  assert.match(APP_CODE, /onConnectPi=\{connectPi\}/);
});

// ---- 13E handoff contract ---------------------------------------------------

test("the 13D→13E handoff marker exists, is session-only and changes no presentation", () => {
  assert.match(APP_CODE, /const \[guidedFirstRunResult, setGuidedFirstRunResult\] = useState\(false\)/);
  assert.match(APP_CODE, /guidedFirstRunResult=\{guidedFirstRunResult\}/);
  // Never persisted.
  assert.doesNotMatch(codeOnly(STORAGE_SRC), /guidedFirstRunResult/);
  // 13E's strings must not be RENDERED yet. Comments may legitimately name them
  // while documenting the handoff, so this is a code-only assertion.
  const RESULT_SCREEN_CODE = codeOnly(read("src/components/ResultScreen.tsx"));
  for (const notYet of ["You've got it", "Try the Daily Run", "Explore"]) {
    assert.doesNotMatch(RESULT_SCREEN_CODE, new RegExp(notYet), `${notYet} belongs to 13E`);
  }
  // The seam itself exists and is inert in 13D.
  assert.match(RESULT_SCREEN_CODE, /guidedFirstRunResult \? "is-first-run" : ""/);
});

// ---- Guided run is not a new game mode --------------------------------------

test("no new GameMode was introduced — the guided run is ordinary Training", () => {
  const TYPES = read("src/types.ts");
  assert.doesNotMatch(TYPES, /"guided"|"tutorial"/);
  assert.match(APP_CODE, /setMode\("training"\)/);
});
