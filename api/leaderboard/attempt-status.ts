import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PiAuthError, verifyPiRequest } from "../_lib/piAuth";
import {
  callRpc,
  getServiceConfig,
  MigrationRequiredError,
  RpcError,
} from "../_lib/supabaseRpc";

/**
 * GET /api/leaderboard/attempt-status (Phase 11B-P4).
 *
 * Returns the SERVER-authoritative ranked-attempt counter for the verified Pi
 * user for today (UTC). Requires a valid Pi access token in Authorization:
 * Bearer. The server counts reservations (all Daily versions) via an atomic SQL
 * function; the client uses this as the source of truth and treats its local
 * counter as a mere mirror/fallback.
 */

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

interface StatusRow {
  used_count: number;
  left_count: number;
  max_count: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const cfg = getServiceConfig();
  if (!cfg) {
    return res
      .status(500)
      .json({ error: "Server is missing Supabase configuration", code: "SERVER_ERROR" });
  }

  let uid: string;
  try {
    ({ uid } = await verifyPiRequest(req));
  } catch (err) {
    if (err instanceof PiAuthError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: "Auth verification error", code: "SERVER_ERROR" });
  }

  const challengeDate = todayUtc();
  try {
    const rows = await callRpc<StatusRow[]>(cfg, "get_rushpi_daily_attempt_status_v2", {
      p_pi_user_uid: uid,
      p_challenge_date: challengeDate,
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as StatusRow | null);
    const used = row?.used_count ?? 0;
    const max = row?.max_count ?? 3;
    const left = row?.left_count ?? Math.max(0, max - used);
    return res.status(200).json({ ok: true, used, left, max, challengeDate });
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    if (err instanceof RpcError) {
      return res.status(err.status).json({ error: err.message, code: "SERVER_ERROR" });
    }
    console.error("[attempt-status] error", err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
}
