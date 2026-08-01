/**
 * Ranked Daily rules version + per-version score policy (Phase 13-R2).
 *
 * WHY A NEW VERSION
 * Phase 13-R1 made the player's visible horizontal position authoritative for
 * collisions during lane transitions. Before it, the logical lane flipped to the
 * destination the instant a move began, so the game could register a hit in a
 * lane the orb had not visibly reached (measured divergence: up to 138 px, a
 * full lane width). Runs played under the corrected model are therefore NOT
 * comparable with earlier ones, and must rank separately.
 *
 * AUTHORITY
 * The active version is chosen HERE, on the server, and bound to the ranked
 * reservation at claim time. The client may echo the version its reservation
 * carries (so an in-flight v2 reservation can still be finalized under v2
 * rules), but the server always selects the validation policy from the STORED
 * reservation — never from the request body.
 *
 * This module is intentionally dependency-free (no node:*, no fetch, no env) so
 * it can be unit-tested directly.
 */

/** Ranked rules versions this build understands. Anything else fails closed. */
export const DAILY_RULES_VERSION_V2 = 2;
export const DAILY_RULES_VERSION_V3 = 3;

/** The version assigned to every NEWLY issued challenge and reservation. */
export const ACTIVE_DAILY_RULES_VERSION = DAILY_RULES_VERSION_V3;

export type DailyRulesVersion =
  | typeof DAILY_RULES_VERSION_V2
  | typeof DAILY_RULES_VERSION_V3;

export const SUPPORTED_DAILY_RULES_VERSIONS: readonly DailyRulesVersion[] = [
  DAILY_RULES_VERSION_V2,
  DAILY_RULES_VERSION_V3,
];

/** Fails closed: only an exact supported integer passes. */
export function isSupportedDailyRulesVersion(value: unknown): value is DailyRulesVersion {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (SUPPORTED_DAILY_RULES_VERSIONS as readonly number[]).includes(value)
  );
}

/**
 * Historical v2 plausibility ceiling. Kept ONLY so an already-issued v2
 * reservation can still be finalized under the exact rules it was claimed
 * under. It is deliberately loose — that looseness is why v3 derives its own.
 */
export const V2_LEGACY_MAX_SCORE = 50000;

/**
 * Maximum score a 60 s Daily run can earn from every NON-token source, derived
 * from the shipped engine constants rather than estimated. Recomputing this by
 * hand is the point: the previous 50 000 ceiling was ~3× the real maximum, so a
 * modified client could submit an impossible score and still pass validation.
 *
 *   Base spawns          100  — the spawn accumulator over 60 s with the
 *                               interval ramping 820 ms → 420 ms. Stable at 100
 *                               for every frame delta from 1 ms to 50 ms.
 *   Energy-Zone extras    39  — at most 3 events per run (EVENTS.maxPerRun),
 *                               each at most 7 000 ms (durationMaxMs) emitting
 *                               one bonus energy per 540 ms from +300 ms ⇒ 13.
 *   Max collectibles     139  — worst case: EVERY spawn is an energy/Chain
 *                               Block and none is an obstacle.
 *   Per collectible       30  — SCORING.energyPoints (10) × the capped combo
 *                               multiplier (comboMaxMultiplier = 3). Assuming
 *                               the cap on the very first pickup is deliberately
 *                               generous; a real run ramps up to it.
 *   Collectible total  4 170  = 139 × 30
 *   Survival             300  = SCORING.survivalPerSecond (5) × 60 s
 *   Clean-run bonus      500  = SCORING.cleanRunBonus
 *   ------------------------------------------------------------------
 *   NON-TOKEN MAXIMUM  4 970
 *
 * Power-ups, Shield, Magnet, charge and Life Orbs award no score in Daily
 * (charge/lives are Survival-and-Campaign only), so they contribute nothing.
 */
export const MAX_COLLECTIBLE_SPAWNS = 139;
export const MAX_SCORE_PER_COLLECTIBLE = 30;
export const MAX_SURVIVAL_SCORE = 300;
export const MAX_CLEAN_RUN_BONUS = 500;
export const MAX_NON_TOKEN_SCORE =
  MAX_COLLECTIBLE_SPAWNS * MAX_SCORE_PER_COLLECTIBLE +
  MAX_SURVIVAL_SCORE +
  MAX_CLEAN_RUN_BONUS; // 4970

/**
 * Explicit safety margin on top of the derived maximum.
 *
 * 10 % is chosen because the derivation's only soft input is the spawn count,
 * which is bounded by an integral over the interval ramp and measured identical
 * (100) across a 50× range of frame deltas. The margin therefore covers integer
 * rounding and minor future tuning of the event window, while staying far below
 * the ~3× slack the old fixed ceiling allowed. At the absolute worst case
 * (15 tokens × 750 points) the accepted ceiling is 17 842 — still 2.8× tighter
 * than the previous 50 000, and far tighter on a real challenge.
 */
export const V3_SAFETY_MARGIN = 0.1;

/**
 * Accepted v3 ceiling for a specific challenge (Option B, challenge-specific).
 *
 * `totalTokenPointsPossible` MUST come from the manifest the server rebuilt
 * from its own persisted snapshot — never from the request body. Because
 * submit-score already rebuilds that manifest to revalidate token points, this
 * costs nothing extra and is deterministic: the same snapshot always yields the
 * same number, so a retry or replay computes an identical ceiling.
 *
 * Tokens are the dominant term and vary daily (each is clamped to 200–750
 * points), so binding the ceiling to today's actual manifest is markedly
 * tighter than assuming the 11 250 worst case every day.
 */
export function maxScoreForV3Challenge(totalTokenPointsPossible: number): number {
  const tokens =
    Number.isFinite(totalTokenPointsPossible) && totalTokenPointsPossible > 0
      ? totalTokenPointsPossible
      : 0;
  return Math.ceil((tokens + MAX_NON_TOKEN_SCORE) * (1 + V3_SAFETY_MARGIN));
}

/**
 * The plausibility ceiling to apply for a reservation's version. v2 keeps its
 * historical value so a legacy finalization is judged by the rules it was
 * claimed under; v3 uses the derived, challenge-specific ceiling.
 */
export function maxScoreForVersion(
  version: DailyRulesVersion,
  totalTokenPointsPossible: number,
): number {
  return version === DAILY_RULES_VERSION_V3
    ? maxScoreForV3Challenge(totalTokenPointsPossible)
    : V2_LEGACY_MAX_SCORE;
}
