import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13B — honest costs: attempt wording in the quit dialog, attempt count
 * in the Daily "Play again" label, "no tokens today" notice.
 *
 * Same non-brittle pattern as dailyRulesVersion.test.ts / modeGuidance.test.ts:
 * these are React components with no DOM renderer wired into this test
 * runner, so behaviour is pinned by reading the real source rather than by
 * mounting it. Every assertion here targets a literal string or a structural
 * guarantee (ordering, prop wiring) that would break if the honest-costs
 * wording regressed or if attempt accounting were touched.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const GAME_SCREEN = read("src/components/GameScreen.tsx");
const RESULT_SCREEN = read("src/components/ResultScreen.tsx");
const DAILY_PREP = read("src/components/DailyPreparationScreen.tsx");
const APP = read("src/App.tsx");
const STORAGE = read("src/utils/storage.ts");

// ---- 1. Quit dialog: ranked runs state the real cost ----------------------

test("GameScreen accepts a dailyRanked prop, defaulted to false", () => {
  assert.match(GAME_SCREEN, /dailyRanked\?:\s*boolean/);
  assert.match(GAME_SCREEN, /dailyRanked\s*=\s*false/);
});

test("the quit dialog states the attempt is already counted only for ranked Daily runs", () => {
  assert.match(
    GAME_SCREEN,
    /This ranked run is already counted\. Quitting won't give the attempt back\./,
  );
  // The original wording must still exist for every non-ranked case (training,
  // survival, campaign, local-only Daily) — it is not replaced, only branched.
  assert.match(GAME_SCREEN, /Your current run progress will be lost\./);
  assert.match(GAME_SCREEN, /\{dailyRanked\s*\n?\s*\?\s*"This ranked run is already counted/);
});

test("quitRun still never records a GameResult (quitting stays free of scoring side effects)", () => {
  const fn = GAME_SCREEN.slice(GAME_SCREEN.indexOf("const quitRun"), GAME_SCREEN.indexOf("return (\n    <div"));
  const body = codeOnly(fn);
  assert.doesNotMatch(body, /onGameOver/, "quitting must not synthesize a game-over result");
  assert.match(body, /onQuit\(\);/);
});

test("App.tsx derives dailyRanked from the real run-rank state, not a new flag", () => {
  assert.match(
    codeOnly(APP),
    /dailyRanked=\{mode === "daily" && runRankState === "ranked"\}/,
  );
});

// ---- 2. Daily "Play Again" states the ranked cost --------------------------

test("ResultScreen accepts attemptsLeft and piConnected props", () => {
  assert.match(RESULT_SCREEN, /attemptsLeft:\s*number/);
  assert.match(RESULT_SCREEN, /piConnected:\s*boolean/);
});

test("the Daily result's Play Again label states the live attempt count only when connected", () => {
  assert.match(
    codeOnly(RESULT_SCREEN),
    /\{piConnected \? `Play Again \(\$\{attemptsLeft\} left\)` : "Play Again"\}/,
  );
});

test("Training, Survival and Campaign Play Again / Retry buttons are unaffected (no cost applies)", () => {
  // These three branches return before the Daily-specific JSX above, so the
  // honest-cost ternary (piConnected / attemptsLeft) must never appear there —
  // only the Daily branch spends a ranked attempt.
  const trainingSurvivalBlock = codeOnly(
    RESULT_SCREEN.slice(RESULT_SCREEN.indexOf("// ---- Training / Survival")),
  );
  assert.match(trainingSurvivalBlock, /onClick=\{onPlayAgain\}/);
  assert.match(trainingSurvivalBlock, />\s*Play Again\s*</);
  assert.doesNotMatch(trainingSurvivalBlock, /piConnected|attemptsLeft/);

  const campaignBlock = codeOnly(
    RESULT_SCREEN.slice(
      RESULT_SCREEN.indexOf("// ---- Campaign"),
      RESULT_SCREEN.indexOf("// ---- Daily Token Rush"),
    ),
  );
  assert.match(campaignBlock, /onClick=\{onRetry\}/);
  assert.match(campaignBlock, />\s*Retry\s*</);
  assert.doesNotMatch(campaignBlock, /piConnected|attemptsLeft/);
});

test("App.tsx wires the real local attempt mirror and Pi connection state, not new counters", () => {
  const code = codeOnly(APP);
  assert.match(code, /attemptsLeft=\{data\.attempts\.left\}/);
  assert.match(code, /piConnected=\{piUser !== null\}/);
  // data.attempts comes from the existing storage reader — no parallel source.
  assert.match(code, /attempts:\s*getRankedAttemptsToday\(\)/);
});

// ---- 3. "No tokens today" notice on the LOCAL path only -------------------

test("DailyPreparationScreen gained an empty-manifest step, distinct from the error step", () => {
  assert.match(DAILY_PREP, /type Step = "challenge" \| "logos" \| "claiming" \| "starting" \| "empty-manifest" \| "error";/);
});

test("the empty-manifest branch only triggers for a LOCAL run with zero tokens", () => {
  assert.match(codeOnly(DAILY_PREP), /if \(!ranked && c\.tokens\.length === 0\)\s*\{\s*\n\s*setStep\("empty-manifest"\);/);
});

test("the empty-token check runs strictly after the ranked-eligibility check (order pinned)", () => {
  const code = codeOnly(DAILY_PREP);
  const rankedEligibleIdx = code.indexOf("ranked && !c.rankedEligible");
  const emptyManifestIdx = code.indexOf("!ranked && c.tokens.length === 0");
  assert.ok(rankedEligibleIdx >= 0 && emptyManifestIdx >= 0);
  assert.ok(
    emptyManifestIdx > rankedEligibleIdx,
    "a ranked run must resolve/fail on rankedEligible before the local empty-manifest branch can ever run",
  );
});

test("the notice copy is honest and distinguishes 'no tokens' from a logo or auth failure", () => {
  assert.match(DAILY_PREP, /No tokens today — this run won't be ranked\. Play anyway\?/);
});

test("Play anyway starts a LOCAL run (claim = null) and never calls claimAttempt", () => {
  const fn = DAILY_PREP.slice(
    DAILY_PREP.indexOf("const playAnyway"),
    DAILY_PREP.indexOf("const stepLabel"),
  );
  const body = codeOnly(fn);
  assert.match(body, /onReady\(challenge, null\)/);
  assert.doesNotMatch(body, /claimAttempt/, "Play anyway must never reserve a ranked attempt");
  assert.doesNotMatch(body, /consumeRankedAttempt/);
});

test("no new code path reads or writes the ranked-attempt accounting functions", () => {
  // The only allowed touch is App.tsx passing the EXISTING counter through as
  // a prop (`data.attempts.left`) — consumeRankedAttempt/claimAttempt must
  // still originate only from their pre-existing call sites.
  for (const src of [GAME_SCREEN, RESULT_SCREEN]) {
    assert.doesNotMatch(codeOnly(src), /consumeRankedAttempt|claimAttempt/);
  }
});

test("storage.ts's ranked-attempt accounting is untouched by this phase (still a pure local mirror)", () => {
  assert.match(
    STORAGE,
    /This is a UX aid; the server enforces the real limit\./,
  );
  assert.match(STORAGE, /export function consumeRankedAttempt\(\): void/);
  assert.match(STORAGE, /export function getRankedAttemptsToday\(\): RankedAttempts/);
});

// ---- 4. Untouched surfaces --------------------------------------------------

test("rulesVersion, scoring and Daily selection are not referenced by any of the changed files", () => {
  for (const src of [GAME_SCREEN, RESULT_SCREEN, DAILY_PREP]) {
    assert.doesNotMatch(codeOnly(src), /rulesVersion\s*[:=]\s*\d/);
  }
});
