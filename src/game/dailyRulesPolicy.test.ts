import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13-R2 — server-side ranked policy (rules version 3).
 *
 * HARNESS LIMITATION (pre-existing, documented rather than worked around)
 * `api/package.json` declares `"type": "commonjs"` so Vercel can compile the
 * serverless functions, while every API source file is written in ESM. Node
 * therefore cannot load `api/**` at all — not by import, not by require. No API
 * file has ever been unit-tested in this repository for that reason, and R2
 * deliberately does NOT change that scoping: the alternative (making the API
 * import from `src/`, or vice versa) would introduce an unverifiable Vercel
 * bundling change on the ranked submission path, in a phase that forbids
 * deploying.
 *
 * So the server policy is verified two ways here:
 *   1. SOURCE PINNING — the declared constants and formulas are read out of the
 *      API source and asserted, so a silent edit fails the build.
 *   2. INDEPENDENT RE-DERIVATION — the ceiling arithmetic is recomputed here
 *      from the engine constants and compared against what the API declares.
 * Decision tables below mirror the endpoint's documented contract and pin it.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

/**
 * Strip comments so an assertion about CODE is never satisfied — or defeated —
 * by prose. Several of these files quote the very patterns being asserted on
 * while explaining why they were removed.
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const POLICY_SRC = read("api/_lib/dailyRulesPolicy.ts");
const SUBMIT_SRC = read("api/leaderboard/submit-score.ts");
const CLAIM_SRC = read("api/leaderboard/claim-attempt.ts");
const DIGEST_SRC = read("api/_lib/scoreDigest.ts");

/** Read `export const NAME = <number>;` out of the policy module. */
function constant(name: string): number {
  const m = POLICY_SRC.match(new RegExp(`export const ${name}\\s*=\\s*([\\d.]+)`));
  assert.ok(m, `${name} must be declared in api/_lib/dailyRulesPolicy.ts`);
  return Number(m[1]);
}

// ---- Active version ------------------------------------------------------

test("the server declares v3 as the active ranked version", () => {
  assert.equal(constant("DAILY_RULES_VERSION_V2"), 2);
  assert.equal(constant("DAILY_RULES_VERSION_V3"), 3);
  assert.match(
    POLICY_SRC,
    /export const ACTIVE_DAILY_RULES_VERSION\s*=\s*DAILY_RULES_VERSION_V3/,
  );
});

test("only v2 and v3 are supported and the guard fails closed", () => {
  assert.match(
    POLICY_SRC,
    /SUPPORTED_DAILY_RULES_VERSIONS[^=]*=\s*\[\s*DAILY_RULES_VERSION_V2,\s*DAILY_RULES_VERSION_V3,?\s*\]/,
  );
  // The guard must require an integer AND membership — not a loose truthiness.
  assert.match(POLICY_SRC, /typeof value === "number"/);
  assert.match(POLICY_SRC, /Number\.isInteger\(value\)/);
  assert.match(POLICY_SRC, /\.includes\(value\)/);
});

test("newly built challenges and claims carry the active version", () => {
  assert.match(
    read("api/_lib/dailyTokenChallenge.ts"),
    /export const TOKEN_RULES_VERSION\s*=\s*ACTIVE_DAILY_RULES_VERSION/,
  );
  assert.match(CLAIM_SRC, /p_rules_version:\s*TOKEN_RULES_VERSION/);
  assert.match(CLAIM_SRC, /rulesVersion:\s*TOKEN_RULES_VERSION/);
});

// ---- Ceiling: independent re-derivation ----------------------------------

/**
 * Recompute the non-token maximum straight from the shipped engine constants,
 * without reading the API's answer first.
 */
