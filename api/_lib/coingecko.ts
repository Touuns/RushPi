import type { MarketCoin, MarketResponse } from "./marketTypes";
import { MARKET_DATA_ATTRIBUTION } from "./marketTypes";
import { approvedIdsParam, TOKEN_CATALOG } from "./tokenCatalog";

/**
 * Server-side CoinGecko client (Phase 11A). One request fetches the whole
 * approved catalog; every response is strictly validated before use. The Demo
 * API key stays server-only (env COINGECKO_DEMO_API_KEY) — never logged, never
 * echoed in errors, never sent to the browser.
 */
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const FETCH_TIMEOUT_MS = 7000;

/** Raw (untrusted) shape of one /coins/markets row. */
interface RawMarketRow {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  image?: unknown;
  current_price?: unknown;
  market_cap?: unknown;
  market_cap_rank?: unknown;
  price_change_percentage_24h?: unknown;
  last_updated?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Strict validation — a coin failing any rule is silently skipped. */
export function isValidMarketCoin(c: MarketCoin | null): c is MarketCoin {
  if (!c) return false;
  return (
    isNonEmptyString(c.id) &&
    isNonEmptyString(c.symbol) &&
    isNonEmptyString(c.name) &&
    c.imageUrl.startsWith("https://") &&
    Number.isFinite(c.currentPriceUsd) &&
    c.currentPriceUsd >= 0 &&
    !Number.isNaN(Date.parse(c.providerUpdatedAt))
  );
}

/** Normalize one raw CoinGecko row into a MarketCoin (or null if unusable). */
function normalizeRow(row: RawMarketRow): MarketCoin | null {
  if (
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.symbol) ||
    !isNonEmptyString(row.name) ||
    !isNonEmptyString(row.image)
  ) {
    return null;
  }
  const price = finiteOrNull(row.current_price);
  if (price === null || price < 0) return null;
  const updated = isNonEmptyString(row.last_updated)
    ? row.last_updated
    : new Date().toISOString();
  return {
    id: row.id,
    symbol: row.symbol.toUpperCase(),
    name: row.name,
    imageUrl: row.image,
    currentPriceUsd: price,
    marketCapUsd: finiteOrNull(row.market_cap),
    marketCapRank: finiteOrNull(row.market_cap_rank),
    priceChange24h: finiteOrNull(row.price_change_percentage_24h),
    providerUpdatedAt: updated,
  };
}

/** Normalize the whole /coins/markets payload, dropping invalid entries. */
export function normalizeCoinGeckoMarketResponse(payload: unknown): MarketCoin[] {
  if (!Array.isArray(payload)) return [];
  const approved = new Set(TOKEN_CATALOG.map((t) => t.id));
  const coins: MarketCoin[] = [];
  for (const row of payload as RawMarketRow[]) {
    const coin = normalizeRow(row);
    // Defense in depth: even the provider response is filtered by the whitelist.
    if (isValidMarketCoin(coin) && approved.has(coin.id)) coins.push(coin);
  }
  return coins;
}

/** Cache key for the (single) approved-catalog market request. */
export function getMarketCacheKey(): string {
  return `coingecko:markets:usd:v1:${TOKEN_CATALOG.length}`;
}

/**
 * Fetch the approved catalog from CoinGecko. Throws a clean Error (no secrets)
 * on failure; the caller decides the fallback strategy.
 */
export async function fetchApprovedMarketCoins(): Promise<MarketCoin[]> {
  const apiKey = process.env.COINGECKO_DEMO_API_KEY;
  if (!apiKey) {
    // Public access still works with strict rate limits; flag it for ops.
    console.warn("[market] COINGECKO_DEMO_API_KEY is not set — using public rate limits");
  }

  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: approvedIdsParam(),
    order: "market_cap_desc",
    sparkline: "false",
    price_change_percentage: "24h",
    locale: "en",
    precision: "full",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${COINGECKO_BASE_URL}/coins/markets?${params}`, {
      headers: {
        accept: "application/json",
        ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
      },
      signal: controller.signal,
    });

    if (res.status === 401) throw new Error("CoinGecko rejected the API key (401)");
    if (res.status === 429) throw new Error("CoinGecko rate limit reached (429)");
    if (!res.ok) throw new Error(`CoinGecko error (${res.status})`);

    const payload: unknown = await res.json();
    const coins = normalizeCoinGeckoMarketResponse(payload);
    if (coins.length === 0) throw new Error("CoinGecko returned no valid coins");
    return coins;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("CoinGecko request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tiny built-in fallback when CoinGecko is unreachable and no snapshot exists.
 * Prices are UNKNOWN (0) and the response is clearly status="fallback" — the UI
 * must show "Price unavailable", never "$0.00" as if real.
 */
export const FALLBACK_COINS: MarketCoin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: 1, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: 2, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
  { id: "solana", symbol: "SOL", name: "Solana", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: null, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
  { id: "stellar", symbol: "XLM", name: "Stellar", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: null, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
  { id: "cardano", symbol: "ADA", name: "Cardano", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: null, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", imageUrl: "", currentPriceUsd: 0, marketCapUsd: null, marketCapRank: null, priceChange24h: null, providerUpdatedAt: "1970-01-01T00:00:00.000Z" },
];

/** Assemble a full MarketResponse envelope. */
export function buildMarketResponse(
  status: MarketResponse["status"],
  coins: MarketCoin[],
): MarketResponse {
  return {
    source: "coingecko",
    status,
    currency: "usd",
    fetchedAt: new Date().toISOString(),
    providerUpdatedAt: coins[0]?.providerUpdatedAt ?? null,
    coins,
    attribution: MARKET_DATA_ATTRIBUTION,
  };
}
