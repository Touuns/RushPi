import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { DailyMarketSnapshot } from "../_lib/marketTypes";
import { getOrCreateDailySnapshot } from "../_lib/dailySnapshot";

/**
 * GET /api/market/daily — the IMMUTABLE market snapshot for the current UTC day
 * (Phase 11A; snapshot logic shared via api/_lib/dailySnapshot.ts since 11B).
 * Persisted rows come back without a status field; stale/fallback responses are
 * clearly marked. Never a partially-invalid JSON.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  const snap = await getOrCreateDailySnapshot();
  const body: DailyMarketSnapshot = {
    challengeDate: snap.challengeDate,
    source: "coingecko",
    currency: "usd",
    createdAt: snap.createdAt,
    coins: snap.coins,
    version: 1,
    // Persisted "live" rows keep the historical shape (no status field).
    ...(snap.persisted && snap.status === "live" ? {} : { status: snap.status }),
  };
  return res.status(200).json(body);
}