function deriveNonTokenMax() {
  const cfg = read("src/game/gameConfig.ts");
  const theme = read("src/game/theme.ts");
  const num = (src: string, re: RegExp) => {
    const m = src.match(re);
    assert.ok(m, `missing constant for ${re}`);
    return Number(m[1]);
  };

  const runMs = num(cfg, /RUN_DURATION_SECONDS\s*=\s*(\d+)/) * 1000;
  const baseInterval = num(cfg, /baseSpawnIntervalMs:\s*(\d+)/);
  const minInterval = num(cfg, /minSpawnIntervalMs:\s*(\d+)/);
  const energyPoints = num(cfg, /energyPoints:\s*(\d+)/);
  const comboMax = num(cfg, /comboMaxMultiplier:\s*(\d+)/);
  const survivalPerSec = num(cfg, /survivalPerSecond:\s*(\d+)/);
  const cleanBonus = num(cfg, /cleanRunBonus:\s*(\d+)/);
  const maxEvents = num(theme, /maxPerRun:\s*(\d+)/);
  const evDurMax = num(theme, /durationMaxMs:\s*(\d+)/);
  const evInterval = num(theme, /energySpawnIntervalMs:\s*(\d+)/);

  // Replicate the spawn accumulator exactly, across a wide delta range.
  const spawnsFor = (delta: number) => {
    let acc = 0, elapsed = 0, n = 0;
    while (elapsed < runMs) {
      elapsed += delta; acc += delta;
      const t = Math.min(1, Math.max(0, elapsed / runMs));
      const interval = baseInterval + (minInterval - baseInterval) * t;
      while (acc >= interval) { acc -= interval; n++; }
    }
    return n;
  };
  const counts = [1, 2, 8, 1000 / 60, 33.3, 50].map(spawnsFor);
  assert.equal(new Set(counts).size, 1, "the spawn count must not depend on frame delta");
  const baseSpawns = counts[0];

  // Energy-Zone extras: for (t = start+300; t < end; t += interval)
  const extrasPerEvent = Math.ceil((evDurMax - 300) / evInterval);
  const collectibles = baseSpawns + maxEvents * extrasPerEvent;
  const perCollectible = energyPoints * comboMax;

  return {
    baseSpawns,
    collectibles,
    perCollectible,
    survival: survivalPerSec * (runMs / 1000),
    cleanBonus,
    total: collectibles * perCollectible + survivalPerSec * (runMs / 1000) + cleanBonus,
  };
}

test("the non-token maximum the server declares matches an independent derivation", () => {
  const derived = deriveNonTokenMax();
  assert.equal(derived.baseSpawns, 100, "60 s with the 820→420 ms ramp yields 100 spawns");
  assert.equal(derived.collectibles, 139, "100 base + 3 events x 13 bonus energies");
  assert.equal(derived.perCollectible, 30, "10 points x the x3 combo cap");
  assert.equal(derived.survival, 300);
  assert.equal(derived.cleanBonus, 500);
  assert.equal(derived.total, 4970);

  // The server must declare exactly that, component by component.
  assert.equal(constant("MAX_COLLECTIBLE_SPAWNS"), derived.collectibles);
  assert.equal(constant("MAX_SCORE_PER_COLLECTIBLE"), derived.perCollectible);
  assert.equal(constant("MAX_SURVIVAL_SCORE"), derived.survival);
  assert.equal(constant("MAX_CLEAN_RUN_BONUS"), derived.cleanBonus);
  assert.match(
    POLICY_SRC,
    /MAX_NON_TOKEN_SCORE\s*=\s*\n?\s*MAX_COLLECTIBLE_SPAWNS \* MAX_SCORE_PER_COLLECTIBLE \+\s*\n?\s*MAX_SURVIVAL_SCORE \+\s*\n?\s*MAX_CLEAN_RUN_BONUS/,
    "the total must be composed from the parts, not restated as a literal",
  );
});

/** The formula the server implements, re-expressed here for boundary tests. */
const NON_TOKEN_MAX = 4970;
const MARGIN = 0.1;
const ceilingFor = (tokens: number) => Math.ceil((tokens + NON_TOKEN_MAX) * (1 + MARGIN));

test("the safety margin is explicit, small and pinned", () => {
  assert.equal(constant("V3_SAFETY_MARGIN"), MARGIN);
  assert.match(
    POLICY_SRC,
    /Math\.ceil\(\(tokens \+ MAX_NON_TOKEN_SCORE\) \* \(1 \+ V3_SAFETY_MARGIN\)\)/,
  );
});

