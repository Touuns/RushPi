/**
 * Client for the server leaderboard (Phase 6A).
 *
 * Talks ONLY to our own Vercel API routes (same origin) — never to Supabase
 * directly, so no Supabase key is ever in the frontend. All calls fail soft:
 * callers keep the local leaderboard working if the server is unavailable.
 *
 * Note: in `npm run dev` (Vite only) the /api routes are not served, so these
 * will fail — that's expected; use the deployed site or `vercel dev` to test.
 */

export interface ServerScore {
  pi_username: string | null;
  score: number;
  energy_collected: number;
  max_combo: number;
  obstacles_hit: number;
  created_at: string;
  /** Daily Token Rush (Phase 11B) — present on v2 rows, absent/0 on legacy v1. */
  token_points?: number;
  tokens_collected_count?: number;
}

// ---- Structured server errors (Phase 11B-P4) ----------------------------

/** Stable error codes returned by the ranked endpoints (never regex the text). */
export type ServerScoreErrorCode =
  | "PI_AUTH_REQUIRED"
  | "PI_AUTH_INVALID"
  | "PI_AUTH_EXPIRED"
  | "PI_AUTH_UNAVAILABLE"
  | "ATTEMPT_LIMIT"
  | "CHALLENGE_UNAVAILABLE"
  | "CHALLENGE_NOT_RANKABLE"
  | "SUBMISSION_NOT_CLAIMED"
  | "SUBMISSION_CONFLICT"
  | "SUBMISSION_EXPIRED"
  | "SCORE_REJECTED"
  | "MIGRATION_REQUIRED"
  | "NETWORK_ERROR"
  | "SERVER_ERROR";

/** Codes the client may safely retry unchanged (transient conditions). */
const RETRYABLE_CODES: ReadonlySet<ServerScoreErrorCode> = new Set([
  "PI_AUTH_UNAVAILABLE",
  "CHALLENGE_UNAVAILABLE",
  "NETWORK_ERROR",
  "SERVER_ERROR",
]);

export class ServerScoreError extends Error {
  code: ServerScoreErrorCode;
  retryable: boolean;
  status: number;

  constructor(code: ServerScoreErrorCode, message: string, status: number, retryable?: boolean) {
    super(message);
    this.name = "ServerScoreError";
    this.code = code;
    this.status = status;
    this.retryable = retryable ?? RETRYABLE_CODES.has(code);
  }
}

interface ErrorBody {
  error?: string;
  code?: string;
  retryable?: boolean;
}

function isKnownCode(code: string | undefined): code is ServerScoreErrorCode {
  return (
    !!code &&
    [
      "PI_AUTH_REQUIRED",
      "PI_AUTH_INVALID",
      "PI_AUTH_EXPIRED",
      "PI_AUTH_UNAVAILABLE",
      "ATTEMPT_LIMIT",
      "CHALLENGE_UNAVAILABLE",
      "CHALLENGE_NOT_RANKABLE",
      "SUBMISSION_NOT_CLAIMED",
      "SUBMISSION_CONFLICT",
      "SUBMISSION_EXPIRED",
      "SCORE_REJECTED",
      "MIGRATION_REQUIRED",
      "NETWORK_ERROR",
      "SERVER_ERROR",
    ].includes(code)
  );
}

/** Turn a non-OK response into a typed ServerScoreError using its `code`. */
async function errorFromResponse(res: Response): Promise<ServerScoreError> {
  let body: ErrorBody = {};
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    /* keep defaults */
  }
  const code: ServerScoreErrorCode = isKnownCode(body.code) ? body.code : "SERVER_ERROR";
  const message = body.error || `Request failed (${res.status})`;
  return new ServerScoreError(code, message, res.status, body.retryable);
}

/** Wrap a network-level failure (fetch threw) as a retryable NETWORK_ERROR. */
function networkError(): ServerScoreError {
  return new ServerScoreError("NETWORK_ERROR", "Network error reaching the server.", 0, true);
}

// ---- Ranked attempt status (Phase 11B-P4) -------------------------------

export interface AttemptStatus {
  used: number;
  left: number;
  max: number;
  challengeDate: string;
}

/**
 * Fetch the server-authoritative ranked-attempt counter for the verified Pi
 * user. Requires the in-memory access token (sent as a Bearer header, never in
 * the URL or body). Throws a ServerScoreError on failure.
 */
export async function fetchAttemptStatus(accessToken: string): Promise<AttemptStatus> {
  let res: Response;
  try {
    res = await fetch("/api/leaderboard/attempt-status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw networkError();
  }
  if (!res.ok) throw await errorFromResponse(res);
  const data = (await res.json()) as Partial<AttemptStatus>;
  return {
    used: data.used ?? 0,
    left: data.left ?? 0,
    max: data.max ?? 3,
    challengeDate: data.challengeDate ?? new Date().toISOString().slice(0, 10),
  };
}

export interface SubmitScorePayload {
  pi_user_uid: string;
  pi_username: string;
  score: number;
  energy_collected: number;
  max_combo: number;
  obstacles_hit: number;
  duration_seconds: number;
  game_mode: "daily";
  /** Daily challenge this run belongs to (server is authoritative, but we send). */
  challenge_id: string;
  challenge_date: string;
  /**
   * Daily Token Rush (Phase 11B). The server re-derives and re-validates all of
   * these from its own snapshot/manifest — it never trusts the client values.
   */
  rules_version: 2;
  daily_token_challenge_version: 1;
  daily_challenge_id: string;
  token_ids_collected: string[];
  token_points: number;
  tokens_collected_count: number;
}

async function getScores(url: string): Promise<ServerScore[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`);
  const data = (await res.json()) as { scores?: ServerScore[] };
  return Array.isArray(data.scores) ? data.scores : [];
}

export function fetchDailyLeaderboard(): Promise<ServerScore[]> {
  return getScores("/api/leaderboard/daily");
}

export function fetchGlobalLeaderboard(): Promise<ServerScore[]> {
  return getScores("/api/leaderboard/global");
}

/** Submit a Daily Run score. Throws on failure (caller keeps the run unblocked). */
export async function submitServerScore(payload: SubmitScorePayload): Promise<void> {
  const res = await fetch("/api/leaderboard/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = `Server sync failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
}
