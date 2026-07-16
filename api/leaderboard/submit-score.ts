import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PiAuthError, verifyPiRequest } from "../_lib/piAuth";
import {
  callRpc,
  getServiceConfig,
  MigrationRequiredError,
  RpcError,
  type ServiceConfig,
} from "../_lib/supabaseRpc";
import { getPersistedDailySnapshotForDate } from "../_lib/dailySnapshot";
import {
  buildDailyTokenChallenge,
  computeDailyTokenPoints,
  TOKEN_CHALLENGE_VERSION,
  TOKEN_RULES_VERSION,
} from "../_lib/dailyTokenChallenge";
import { computeScoreDigest } from "../_lib/scoreDigest";

/**
 * Finalize a ranked Daily Token Rush score (Phase 11B-P4).
 *
 * Identity comes from the verified Pi access token (Authorization: Bearer), NOT
 * from the body. The run is bound to a reservation (submission_id) claimed before
 * the run started; the reservation's challenge_date/challenge_id are used to
 * rebuild the exact manifest and revalidate every token. A canonical digest makes
 * re-submissions idempotent (same run → no second row) and conflicting ones
 * explicit. The whole insert+finalize is one atomic SQL transaction.
 *
 * Client body (run facts only): submission_id, score, energy_collected,
 * max_combo, obstacles_hit, duration_seconds, rules_version,
 * daily_token_challenge_version, token_ids_collected, token_points,
 * tokens_collected_count. No pi_user_uid / pi_username / challenge_id /
 * challenge_date is trusted from the client.
 */

// Plausibility ceilings (unchanged from Phase 11B). Token Rush adds at most
// 15*750 = 11,250 fixed points; the theoretical max stays well under 50,000.
const LIMITS = {
  maxScore: 50000,
  minDuration: 50,
  maxDuration: 70,
  maxEnergy: 1000,
  maxCombo: 1000,
  maxObstacles: 1000,
};

// A claimed reservation can be finalized for its reserved date within a
// 30-minute window after claimed_at (covers a run crossing midnight UTC).
// Since P4.1 that window is enforced atomically inside the finalize SQL
// function; this endpoint only relays the resulting 'expired' status.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

interface ReservationRow {
  submission_id: string;
  pi_user_uid: string;
  pi_username: string;
  challenge_date: string;
  challenge_id: string;
  status: string;
  claimed_at: string;
  result_digest: string | null;
  score_row_id: string | null;
}

/** Read a reservation by submission_id via PostgREST (service role). */
async function readReservation(
  cfg: ServiceConfig,
  submissionId: string,
): Promise<ReservationRow | null> {
  const r = await fetch(
    `${cfg.url}/rest/v1/rushpi_ranked_attempts?submission_id=eq.${submissionId}&limit=1`,
    { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } },
  );
  if (r.status === 404) throw new MigrationRequiredError();
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    if (/42P01|does not exist/i.test(body)) throw new MigrationRequiredError();
    throw new RpcError(`Reservation read failed (${r.status})`);
  }
  const rows = (await r.json()) as ReservationRow[];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Read the stored is_valid flag of the score row bound to a submission (11B-P4.1).
 * An idempotent retry of an already-completed reservation must answer with the
 * SAME ranked outcome as the first submission — a plausibility-rejected run
 * (is_valid=false) can never flip to ranked:true via a replay. Returns null when
 * no score row exists (inconsistent state → the caller reports SERVER_ERROR).
 */