test("the worst-case v3 ceiling is far tighter than the old flat 50000", () => {
  const worstCaseTokens = 15 * 750; // 15 tokens, each clamped to <= 750 points
  assert.equal(worstCaseTokens, 11250);
  const ceiling = ceilingFor(worstCaseTokens);
  assert.equal(ceiling, 17842);
  assert.equal(constant("V2_LEGACY_MAX_SCORE"), 50000);
  assert.ok(ceiling < 50000 * 0.4, "must be meaningfully tighter, not marginally");
});

test("score boundary: below passes, exactly at the ceiling passes, one above fails", () => {
  const ceiling = ceilingFor(6000);
  const accepts = (score: number) => score <= ceiling;
  assert.equal(accepts(ceiling - 1), true);
  assert.equal(accepts(ceiling), true);
  assert.equal(accepts(ceiling + 1), false);
  assert.equal(accepts(50000), false, "the old ceiling is now rejected");
});

test("a realistic challenge is tighter than the worst case, and token-free runs still fit", () => {
  assert.ok(ceilingFor(6000) < ceilingFor(11250));
  assert.ok(ceilingFor(0) >= NON_TOKEN_MAX, "a legitimate token-free run must fit");
});

test("the ceiling is a pure function of the SERVER-rebuilt manifest total", () => {
  // submit-score must pass the server's own challenge total — never a body field.
  assert.match(
    SUBMIT_SRC,
    /maxScoreForVersion\(rulesVersion,\s*challenge\.totalTokenPointsPossible\)/,
  );
  assert.match(SUBMIT_SRC, /challenge = buildDailyTokenChallenge\(snap\)/);
  assert.doesNotMatch(
    codeOnly(POLICY_SRC),
    /\bbody\b|\breq\b|\bpayload\b/i,
    "the policy module must not read anything request-shaped",
  );
});

test("v2 keeps its historical ceiling; only v3 uses the derived one", () => {
  assert.match(
    POLICY_SRC,
    /version === DAILY_RULES_VERSION_V3\s*\n?\s*\?\s*maxScoreForV3Challenge\(totalTokenPointsPossible\)\s*\n?\s*:\s*V2_LEGACY_MAX_SCORE/,
  );
});

// ---- Reservation-bound version selection ---------------------------------

test("the endpoint selects the policy from the STORED reservation, not the body", () => {
  assert.match(SUBMIT_SRC, /const rulesVersion: DailyRulesVersion = reservation\.rules_version/);
  assert.match(
    SUBMIT_SRC,
    /if \(!isSupportedDailyRulesVersion\(reservation\.rules_version\)\)/,
    "an unsupported/absent reservation version must fail closed",
  );
  assert.match(
    SUBMIT_SRC,
    /if \(payloadRulesVersion !== rulesVersion\)/,
    "the payload version must be required to match the reservation",
  );
  // The stored row and the digest both use the reservation's version, and
  // neither reads the active constant directly any more.
  assert.match(SUBMIT_SRC, /p_rules_version:\s*rulesVersion\b/);
  assert.match(
    SUBMIT_SRC,
    /computeScoreDigest\(\{[\s\S]*?\brulesVersion,[\s\S]*?\}\)/,
    "the digest must be built from the reservation's version",
  );
  assert.doesNotMatch(
    SUBMIT_SRC,
    /rulesVersion:\s*TOKEN_RULES_VERSION/,
    "submit must not pin the active version instead of the reservation's",
  );
});

/** Mirrors the endpoint's decision table so the contract itself is pinned. */
function selectPolicy(reservationVersion: unknown, payloadVersion: unknown) {
  const supported = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && (v === 2 || v === 3);
  if (!supported(payloadVersion)) return { ok: false, reason: "unsupported-payload" };
  if (!supported(reservationVersion)) return { ok: false, reason: "unsupported-reservation" };
  if (payloadVersion !== reservationVersion) return { ok: false, reason: "mismatch" };
  return { ok: true, version: reservationVersion as number };
}

test("matching versions pass; every mismatch is rejected in both directions", () => {
  assert.deepEqual(selectPolicy(3, 3), { ok: true, version: 3 });
  assert.deepEqual(selectPolicy(2, 2), { ok: true, version: 2 });
  assert.deepEqual(selectPolicy(2, 3), { ok: false, reason: "mismatch" });
  assert.deepEqual(selectPolicy(3, 2), { ok: false, reason: "mismatch" });
});

