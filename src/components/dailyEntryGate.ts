import type { AttemptStatus } from "../utils/serverLeaderboard";

/**
 * Phase 13G — the single pre-claim decision policy for every ranked Daily.
 *
 * Plain logic only (no JSX, React, Phaser, storage or network), so tests can
 * execute it — the same convention as `modeGuidance.ts`, `coachMarks.ts` and
 * `dailyMetaLesson.ts`. The type import is erased at runtime.
 *
 * All four ranked entry paths (Home Daily card, Daily result Play Again,
 * Leaderboard Play Daily Run, 13E First Result → Try the Daily Run) converge on
 * `DailyPreparationScreen`, which is the only caller of this module. There is
 * therefore exactly ONE implementation of the gate, and no path can reach
 * `claimAttempt()` without passing through it.
 *
 * AUTHORITY MODEL:
 *   fetchAttemptStatus() — read-only preflight; decides which gate to show.
 *   claimAttempt()       — final transactional authority; still guarded by
 *                          its own ATTEMPT_LIMIT handling, because the status
 *                          read can race with a claim made elsewhere.
 * The client never tries to be stronger than the server.
 */

export type PrepGate =
  /** Not a ranked request — no auth, no status read, no claim, ever. */
  | "local"
  /** Ranked requested but no Pi session — ask to connect; do not claim. */
  | "auth"
  /** Authenticated but the authoritative status is not known yet. */
  | "fetch-status"
  /** Server says zero ranked attempts left — no claim, offer local. */
  | "limit"
  /** Exactly one left and never acknowledged — confirm BEFORE any claim. */
  | "confirm-last"
  /** Safe to reserve: >1 left, or 1 left and already acknowledged. */
  | "claim";

export interface PrepGateInput {
  ranked: boolean;
  authenticated: boolean;
  /** Server-authoritative ranked attempts left, or null if not read yet. */
  left: number | null;
  acknowledged: boolean;
}

export function decidePrepGate(input: PrepGateInput): PrepGate {
  if (!input.ranked) return "local";
  if (!input.authenticated) return "auth";
  if (input.left === null) return "fetch-status";
  if (input.left <= 0) return "limit";
  if (input.left === 1 && !input.acknowledged) return "confirm-last";
  return "claim";
}

export type PreflightOutcome =
  | { gate: "auth" }
  | { gate: "limit" | "confirm-last" | "claim"; status: AttemptStatus }
  | { gate: "error"; error: unknown };

/**
 * The read-only half of a ranked preparation: resolve auth, read the
 * authoritative attempt status, and decide the gate.
 *
 * It is structurally incapable of reserving an attempt — it is never given a
 * claim function. A failing status read returns `{ gate: "error" }`; it never
 * falls through to a claim.
 */
export async function preflightRankedClaim(args: {
  accessToken: string | null;
  fetchStatus: (accessToken: string) => Promise<AttemptStatus>;
  isAcknowledged: () => boolean;
  /** Mirror the authoritative counter into the local display state. */
  onStatus?: (status: AttemptStatus) => void;
}): Promise<PreflightOutcome> {
  if (!args.accessToken) return { gate: "auth" };
  let status: AttemptStatus;
  try {
    status = await args.fetchStatus(args.accessToken);
  } catch (error) {
    return { gate: "error", error };
  }
  args.onStatus?.(status);
  const gate = decidePrepGate({
    ranked: true,
    authenticated: true,
    left: status.left,
    acknowledged: args.isAcknowledged(),
  });
  // `local`, `auth` and `fetch-status` are unreachable once a status exists.
  if (gate === "limit" || gate === "confirm-last" || gate === "claim") {
    return { gate, status };
  }
  return { gate: "error", error: new Error(`Unexpected gate ${gate}`) };
}

/**
 * Wrap an async action so overlapping calls share one in-flight run. A double
 * tap on "Use last ranked run", or a re-render firing the continuation twice,
 * therefore produces exactly one claim. Once the run settles the action may run
 * again — which is what an explicit Retry after a failed claim needs, and that
 * retry reuses the same idempotent submission id.
 */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = fn().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

/**
 * Last-attempt confirmation copy. The heading and primary action are the
 * canonical wording from PHASE-13G-CANONICAL-CLOSURE.md §3; the supporting line
 * and the local alternative come from the 13G task brief (§10/§12).
 */
export const LAST_ATTEMPT_COPY = {
  title: "This is your last ranked run today.",
  text: "You can still play locally without using it.",
  accept: "Use last ranked run",
  local: "Play locally",
  cancel: "Cancel",
} as const;
