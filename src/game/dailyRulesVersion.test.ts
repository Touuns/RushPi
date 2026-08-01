import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  DAILY_RULES_VERSION,
  isActiveDailyRulesVersion,
  KNOWN_DAILY_RULES_VERSIONS,
} from "./dailyRulesVersion.ts";

/**
 * Phase 13-R2 — client-side rules version integrity, plus the guard that keeps
 * the frontend and API constants from silently diverging.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

// ---- Active version ------------------------------------------------------

test("the client's active ranked version is 3", () => {
  assert.equal(DAILY_RULES_VERSION, 3);
  assert.deepEqual([...KNOWN_DAILY_RULES_VERSIONS], [2, 3]);
});

test("only the active version is treated as active", () => {
  assert.equal(isActiveDailyRulesVersion(3), true);
  for (const other of [2, 1, 0, 4, "3", null, undefined, NaN, {}, [3]]) {
    assert.equal(
      isActiveDailyRulesVersion(other),
      false,
      `${String(other)} must not be active`,
    );
  }
});

// ---- Frontend / API divergence guard -------------------------------------

/**
 * The two constants must be declared separately (different TS build targets —
 * `tsconfig.json` includes only `src`, `api/tsconfig.json` only `api`), so this
 * reads both source files and fails the build if the numbers ever drift apart.
 */
test("the API's active version literal matches the client constant", () => {
  const policy = read("api/_lib/dailyRulesPolicy.ts");
  const v3 = policy.match(/export const DAILY_RULES_VERSION_V3\s*=\s*(\d+)/);
  assert.ok(v3, "DAILY_RULES_VERSION_V3 must be declared in the API policy module");
  assert.equal(
    Number(v3[1]),
    DAILY_RULES_VERSION,
    "frontend and API active versions have diverged",
  );
  assert.match(
    policy,
    /export const ACTIVE_DAILY_RULES_VERSION\s*=\s*DAILY_RULES_VERSION_V3/,
    "the API must derive its active version from the v3 constant, not a stray literal",
  );
});

test("the API challenge builder derives its version from the policy module", () => {
  const challenge = read("api/_lib/dailyTokenChallenge.ts");
  assert.match(
    challenge,
    /export const TOKEN_RULES_VERSION\s*=\s*ACTIVE_DAILY_RULES_VERSION/,
    "TOKEN_RULES_VERSION must not re-declare a literal version",
  );
});

test("no stale hardcoded ranked version remains on the client submit path", () => {
  assert.doesNotMatch(
    read("src/App.tsx"),
    /rules_version:\s*2\b/,
    "the client must not hardcode rules_version: 2",
  );
  assert.match(
    read("src/market/marketClient.ts"),
    /data\.rulesVersion !== DAILY_RULES_VERSION/,
    "the manifest check must use the shared constant",
  );
});

test("the leaderboard SQL no longer hardcodes a rules version", () => {
  // Strip SQL comments first: the migration's own header quotes the old
  // predicate while explaining why it is being replaced.
  const sql = read("supabase/migration_13_r2.sql")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  assert.match(sql, /s\.rules_version = p_rules_version/);
  assert.doesNotMatch(
    sql,
    /s\.rules_version = 2\b/,
    "the active boards must be parameterised, not pinned to v2",
  );
});

test("the migration defaults to v2 so a migration-first cutover cannot break the live board", () => {
  // The default is only ever used by callers that omit the argument, which
  // during cutover means the STILL-DEPLOYED v2 API. Defaulting to 3 would hand
  // that build an empty leaderboard the moment the migration lands.
  const sql = read("supabase/migration_13_r2.sql")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const defaults = [...sql.matchAll(/p_rules_version\s+integer\s+default\s+(\d+)/g)];
  assert.equal(defaults.length, 2, "both board functions must declare the parameter");
  for (const d of defaults) {
    assert.equal(d[1], "2", "the cutover-safe default is 2, never the active version");
  }
  // ...and the API must never rely on that default.
  for (const file of ["api/leaderboard/daily.ts", "api/leaderboard/global.ts"]) {
    assert.match(read(file), /p_rules_version:\s*ACTIVE_DAILY_RULES_VERSION/, file);
  }
});

test("the migration is pure ASCII, like every other migration in this project", () => {
  // A non-ASCII comment aborts the whole migration on a non-UTF8 database
  // (observed: 'byte sequence 0xe2 0x86 0x92 has no equivalent in WIN1252').
  const sql = read("supabase/migration_13_r2.sql");
  const nonAscii = [...new Set([...sql].filter((c) => c.charCodeAt(0) > 127))];
  assert.deepEqual(nonAscii, [], `non-ASCII characters found: ${JSON.stringify(nonAscii)}`);
});

// ---- Local storage: v2 and v3 bests stay separate -------------------------

/** Mirrors recordRun's daily best selection (storage.ts). */
function applyDailyRun(
  profile: { bestDailyScore: number; bestDailyTokenRushScore: number; bestDailyRulesV3Score: number },
  run: { rulesVersion: number; score: number },
) {
  const next = { ...profile };
  if (run.rulesVersion === DAILY_RULES_VERSION) {
    if (run.score > next.bestDailyRulesV3Score) next.bestDailyRulesV3Score = run.score;
  } else if (run.rulesVersion === 2) {
    if (run.score > next.bestDailyTokenRushScore) next.bestDailyTokenRushScore = run.score;
  } else if (run.score > next.bestDailyScore) {
    next.bestDailyScore = run.score;
  }
  return next;
}

