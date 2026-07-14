import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { DailyMarketSnapshot, MarketCoin } from "../_lib/marketTypes";
import { FALLBACK_COINS, fetchApprovedMarketCoins } from "../_lib/coingecko";

/**
 * GET /api/market/daily — the IMMUTABLE market snapshot for the current UTC day
 * (Phase 11A). First call of the day creates it from CoinGecko and persists it
 * in Supabase; every later call (and every concurrent racer) returns the exact
 * persisted row, so all players share identical reference data. Ranked Daily
 * gameplay does NOT consume this yet.
 *
 * Fallback ladder when CoinGecko is down: latest persisted snapshot (stale) →
 * built-in local fallback (clearly marked). Never a partially-invalid JSON.
 */

interface SnapshotRow {
  challenge_date: string;
  currency: string;
  version: number;
  source: string;
  coins: MarketCoin[];
  provider_updated_at: string | null;
  created_at: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowToSnapshot(row: SnapshotRow, status?: DailyMarketSnapshot["status"]): DailyMarketSnapshot {
  return {
    challengeDate: row.challenge_date,
    source: "coingecko",
    currency: "usd",
    createdAt: row.created_at,
    coins: row.coins,
    version: 1,
    ...(status ? { status } : {}),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // The snapshot is immutable for the day; short CDN cache smooths bursts.
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const date = todayUtc();
  const authHeaders = supabaseUrl && serviceKey
    ? {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      }
    : null;

  const table = `${supabaseUrl}/rest/v1/daily_market_snapshots`;
  const selectToday = `${table}?challenge_date=eq.${date}&currency=eq.usd&version=eq.1&limit=1`;

  const readToday = async (): Promise<SnapshotRow | null> => {
    if (!authHeaders) return null;
    try {
      const r = await fetch(selectToday, { headers: authHeaders });
      if (!r.ok) return null;
      const rows = (await r.json()) as SnapshotRow[];
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch {
      return null;
    }
  };

  // 1) Existing snapshot for today → return it, no CoinGecko call.
  const existing = await readToday();
  if (existing) {
    return res.status(200).json(rowToSnapshot(existing));
  }

  // 2) No snapshot yet: fetch live data.
  let coins: MarketCoin[] | null = null;
  try {
    coins = await fetchApprovedMarketCoins();
  } catch (err) {
    console.error("[market daily]", err instanceof Error ? err.message : "unknown error");
  }

  if (coins) {
    // 3) Persist (unique constraint absorbs races), then RE-READ the winner so
    //    every concurrent caller returns the same persisted row.
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
        console.error("[market daily] persist failed:", err instanceof Error ? err.message : "?");
      }
      const winner = await readToday();
      if (winner) return res.status(200).json(rowToSnapshot(winner));
    }
    // Supabase unavailable / migration not applied: serve the data but clearly
    // mark that it is NOT the persisted immutable snapshot.
    const unpersisted: DailyMarketSnapshot = {
      challengeDate: date,
      source: "coingecko",
      currency: "usd",
      createdAt: new Date().toISOString(),
      coins,
      version: 1,
      status: "fallback",
    };
    return res.status(200).json(unpersisted);
  }

  // 4) CoinGecko down: latest persisted snapshot as stale fallback.
  if (authHeaders) {
    try {
      const r = await fetch(
        `${table}?currency=eq.usd&version=eq.1&order=challenge_date.desc&limit=1`,
        { headers: authHeaders },
      );
      if (r.ok) {
        const rows = (await r.json()) as SnapshotRow[];
        if (Array.isArray(rows) && rows.length > 0) {
          return res.status(200).json(rowToSnapshot(rows[0], "stale"));
        }
      }
    } catch {
      /* fall through to local fallback */
    }
  }

  // 5) Last resort: built-in fallback, clearly marked (unknown prices).
  const fallback: DailyMarketSnapshot = {
    challengeDate: date,
    source: "coingecko",
    currency: "usd",
    createdAt: new Date().toISOString(),
    coins: FALLBACK_COINS,
    version: 1,
    status: "fallback",
  };
  return res.status(200).json(fallback);
}
