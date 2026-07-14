/**
 * Market data types (Phase 11A) — client-side mirror of api/_lib/marketTypes.ts.
 * The frontend only ever talks to Rush Pi's own /api/market/* endpoints; it has
 * no knowledge of the CoinGecko key.
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
  challengeDate: string;
  source: "coingecko";
  currency: "usd";
  createdAt: string;
  coins: MarketCoin[];
  version: 1;
  status?: "live" | "stale" | "fallback";
}

/** Required CoinGecko Demo-plan attribution (reused by future screens). */
export const MARKET_DATA_ATTRIBUTION = "Market data by CoinGecko";