test("omitted, altered or unsupported versions fail closed in both positions", () => {
  for (const bad of [undefined, null, "3", 4, 1, 0, NaN, 2.5, true, {}]) {
    assert.equal(selectPolicy(3, bad).ok, false, `payload ${String(bad)} must fail`);
    assert.equal(selectPolicy(bad, 3).ok, false, `reservation ${String(bad)} must fail`);
  }
});

test("a client cannot borrow the looser v2 ceiling for a v3 reservation", () => {
  assert.equal(selectPolicy(3, 2).ok, false, "the mismatch is rejected before any ceiling");
  assert.equal(selectPolicy(2, 3).ok, false, "a v2 run cannot be replayed onto the v3 board");
});

// ---- Digest binds the version --------------------------------------------

test("the canonical digest includes the rules version", () => {
  assert.match(DIGEST_SRC, /String\(input\.rulesVersion\)/);
  assert.match(DIGEST_SRC, /createHash\("sha256"\)/);
  assert.match(DIGEST_SRC, /sortedIds/, "token order must not change the digest");
});

/** Same serialization as api/_lib/scoreDigest.ts, to exercise its consequences. */
function digest(parts: (string | number)[]) {
  return createHash("sha256").update(parts.map(String).join("|"), "utf8").digest("hex");
}
const RUN = ["sub-1", "uid-1", "CHAL-1", "2026-08-01"];
const TAIL = [9000, 60, 25, 1, 60, 5200, 9, "bitcoin,ethereum"];

test("identical run facts under v2 and v3 hash differently", () => {
  assert.notEqual(digest([...RUN, 2, 1, ...TAIL]), digest([...RUN, 3, 1, ...TAIL]));
});

test("an exact duplicate hashes identically (idempotent replay)", () => {
  assert.equal(digest([...RUN, 3, 1, ...TAIL]), digest([...RUN, 3, 1, ...TAIL]));
});

test("a modified replay cannot reuse the original digest", () => {
  const original = digest([...RUN, 3, 1, ...TAIL]);
  const inflated = digest([...RUN, 3, 1, 9001, ...TAIL.slice(1)]);
  assert.notEqual(original, inflated);
});

// ---- Leaderboard isolation (query predicate contract) --------------------

interface Row { score: number; rules_version: number | null }

/** Mirrors the SQL predicate `s.rules_version = p_rules_version`. */
const activeBoard = (rows: Row[], version: number) =>
  rows.filter((r) => r.rules_version === version).sort((a, b) => b.score - a.score);

test("the active board includes v3 and excludes v2, null and unversioned rows", () => {
  const rows: Row[] = [
    { score: 20000, rules_version: 2 },
    { score: 15000, rules_version: null },
    { score: 9000, rules_version: 3 },
    { score: 7000, rules_version: 3 },
  ];
  assert.deepEqual(activeBoard(rows, 3).map((r) => r.score), [9000, 7000]);
});

test("a huge v2 score cannot top the v3 board or change its order", () => {
  const clean = activeBoard(
    [{ score: 9000, rules_version: 3 }, { score: 7000, rules_version: 3 }], 3);
  const polluted = activeBoard(
    [{ score: 49999, rules_version: 2 }, { score: 9000, rules_version: 3 },
     { score: 7000, rules_version: 3 }], 3);
  assert.deepEqual(polluted, clean);
});

test("equal v2 and v3 scores stay in separate pools, and v2 rows are never mutated", () => {
  const rows: Row[] = [
    { score: 9000, rules_version: 2 },
    { score: 9000, rules_version: 3 },
  ];
  const before = JSON.stringify(rows);
  assert.equal(activeBoard(rows, 3).length, 1);
  assert.equal(activeBoard(rows, 2).length, 1);
  assert.equal(JSON.stringify(rows), before, "reading a board must not relabel anything");
});

test("both boards pass the active version explicitly", () => {
  for (const file of ["api/leaderboard/daily.ts", "api/leaderboard/global.ts"]) {
    assert.match(read(file), /p_rules_version:\s*ACTIVE_DAILY_RULES_VERSION/, file);
  }
});
