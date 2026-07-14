import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { MarketResponse } from "../_lib/marketTypes";
import {
  buildMarketResponse,
  FALLBACK_COINS,
  fetchApprovedMarketCoins,
  getMarketCacheKey,
} from "../_lib/coingecko";

/**
 * GET /api/market/coins — live/cached market data for the APPROVED catalog only
 * (Phase 11A). No client-chosen IDs: this is not an open CoinGecko proxy.
 *
 * Caching: CDN gets `s-maxage=300, stale-while-revalidate=900`, so one upstream
 * request serves many players; a warm lambda also keeps a 5-minute in-memory
 * copy. localStorage is never used as a server cache.
 */
const MEMORY_TTL_MS = 5 * 60 * 1000;

interface MemoryCacheEntry {
  key: string;
  at: number;
  response: MarketResponse;
}

let memoryCache: MemoryCacheEntry | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  const key = getMarketCacheKey();
  const now = Date.now();
  if (memoryCache && memoryCache.key === key && now - memoryCache.at < MEMORY_TTL_MS) {
    return res.status(200).json({ ...memoryCache.response, status: "cached" });
  }

  try {
    const coins = await fetchApprovedMarketCoins();
    const response = buildMarketResponse("live", coins);
    memoryCache = { key, at: now, response };
    return res.status(200).json(response);
  } catch (err) {
    // Clean failure paths — never leak the key or raw provider internals.
    console.error("[market coins]", err instanceof Error ? err.message : "unknown error");
    if (memoryCache && memoryCache.key === key) {
      // Serve the last good copy as stale rather than failing.
      return res.status(200).json({ ...memoryCache.response, status: "stale" });
    }
    return res.status(200).json(buildMarketResponse("fallback", FALLBACK_COINS));
  }
}
