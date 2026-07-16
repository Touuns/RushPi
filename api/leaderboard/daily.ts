import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callRpc,
  getServiceConfig,
  MigrationRequiredError,
  RpcError,
} from "../_lib/supabaseRpc";

/**
 * Today's Daily Token Rush leaderboard — top 50 DISTINCT users (Phase 11B-P4.1).
 *
 * Deduplication is done in SQL (get_rushpi_daily_leaderboard_v2): one best
 * valid v2 score per pi_user_uid for today's server-computed challenge, ranked
 * by score DESC / token_points DESC / tokens_collected_count DESC /
 * obstacles_hit ASC / created_at ASC / id ASC. Every historical run stays in
 * rushpi_scores; pi_user_uid is never returned to the client. If the corrective
 * migration is missing we fail structurally (MIGRATION_REQUIRED) — never fall
 * back to the old duplicated listing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", code: "SERVER_ERROR" });
  }

  const cfg = getServiceConfig();
  if (!cfg) {
    console.error("[leaderboard daily] Supabase env not configured");
    return res
      .status(500)
      .json({ error: "Server is missing Supabase configuration", code: "SERVER_ERROR" });
  }

  // Server-authoritative challenge identity (same rules as submit/claim).
  const challengeDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const challengeId = `RUSHPI-${challengeDate}-TOKEN-V1`;

  try {
    const scores = await callRpc<unknown[]>(cfg, "get_rushpi_daily_leaderboard_v2", {
      p_challenge_date: challengeDate,
      p_challenge_id: challengeId,
      p_limit: 50,
    });
    return res.status(200).json({ ok: true, scores: Array.isArray(scores) ? scores : [] });
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    if (err instanceof RpcError) {
      console.error("[leaderboard daily] rpc error", err.message);
      return res
        .status(err.status)
        .json({ error: "Failed to load leaderboard", code: "SERVER_ERROR" });
    }
    console.error("[leaderboard daily] server error", err);
    return res
      .status(500)
      .json({ error: "Server error loading leaderboard", code: "SERVER_ERROR" });
  }
}
