import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  callRpc,
  getServiceConfig,
  MigrationRequiredError,
  RpcError,
} from "../_lib/supabaseRpc";

/**
 * All-time Daily Token Rush leaderboard — top 50 DISTINCT users (Phase 11B-P4.1).
 *
 * Deduplication is done in SQL (get_rushpi_global_leaderboard_v2): one best
 * valid v2 score per pi_user_uid across all days, using the same deterministic
 * ordering as the daily board. All runs stay stored; pi_user_uid is never
 * returned. Missing corrective migration → MIGRATION_REQUIRED (no silent
 * fallback to the duplicated listing).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", code: "SERVER_ERROR" });
  }

  const cfg = getServiceConfig();
  if (!cfg) {
    console.error("[leaderboard global] Supabase env not configured");
    return res
      .status(500)
      .json({ error: "Server is missing Supabase configuration", code: "SERVER_ERROR" });
  }

  try {
    const scores = await callRpc<unknown[]>(cfg, "get_rushpi_global_leaderboard_v2", {
      p_limit: 50,
    });
    return res.status(200).json({ ok: true, scores: Array.isArray(scores) ? scores : [] });
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return res.status(503).json({ error: err.message, code: "MIGRATION_REQUIRED" });
    }
    if (err instanceof RpcError) {
      console.error("[leaderboard global] rpc error", err.message);
      return res
        .status(err.status)
        .json({ error: "Failed to load leaderboard", code: "SERVER_ERROR" });
    }
    console.error("[leaderboard global] server error", err);
    return res
      .status(500)
      .json({ error: "Server error loading leaderboard", code: "SERVER_ERROR" });
  }
}
