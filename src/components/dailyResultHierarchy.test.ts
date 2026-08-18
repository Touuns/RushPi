import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13C — Daily result screen hierarchy/layout.
 *
 * Canonical requirement (docs/Brainstorm/PHASE-13-PLAN-FIRST-RUN-EXPERIENCE.md,
 * §14 roadmap + §11 replay-loop spec): delete the duplicated "Tokens Collected"
 * tile, keep the token breakdown behind "View details" (already true), and
 * move the Daily result's actions above the collapsible details block so the
 * primary CTA is reachable without scrolling at 375×667. Forbidden: score,
 * sync status, token data — this phase only reorders/removes ONE duplicate
 * view of already-displayed data.
 *
 * Same non-brittle pattern as dailyAttemptCosts.test.ts: no DOM renderer is
 * wired into this test runner, so the real component source is read and
 * asserted on directly (structural ordering + literal strings), narrowly,
 * rather than mounting it.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const RESULT_SCREEN = read("src/components/ResultScreen.tsx");

// Isolate the Daily branch: from "if (isDaily)" to the line that closes it
// ("// ---- Training / Survival"), so assertions can't accidentally match
// the Training/Survival/Campaign branches below.
const DAILY_START = RESULT_SCREEN.indexOf("if (isDaily) {");
const DAILY_END = RESULT_SCREEN.indexOf("// ---- Training / Survival");
assert.ok(DAILY_START > 0 && DAILY_END > DAILY_START, "could not isolate the Daily branch");
const DAILY_BLOCK = RESULT_SCREEN.slice(DAILY_START, DAILY_END);
const DAILY_CODE = codeOnly(DAILY_BLOCK);

// ---- 1. Final score remains present and primary ---------------------------

test("the Daily branch still renders the shared scoreHero (score stays the primary result)", () => {
  assert.match(DAILY_CODE, /\{scoreHero\}/);
  // scoreHero itself (shared across all modes) must still read the raw,
  // uncomputed result.score — no UI-side recomputation.
  assert.match(
    codeOnly(RESULT_SCREEN),
    /result\.score\.toLocaleString\(\)/,
    "the score value must come straight from the canonical result, not a derived calculation",
  );
});

// ---- 2. Duplicate token-count tile removed --------------------------------

test("KeyStats no longer duplicates the token-summary's Tokens Collected value", () => {
  const keyStatsCall = DAILY_CODE.slice(
    DAILY_CODE.indexOf("<KeyStats"),
    DAILY_CODE.indexOf("/>", DAILY_CODE.indexOf("<KeyStats")),
  );
  assert.doesNotMatch(keyStatsCall, /Tokens Collected/);
  assert.match(keyStatsCall, /Blocks Collected/);
  assert.match(keyStatsCall, /Max Combo/);
});

test("token-summary remains the single canonical Tokens Collected display", () => {
  const tokenSummaryBlock = DAILY_CODE.slice(
    DAILY_CODE.indexOf('<div className="token-summary">'),
    DAILY_CODE.indexOf("<KeyStats"),
  );
  assert.match(tokenSummaryBlock, /Tokens Collected/);
  assert.match(tokenSummaryBlock, /\{tokensCollected\} \/ \{tokensTotal\}/);
  // Exactly one occurrence of the literal label in the whole Daily branch now.
  const occurrences = DAILY_CODE.match(/Tokens Collected/g) ?? [];
  assert.equal(occurrences.length, 1, "Tokens Collected must appear exactly once in the Daily branch");
});

// ---- 3. Ranked/local sync statuses still exist -----------------------------

test("sync status messaging is untouched", () => {
  assert.match(DAILY_CODE, /\{syncMessage && <p className=\{`result__sync is-\$\{serverSync\}`\}>\{syncMessage\}<\/p>\}/);
  assert.match(RESULT_SCREEN, /const SYNC_MESSAGE: Record<ServerSyncStatus, string \| null> = \{/);
  assert.match(RESULT_SCREEN, /"local-only":\s*\n\s*"Score saved locally only\. Connect Pi before your next Daily Run to join the leaderboard\."/);
  assert.match(RESULT_SCREEN, /ok: "Score synced to the ranked leaderboard\."/);
});

// ---- 4/5. Phase 13B attempt-count label preserved --------------------------

test("the 13B Play Again attempt-count label is preserved exactly", () => {
  assert.match(
    DAILY_CODE,
    /\{piConnected \? `Play Again \(\$\{attemptsLeft\} left\)` : "Play Again"\}/,
  );
});

// ---- 6. Actions remain available, now ordered before details --------------

test("Daily actions (Play Again, Leaderboard, Back Home) are all still present", () => {
  assert.match(DAILY_CODE, /onClick=\{onPlayAgain\}/);
  assert.match(DAILY_CODE, /onClick=\{onLeaderboard\}/);
  assert.match(DAILY_CODE, /onClick=\{onHome\}/);
});

test("result__actions now renders BEFORE result__details in source order (fixes the fold)", () => {
  const actionsIdx = DAILY_CODE.indexOf('<div className="result__actions">');
  const detailsIdx = DAILY_CODE.indexOf('<details className="result__details">');
  assert.ok(actionsIdx > 0 && detailsIdx > 0);
  assert.ok(actionsIdx < detailsIdx, "actions must precede the collapsible details block");
});

test("the per-token breakdown list remains behind View details, not promoted above the fold", () => {
  const detailsBlock = DAILY_CODE.slice(DAILY_CODE.indexOf("<details className=\"result__details\">"));
  assert.match(detailsBlock, /<TokenResultList/);
  assert.match(detailsBlock, /View details/);
  const actionsIdx = DAILY_CODE.indexOf('<div className="result__actions">');
  const tokenListIdx = DAILY_CODE.indexOf("<TokenResultList");
  assert.ok(actionsIdx < tokenListIdx, "the actions must appear before the per-token list, not after");
});

// ---- 7/8/9. Other modes unchanged ------------------------------------------

test("Campaign, Training and Survival branches are untouched by this diff", () => {
  // The committed Phase 13B baseline text for these branches must still be
  // present verbatim — proves no incidental restyle leaked outside Daily.
  assert.match(codeOnly(RESULT_SCREEN), /onClick=\{onRetry\}/, "Campaign Retry button unchanged");
  assert.match(RESULT_SCREEN, /Training score — not ranked/);
  assert.match(RESULT_SCREEN, /Survival Run · local only/);
  const trainingSurvivalBlock = codeOnly(
    RESULT_SCREEN.slice(RESULT_SCREEN.indexOf("// ---- Training / Survival")),
  );
  // Their Play Again stays plain — no attemptsLeft/piConnected leak.
  assert.doesNotMatch(trainingSurvivalBlock, /piConnected|attemptsLeft/);
  assert.match(trainingSurvivalBlock, />\s*Play Again\s*</);
});

// ---- 10/11. No scoring/accounting/rulesVersion touched ---------------------

test("no scoring, accounting or rulesVersion reference exists in the changed file", () => {
  assert.doesNotMatch(codeOnly(RESULT_SCREEN), /rulesVersion\s*[:=]\s*\d/);
  assert.doesNotMatch(codeOnly(RESULT_SCREEN), /consumeRankedAttempt|claimAttempt/);
});