async function readScoreValidity(
  cfg: ServiceConfig,
  submissionId: string,
): Promise<boolean | null> {
  const r = await fetch(
    `${cfg.url}/rest/v1/rushpi_scores?submission_id=eq.${submissionId}&select=is_valid&limit=1`,
    { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } },
  );
  if (!r.ok) throw new RpcError(`Score validity read failed (${r.status})`);
  const rows = (await r.json()) as { is_valid: boolean }[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].is_valid === true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "SERVER_ERROR" });
  }

  const cfg = getServiceConfig();
  if (!cfg) {
    return res
      .status(500)
      .json({ error: "Server is missing Supabase configuration", code: "SERVER_ERROR" });
  }

  // 1) Verify Pi identity.
  let uid: string;
  let username: string;
  try {
    ({ uid, username } = await verifyPiRequest(req));
  } catch (err) {
    if (err instanceof PiAuthError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: "Auth verification error", code: "SERVER_ERROR" });
  }

  // 2) Parse & structurally validate the run facts.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  if (!UUID_RE.test(submissionId)) {
    return res.status(400).json({ error: "Invalid submission_id", code: "SERVER_ERROR" });
  }
  if (
    body.rules_version !== TOKEN_RULES_VERSION ||
    body.daily_token_challenge_version !== TOKEN_CHALLENGE_VERSION
  ) {
    return res.status(400).json({ error: "Unsupported version", code: "CHALLENGE_NOT_RANKABLE" });
  }
  const score = body.score;
  const energy_collected = body.energy_collected;
  const max_combo = body.max_combo;
  const obstacles_hit = body.obstacles_hit;
  const duration_seconds = body.duration_seconds;
  const token_points = body.token_points;
  const tokens_collected_count = body.tokens_collected_count;
  const token_ids_collected = body.token_ids_collected;
  const structurallyValid =
    isInt(score) &&
    isInt(energy_collected) &&
    isInt(max_combo) &&
    isInt(obstacles_hit) &&
    isInt(duration_seconds) &&
    isInt(token_points) &&
    isInt(tokens_collected_count) &&
    score >= 0 &&
    energy_collected >= 0 &&
    max_combo >= 0 &&
    obstacles_hit >= 0 &&
    token_points >= 0 &&
    isStringArray(token_ids_collected) &&
    new Set(token_ids_collected).size === token_ids_collected.length;

  // 3) Load the reservation (identity + challenge come from here, not the client).
  let reservation: ReservationRow | null;
  try {
    reservation = await readReservation(cfg, submissionId);
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    return res.status(502).json({ error: "Reservation lookup failed", code: "SERVER_ERROR" });
  }
  if (!reservation) {
    return res
      .status(409)
      .json({ error: "No ranked reservation for this run", code: "SUBMISSION_NOT_CLAIMED" });
  }
  if (reservation.pi_user_uid !== uid) {
    return res
      .status(409)
      .json({ error: "Reservation belongs to another user", code: "SUBMISSION_CONFLICT" });
  }

  const challengeDate = reservation.challenge_date;

  // 4) Expiry window (Bloc 12, hardened in P4.1): a claimed reservation can be
  // finalized within 30 minutes of claimed_at. The window is now enforced
  // ATOMICALLY inside finalize_rushpi_daily_score_v2 (same advisory lock/
  // transaction) — the RPC returns status='expired' and this endpoint just
  // reports it below. No separate PATCH from here.

  // Helper: mark the reservation rejected (structural/manifest failure) and reply.
  const rejectAndRespond = async (httpStatus: number, code: string, message: string) => {
    try {
      await callRpc(cfg, "reject_rushpi_daily_attempt_v2", {
        p_submission_id: submissionId,
        p_pi_user_uid: uid,
        p_challenge_date: challengeDate,
        p_rejection_code: code,
      });
    } catch {
      /* best effort — the response still tells the client it's not ranked */
    }
    return res.status(httpStatus).json({ error: message, code });
  };

  if (!structurallyValid) {
    return rejectAndRespond(400, "SCORE_REJECTED", "Malformed run payload");
  }
  // Narrowed ints (the structural check above guarantees these).
  const nScore = score as number;
  const nDuration = duration_seconds as number;
  const nTokenPoints = token_points as number;
  const nTokenCount = tokens_collected_count as number;
  const ids = token_ids_collected as string[];

  // 5) Rebuild the manifest for the reservation's date and match its challengeId.
  let challenge: ReturnType<typeof buildDailyTokenChallenge>;
  const snap = await getPersistedDailySnapshotForDate(challengeDate);
  if (!snap) {
    return res.status(503).json({
      error: "Daily snapshot unavailable — score not ranked",
      code: "CHALLENGE_UNAVAILABLE",
      retryable: true,
    });
  }
  challenge = buildDailyTokenChallenge(snap);
  if (challenge.challengeId !== reservation.challenge_id) {
    return rejectAndRespond(409, "CHALLENGE_NOT_RANKABLE", "Challenge mismatch for reservation");
  }

  // 6) Token revalidation (unchanged rules): membership + recomputed points.
  const pointsById = new Map(
    challenge.tokens.map((t) => [
      t.id,
      computeDailyTokenPoints({
        currentPriceUsd: t.referencePriceUsd,
        marketCapRank: t.marketCapRank,
      }),
    ]),
  );
  let recomputed = 0;
  for (const id of ids) {
    const pts = pointsById.get(id);
    if (pts === undefined) {
      return rejectAndRespond(400, "SCORE_REJECTED", "Unknown token id in submission");
    }
    recomputed += pts;
  }
  if (
    recomputed !== nTokenPoints ||
    nTokenCount !== ids.length ||
    nTokenPoints > challenge.totalTokenPointsPossible ||
    nScore < nTokenPoints
  ) {
    return rejectAndRespond(400, "SCORE_REJECTED", "Token totals do not reconcile");
  }

  // 7) Plausibility ceilings → is_valid (does not reject structurally-fine runs).
  const is_valid =
    nScore <= LIMITS.maxScore &&
    nDuration >= LIMITS.minDuration &&
    nDuration <= LIMITS.maxDuration &&
    (energy_collected as number) <= LIMITS.maxEnergy &&
    (max_combo as number) <= LIMITS.maxCombo &&
    (obstacles_hit as number) <= LIMITS.maxObstacles;

  // 8) Canonical digest over the server-verified facts (Bloc 13).
  const digest = computeScoreDigest({
    submissionId,
    uid,
    challengeId: reservation.challenge_id,
    challengeDate,
    rulesVersion: TOKEN_RULES_VERSION,
    tokenChallengeVersion: TOKEN_CHALLENGE_VERSION,
    score: nScore,
    energyCollected: energy_collected as number,
    maxCombo: max_combo as number,
    obstaclesHit: obstacles_hit as number,
    durationSeconds: nDuration,
    tokenPoints: nTokenPoints,
    tokensCollectedCount: nTokenCount,
    tokenIds: ids,
  });

  // 9) Atomic finalize: insert score + close the reservation in one transaction.
  try {
    const rows = await callRpc<{ status: string }[]>(cfg, "finalize_rushpi_daily_score_v2", {
      p_submission_id: submissionId,
      p_pi_user_uid: uid,
      p_pi_username: username,
      p_challenge_date: challengeDate,
      p_challenge_id: reservation.challenge_id,
      p_result_digest: digest,
      p_score: nScore,
      p_energy_collected: energy_collected as number,
      p_max_combo: max_combo as number,
      p_obstacles_hit: obstacles_hit as number,
      p_duration_seconds: nDuration,
      p_rules_version: TOKEN_RULES_VERSION,
      p_token_challenge_version: TOKEN_CHALLENGE_VERSION,
      p_token_points: nTokenPoints,
      p_tokens_collected_count: nTokenCount,
      p_token_ids_collected: ids,
      p_is_valid: is_valid,
    });
    const status = (Array.isArray(rows) ? rows[0]?.status : undefined) ?? "";

    if (status === "completed") {
      return is_valid
        ? res.status(200).json({ ok: true, ranked: true })
        : res.status(200).json({ ok: true, ranked: false, code: "SCORE_REJECTED" });
    }
    if (status === "already_completed") {
      // Idempotent replay: re-read the STORED is_valid (never trust the client;
      // never let a rejected score flip to ranked on retry) — 11B-P4.1.
      const storedValid = await readScoreValidity(cfg, submissionId);
      if (storedValid === null) {
        console.error("[submit-score] completed reservation without score row", submissionId);
        return res
          .status(500)
          .json({ error: "Inconsistent submission state", code: "SERVER_ERROR" });
      }
      return storedValid
        ? res.status(200).json({ ok: true, ranked: true, idempotent: true })
        : res
            .status(200)
            .json({ ok: true, ranked: false, code: "SCORE_REJECTED", idempotent: true });
    }
    if (status === "submission_conflict") {
      return res
        .status(409)
        .json({ error: "Conflicts with an earlier submission", code: "SUBMISSION_CONFLICT" });
    }
    if (status === "expired") {
      return res.status(200).json({ ok: true, ranked: false, code: "SUBMISSION_EXPIRED" });
    }
    return res
      .status(409)
      .json({ error: "Run was not reserved", code: "SUBMISSION_NOT_CLAIMED" });
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    if (err instanceof RpcError) {
      return res.status(err.status).json({ error: err.message, code: "SERVER_ERROR" });
    }
    console.error("[submit-score] error", err);
    return res.status(500).json({ error: "Server error saving score", code: "SERVER_ERROR" });
  }
}
