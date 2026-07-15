import type { MarketCoin } from "./marketTypes";
import { FALLBACK_COINS, fetchApprovedMarketCoins } from "./coingecko";

/**
 * Shared source of truth for the immutable UTC-day market snapshot (Phase 11B
 * refactor of /api/market/daily). Reused by /api/market/daily,
 * /api/market/daily-challenge and submit-score so the selection/points logic
 * always works from the exact same persisted data.
 */
export interface SnapshotResult {
  /** UTC day the coins belong to (may be an older day for stale fallbacks). */
  challengeDate: string;
  createdAt: string;
  providerUpdatedAt: string | null;
  coins: MarketCoin[];
  /** True only when this is the persisted Supabase row (immutable). */
  persisted: boolean;
  /** live = today's persisted/fresh data; stale = older persisted snapshot;
   *  fallback = not persisted (Supabase down or built-in coins). */
  status: "live" | "stale" | "fallback";
}

interface SnapshotRow {
  challenge_date: string;
  currency: string;
  version: number;
  source: string;
  coins: MarketCoin[];
  provider_updated_at: string | null;
  created_at: string;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowToResult(row: SnapshotRow, status: SnapshotResult["status"]): SnapshotResult {
  return {
    challengeDate: row.challenge_date,
    createdAt: row.created_at,
    providerUpdatedAt: row.provider_updated_at,
    coins: row.coins,
    persisted: true,
    status,
  };
}

/**
 * READ-ONLY lookup of the persisted snapshot for a specific UTC day (Phase
 * 11B-P4). Never creates a snapshot and never falls back to CoinGecko or the
 * built-in coins — it returns null if that day was never persisted. Used when
 * finalizing a ranked run whose reservation belongs to a specific date (e.g. a
 * run started just before midnight UTC and finished just after).
 */
export async function getPersistedDailySnapshotForDate(
  challengeDate: string,
): Promise<SnapshotResult | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/daily_market_snapshots` +
        `?challenge_date=eq.${challengeDate}&currency=eq.usd&version=eq.1&limit=1`,
      { headers },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as SnapshotRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rowToResult(rows[0], challengeDate === todayUtc() ? "live" : "stale");
  } catch {
    return null;
  }
}

/**
 * Read today's persisted snapshot, creating it from CoinGecko on first call.
 * Concurrency-safe: INSERT with ignore-duplicates then re-read the winner.
 * Fallback ladder: live unpersisted (Supabase down) → latest persisted row
 * (stale) → built-in local coins (fallback).
 */
export async function getOrCreateDailySnapshot(): Promise<SnapshotResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const date = todayUtc();
  const authHeaders =
    supabaseUrl && serviceKey
      ? {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        }
      : null;
  const table = `${supabaseUrl}/rest/v1/daily_market_snapshots`;

  const readToday = async (): Promise<SnapshotRow | null> => {
    if (!authHeaders) return null;
    try {
      const r = await fetch(
        `${table}?challenge_date=eq.${date}&currency=eq.usd&version=eq.1&limit=1`,
        { headers: authHeaders },
      );
      if (!r.ok) return null;
      const rows = (await r.json()) as SnapshotRow[];
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch {
      return null;
    }
  };

  // 1) Existing snapshot for today → immutable source of truth.
  const existing = await readToday();
  if (existing) return rowToResult(existing, "live");

  // 2) Create it from CoinGecko.
  let coins: MarketCoin[] | null = null;
  try {
    coins = await fetchApprovedMarketCoins();
  } catch (err) {
    console.error("[snapshot]", err instanceof Error ? err.message : "unknown error");
  }

  if (coins) {
    if (authHeaders) {
      try {
        await fetch(`${table}?on_conflict=challenge_date,currency,version`, {
          method: "POST",
          headers: { ...authHeaders, Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({
            challenge_date: date,
            currency: "usd",
            version: 1,
            source: "coingecko",
            coins,
            provider_updated_at: coins[0]?.providerUpdatedAt ?? null,
          }),
        });
      } catch (err) {
        console.error("[snapshot] persist failed:", err instanceof Error ? err.message : "?");
      }
      const winner = await readToday();
      if (winner) return rowToResult(winner, "live");
    }
    // Live data but NOT persisted (Supabase down / migration missing).
    return {
      challengeDate: date,
      createdAt: new Date().toISOString(),
      providerUpdatedAt: coins[0]?.providerUpdatedAt ?? null,
      coins,
      persisted: false,
      status: "fallback",
    };
  }

  // 3) CoinGecko down: latest persisted snapshot as stale fallback.
  if (authHeaders) {
    try {
      const r = await fetch(
        `${table}?currency=eq.usd&version=eq.1&order=challenge_date.desc&limit=1`,
        { headers: authHeaders },
      );
      if (r.ok) {
        const rows = (await r.json()) as SnapshotRow[];
        if (Array.isArray(rows) && rows.length > 0) return rowToResult(rows[0], "stale");
      }
    } catch {
      /* fall through */
    }
  }

  // 4) Built-in fallback (unknown prices, clearly marked).
  return {
    challengeDate: date,
    createdAt: new Date().toISOString(),
    providerUpdatedAt: null,
    coins: FALLBACK_COINS,
    persisted: false,
    status: "fallback",
  };
}
