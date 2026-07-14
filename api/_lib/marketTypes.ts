/**
 * Market data types (Phase 11A) — server side. Files under api/_lib are NOT
 * deployed as Vercel functions (underscore convention); they are shared helpers
 * for the /api/market/* endpoints. A client-side mirror lives in
 * src/market/types.ts.
 */

export interface MarketCoin {
  /** CoinGecko ID — the functional primary key (symbols can collide). */
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  currentPriceUsd: number;
  marketCapUsd: number | null;
  marketCapRank: number | null;
  /** 24h price change in percent, when provided. */
  priceChange24h: number | null;
  providerUpdatedAt: string;
}

export interface MarketResponse {
  source: "coingecko";
  status: "live" | "cached" | "stale" | "fallback";
  currency: "usd";
  fetchedAt: string;
  providerUpdatedAt: string | null;
  coins: MarketCoin[];
  attribution: string;
}

export interface DailyMarketSnapshot {
  /** UTC day YYYY-MM-DD this snapshot is immutable for. */
  challengeDate: string;
  source: "coingecko";
  currency: "usd";
  createdAt: string;
  coins: MarketCoin[];
  version: 1;
  /** "live" when freshly created/persisted; "fallback" when not persisted. */
  status?: "live" | "stale" | "fallback";
}

export const MARKET_DATA_ATTRIBUTION = "Market data by CoinGecko";
