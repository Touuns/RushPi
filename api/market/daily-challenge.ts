import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateDailySnapshot } from "../_lib/dailySnapshot";
import { buildDailyTokenChallenge } from "../_lib/dailyTokenChallenge";

/**
 * GET /api/market/daily-challenge — today's deterministic Daily Token Rush
 * manifest (Phase 11B). Server-computed UTC date, server-selected tokens,
 * server-calculated points; identical on every call for the whole day. No
 * client parameters are accepted, and CoinGecko is only hit if today's
 * snapshot doesn't exist yet (via the shared snapshot helper).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  const snap = await getOrCreateDailySnapshot();
  const challenge = buildDailyTokenChallenge(snap);
  return res.status(200).json(challenge);
}