const EMPTY = { bestDailyScore: 0, bestDailyTokenRushScore: 0, bestDailyRulesV3Score: 0 };

test("a v3 personal best ignores v2 runs entirely", () => {
  let p = { ...EMPTY, bestDailyTokenRushScore: 40000 }; // huge legacy v2 best
  p = applyDailyRun(p, { rulesVersion: 3, score: 9000 });
  assert.equal(p.bestDailyRulesV3Score, 9000, "the v3 best is its own run only");
  assert.equal(p.bestDailyTokenRushScore, 40000, "the v2 best is untouched");
});

test("a v2 run can never raise the active v3 best", () => {
  let p = { ...EMPTY, bestDailyRulesV3Score: 5000 };
  p = applyDailyRun(p, { rulesVersion: 2, score: 49000 });
  assert.equal(p.bestDailyRulesV3Score, 5000, "v2 must not touch the v3 best");
  assert.equal(p.bestDailyTokenRushScore, 49000);
});

test("legacy v1 runs still land on the legacy field", () => {
  const p = applyDailyRun(EMPTY, { rulesVersion: 1, score: 250 });
  assert.equal(p.bestDailyScore, 250);
  assert.equal(p.bestDailyTokenRushScore, 0);
  assert.equal(p.bestDailyRulesV3Score, 0);
});

test("a pre-R2 save with no v3 field reads back as 0, requiring no reset", () => {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const legacySave = { bestDailyScore: 250, bestDailyTokenRushScore: 12000 } as Record<string, unknown>;
  assert.equal(num(legacySave.bestDailyRulesV3Score, 0), 0);
  assert.equal(num(legacySave.bestDailyTokenRushScore, 0), 12000, "v2 data survives");
  // Malformed values fall back safely rather than throwing.
  for (const bad of [undefined, null, "abc", {}, NaN]) {
    assert.equal(num(bad, 0), 0);
  }
});

// ---- Local history: versions never merge ---------------------------------

interface HistoryEntry { date: string; bestScore: number; runs: number; rulesVersion: number }

/** Mirrors recordRun's history merge (date AND version must match). */
function recordHistory(list: HistoryEntry[], date: string, score: number, version: number) {
  const existing = list.find((e) => e.date === date && e.rulesVersion === version);
  if (existing) {
    existing.bestScore = Math.max(existing.bestScore, score);
    existing.runs += 1;
  } else {
    list.unshift({ date, bestScore: score, runs: 1, rulesVersion: version });
  }
  return list;
}

test("v2 and v3 runs on the same day stay separate history entries", () => {
  let list: HistoryEntry[] = [];
  list = recordHistory(list, "2026-08-01", 40000, 2);
  list = recordHistory(list, "2026-08-01", 9000, 3);
  assert.equal(list.length, 2, "the transition day must not merge two rule sets");
  const v3 = list.find((e) => e.rulesVersion === 3);
  assert.equal(v3?.bestScore, 9000, "the v3 entry must not inherit the v2 best");
  const v2 = list.find((e) => e.rulesVersion === 2);
  assert.equal(v2?.bestScore, 40000, "the v2 entry is preserved");
});

test("same-day same-version runs still merge as before", () => {
  let list: HistoryEntry[] = [];
  list = recordHistory(list, "2026-08-01", 7000, 3);
  list = recordHistory(list, "2026-08-01", 9000, 3);
  assert.equal(list.length, 1);
  assert.equal(list[0].bestScore, 9000);
  assert.equal(list[0].runs, 2);
});

test("pre-R2 history entries read back as v2", () => {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const legacy = { date: "2026-07-26", bestScore: 250, runs: 1 } as Record<string, unknown>;
  assert.equal(num(legacy.rulesVersion, 2), 2);
});

// ---- Phase 13-R1 must remain untouched -----------------------------------

test("R1 movement and collision constants are unchanged by R2", () => {
  const cfg = read("src/game/gameConfig.ts");
  assert.match(cfg, /laneTweenMs:\s*110/, "lane transition duration must stay 110 ms");
  assert.match(cfg, /radius:\s*22/, "player radius must stay 22");
  assert.match(cfg, /radius:\s*18/, "object radius must stay 18");
  assert.match(cfg, /GAME_WIDTH\s*=\s*414/);
  assert.match(cfg, /LANE_COUNT\s*=\s*3/);

  const scene = read("src/game/scenes/MainScene.ts");
  assert.match(scene, /horizontallyOverlaps\(playerX, this\.laneX\[obj\.lane\], radii\)/,
    "collision must still use the authoritative position");
  assert.match(scene, /this\.player\.x = this\.laneTransition\.x/,
    "rendering must still read the authoritative position");
  assert.doesNotMatch(scene, /x:\s*this\.laneX\[this\.currentLane\]/,
    "no Phaser lane tween may be reintroduced");

  const helper = read("src/game/laneTransition.ts");
  assert.match(helper, /export function quadraticEaseOut/, "easing helper must remain");
  assert.doesNotMatch(helper, /Math\.random/, "movement must consume no randomness");
});
