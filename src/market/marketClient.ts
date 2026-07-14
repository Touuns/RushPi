import type { DailyMarketSnapshot, MarketCoin, MarketResponse } from "./types";

/**
 * Client for Rush Pi's own market endpoints (Phase 11A). Never talks to
 * CoinGecko directly and knows nothing about the API key. Callers decide when
 * to fetch (no polling, no per-render calls).
 */
const CLIENT_TIMEOUT_MS = 8000;

export class MarketClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketClientError";
  }
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new MarketClientError(`Request failed (${res.status})`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof MarketClientError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new MarketClientError("Market request timed out");
    }
    throw new MarketClientError("Network error reaching the market service");
  } finally {
    clearTimeout(timer);
  }
}

function isValidCoinArray(coins: unknown): coins is MarketCoin[] {
  return (
    Array.isArray(coins) &&
    coins.every(
      (c) =>
        c &&
        typeof (c as MarketCoin).id === "string" &&
        typeof (c as MarketCoin).symbol === "string" &&
        Number.isFinite((c as MarketCoin).currentPriceUsd),
    )
  );
}

export async function fetchMarketCoins(): Promise<MarketResponse> {
  const data = await getJson<MarketResponse>("/api/market/coins");
  if (!data || !isValidCoinArray(data.coins) || typeof data.status !== "string") {
    throw new MarketClientError("Malformed market response");
  }
  return data;
}

export async function fetchDailyMarketSnapshot(): Promise<DailyMarketSnapshot> {
  const data = await getJson<DailyMarketSnapshot>("/api/market/daily");
  if (!data || !isValidCoinArray(data.coins) || typeof data.challengeDate !== "string") {
    throw new MarketClientError("Malformed market snapshot");
  }
  return data;
}
