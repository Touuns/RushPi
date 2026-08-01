/**
 * Active ranked Daily rules version — CLIENT mirror (Phase 13-R2).
 *
 * WHY A SEPARATE CONSTANT
 * The frontend and the serverless API are distinct TypeScript build targets:
 * `tsconfig.json` includes only `src`, and `api/tsconfig.json` only `api`.
 * Importing the API's policy module here would drag server-only code (and its
 * `node:crypto` dependency chain) into the browser bundle, while importing this
 * file from the API would pull browser code into every serverless function.
 * The two constants are therefore declared separately — and
 * `dailyRulesVersion.test.ts` reads BOTH source files and fails if they ever
 * diverge, so the duplication cannot silently rot.
 *
 * AUTHORITY
 * This value is NOT what makes a run rank as v3. The server assigns the version
 * at claim time and binds it to the reservation; the client merely echoes the
 * version its own reservation reported. Changing this constant in a modified
 * client cannot change which rules the server applies.
 */

/** The ranked version this client build expects from the server. */
export const DAILY_RULES_VERSION = 3;

/** Ranked versions this client can still read (v2 = pre-13-R1 collision model). */
export const KNOWN_DAILY_RULES_VERSIONS: readonly number[] = [2, DAILY_RULES_VERSION];

/**
 * True only for the ACTIVE version. Used where the client must not treat a
 * legacy run as if it were current — personal bests, active summaries and the
 * reusable-challenge check.
 */
export function isActiveDailyRulesVersion(value: unknown): value is 3 {
  return value === DAILY_RULES_VERSION;
}
