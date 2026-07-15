import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PiAuthError, verifyPiRequest } from "../_lib/piAuth";
import {
  callRpc,
  getServiceConfig,
  MigrationRequiredError,
  RpcError,
} from "../_lib/supabaseRpc";
import { getOrCreateDailySnapshot } from "../_lib/dailySnapshot";
import {
  buildDailyTokenChallenge,
  TOKEN_CHALLENGE_VERSION,
  TOKEN_RULES_VERSION,
} from "../_lib/dailyTokenChallenge";

/**
 * POST /api/leaderboard/claim-attempt (Phase 11B-P4).
 *
 * Atomically RESERVES one of the 3 daily ranked attempts BEFORE the run starts,
 * so a started-then-abandoned ranked run still consumes an attempt. The only
 * client input is { submission_id }; identity comes from the verified Pi token,
 * and the challenge date/id are server-authoritative.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ClaimRow {
  status: string;
  attempt_number: number | null;
  used_count: number | null;
  left_count: number | null;
  submission_id: string;
  challenge_date: string;
  challenge_id: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const cfg = getServiceConfig();
  if (!cfg) {
    return res
      .status(500)
      .json({ error: "Server is missing Supabase configuration", code: "SERVER_ERROR" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
  if (!UUID_RE.test(submissionId)) {
    return res.status(400).json({ error: "Invalid submission_id", code: "SERVER_ERROR" });
  }

  // 1) Verify Pi identity (uid/username come from Pi, never the client body).
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

  // 2-6) Rebuild today's manifest and require it to be ranked-eligible.
  const challengeDate = todayUtc();
  let challenge: ReturnType<typeof buildDailyTokenChallenge>;
  try {
    const snap = await getOrCreateDailySnapshot();
    challenge = buildDailyTokenChallenge(snap);
  } catch {
    return res.status(503).json({
      error: "Daily challenge unavailable",
      code: "CHALLENGE_UNAVAILABLE",
      retryable: true,
    });
  }
  if (challenge.challengeDate !== challengeDate || !challenge.rankedEligible) {
    return res
      .status(409)
      .json({ error: "Today's challenge is not ranked-eligible", code: "CHALLENGE_NOT_RANKABLE" });
  }

  // 7-8) Atomic claim via the SQL function (server challengeId only).
  try {
    const rows = await callRpc<ClaimRow[]>(cfg, "claim_rushpi_daily_attempt_v2", {
      p_submission_id: submissionId,
      p_pi_user_uid: uid,
      p_pi_username: username,
      p_challenge_date: challengeDate,
      p_challenge_id: challenge.challengeId,
      p_rules_version: TOKEN_RULES_VERSION,
      p_token_challenge_version: TOKEN_CHALLENGE_VERSION,
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as ClaimRow | null);
    const status = row?.status ?? "";

    if (status === "limit_reached") {
      return res.status(409).json({ error: "Daily ranked attempt limit reached", code: "ATTEMPT_LIMIT" });
    }
    if (status === "submission_conflict") {
      return res
        .status(409)
        .json({ error: "This submission id conflicts with an earlier claim", code: "SUBMISSION_CONFLICT" });
    }
    if (status !== "claimed" && status !== "already_claimed") {
      return res.status(500).json({ error: "Unexpected claim result", code: "SERVER_ERROR" });
    }

    const used = row?.used_count ?? 0;
    const left = row?.left_count ?? Math.max(0, 3 - used);
    return res.status(200).json({
      ok: true,
      status,
      submissionId,
      attemptNumber: row?.attempt_number ?? null,
      used,
      left,
      challengeDate,
      challengeId: challenge.challengeId,
    });
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    if (err instanceof RpcError) {
      return res.status(err.status).json({ error: err.message, code: "SERVER_ERROR" });
    }
    console.error("[claim-attempt] error", err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
}
