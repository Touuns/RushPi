import type { MarketCoin } from "./marketTypes";
import { MARKET_DATA_ATTRIBUTION } from "./marketTypes";
import { TOKEN_CATALOG, type TokenCategory } from "./tokenCatalog";
import type { SnapshotResult } from "./dailySnapshot";
import { todayUtc } from "./dailySnapshot";

/**
 * Daily Token Rush manifest (Phase 11B). Built SERVER-SIDE from the persisted
 * UTC snapshot: 15 unique tokens (BTC+ETH guaranteed), deterministic selection,
 * spawn schedule, lanes and normalized points. The same helper is the single
 * source of truth for /api/market/daily-challenge AND submit-score validation —
 * the client can never choose tokens, dates or points.
 */

export const DAILY_TOKEN_COUNT = 15;
export const TOKEN_RULES_VERSION = 2;
export const TOKEN_CHALLENGE_VERSION = 1;

const GUARANTEED_IDS = ["bitcoin", "ethereum"];
const CATEGORY_CAPS: Partial<Record<TokenCategory, number>> = {
  stablecoin: 2,
  meme: 2,
  privacy: 1,
};

// Spawn window and spacing (ms).
const FIRST_SPAWN_MS = 4000;
const LAST_SPAWN_MS = 54000;
const MIN_GAP_MS = 2200;

export interface DailyTokenSpec {
  order: number;
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  referencePriceUsd: number;
  marketCapRank: number | null;
  points: number;
  spawnTimeMs: number;
  lane: number;
}

export interface DailyTokenChallenge {
  challengeDate: string;
  challengeId: string;
  rulesVersion: 2;
  tokenChallengeVersion: 1;
  snapshotCreatedAt: string;
  providerUpdatedAt: string | null;
  status: "live" | "stale" | "fallback";
  rankedEligible: boolean;
  tokens: DailyTokenSpec[];
  totalTokenPointsPossible: number;
  attribution: string;
}

/** Deterministic PRNG (mulberry32 over a string hash) — NO Math.random here. */
function createSeededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normalized token points — the ONE shared formula (Bloc 3):
 *   pricePart = min(360, round(80 * log10(1 + price)))
 *   rankPart  = rank valid ? max(40, 260 - (rank - 1) * 4) : 40
 *   points    = clamp(150 + pricePart + rankPart, 200, 750)
 * Snapshot prices only; integer result; never combo-multiplied.
 */
export function computeDailyTokenPoints(coin: {
  currentPriceUsd: number;
  marketCapRank: number | null;
}): number {
  const price = Number.isFinite(coin.currentPriceUsd) && coin.currentPriceUsd >= 0
    ? coin.currentPriceUsd
    : 0;
  const pricePart = Math.min(360, Math.round(80 * Math.log10(1 + price)));
  const rank = coin.marketCapRank;
  const rankPart =
    typeof rank === "number" && Number.isFinite(rank) && rank >= 1
      ? Math.max(40, 260 - (rank - 1) * 4)
      : 40;
  const raw = 150 + pricePart + rankPart;
  return Math.max(200, Math.min(750, Math.round(raw)));
}

/** Fisher–Yates with the provided rng (deterministic for a given seed). */
function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isUsableCoin(c: MarketCoin | undefined): c is MarketCoin {
  return (
    !!c &&
    typeof c.id === "string" &&
    c.id.length > 0 &&
    Number.isFinite(c.currentPriceUsd) &&
    c.currentPriceUsd >= 0 &&
    typeof c.imageUrl === "string" &&
    c.imageUrl.startsWith("https://")
  );
}

/**
 * Deterministic 15-token selection (Bloc 2): BTC+ETH guaranteed, candidates
 * sorted by ID before the seeded shuffle (stable whatever CoinGecko's order),
 * category caps (≤2 stablecoins, ≤2 memes, ≤1 privacy), no duplicates ever.
 */
function selectTokens(coins: MarketCoin[], rng: () => number): MarketCoin[] {
  const byId = new Map(coins.map((c) => [c.id, c]));
  const catalogById = new Map(TOKEN_CATALOG.map((t) => [t.id, t]));

  const selected: MarketCoin[] = [];
  const counts: Partial<Record<TokenCategory, number>> = {};

  const tryAdd = (coin: MarketCoin | undefined): boolean => {
    if (!isUsableCoin(coin)) return false;
    if (selected.some((s) => s.id === coin.id)) return false;
    const cat = catalogById.get(coin.id)?.category;
    if (cat && CATEGORY_CAPS[cat] !== undefined) {
      const used = counts[cat] ?? 0;
      if (used >= (CATEGORY_CAPS[cat] as number)) return false;
      counts[cat] = used + 1;
    }
    selected.push(coin);
    return true;
  };

  for (const id of GUARANTEED_IDS) tryAdd(byId.get(id));

  const candidates = TOKEN_CATALOG.filter(
    (t) => t.enabledForDaily && !GUARANTEED_IDS.includes(t.id) && isUsableCoin(byId.get(t.id)),
  )
    .map((t) => byId.get(t.id) as MarketCoin)
    .sort((a, b) => (a.id < b.id ? -1 : 1)); // stable pre-shuffle order

  for (const coin of seededShuffle(candidates, rng)) {
    if (selected.length >= DAILY_TOKEN_COUNT) break;
    tryAdd(coin);
  }
  return selected;
}

/** Deterministic spawn times (4s→54s, ≥2.2s gaps) and lanes (≤2 consecutive). */
function scheduleTokens(tokens: MarketCoin[], rng: () => number): DailyTokenSpec[] {
  const n = tokens.length;
  if (n === 0) return [];
  const ordered = seededShuffle(tokens, rng); // spawn order ≠ selection order
  const slot = (LAST_SPAWN_MS - FIRST_SPAWN_MS) / n;
  const jitterRoom = Math.max(0, slot - (MIN_GAP_MS + 200));

  const specs: DailyTokenSpec[] = [];
  let prevLane = -1;
  let prevPrevLane = -1;
  for (let i = 0; i < n; i++) {
    const coin = ordered[i];
    const spawnTimeMs = Math.round(FIRST_SPAWN_MS + slot * i + rng() * jitterRoom);
    let lane = Math.floor(rng() * 3);
    if (lane === prevLane && lane === prevPrevLane) lane = (lane + 1) % 3;
    specs.push({
      order: i + 1,
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      imageUrl: coin.imageUrl,
      referencePriceUsd: coin.currentPriceUsd,
      marketCapRank: coin.marketCapRank,
      points: computeDailyTokenPoints(coin),
      spawnTimeMs,
      lane,
    });
    prevPrevLane = prevLane;
    prevLane = lane;
  }
  return specs;
}

/** Build the full manifest from a snapshot result (single source of truth). */
export function buildDailyTokenChallenge(snap: SnapshotResult): DailyTokenChallenge {
  const rng = createSeededRandom(`${snap.challengeDate}:daily-token-rush:v1`);
  const selected = selectTokens(snap.coins, rng);
  const tokens = scheduleTokens(selected, rng);
  const totalTokenPointsPossible = tokens.reduce((sum, t) => sum + t.points, 0);

  const hasGuaranteed = GUARANTEED_IDS.every((id) => tokens.some((t) => t.id === id));
  const rankedEligible =
    snap.persisted &&
    snap.status === "live" &&
    snap.challengeDate === todayUtc() &&
    tokens.length === DAILY_TOKEN_COUNT &&
    hasGuaranteed;

  return {
    challengeDate: snap.challengeDate,
    challengeId: `RUSHPI-${snap.challengeDate}-TOKEN-V1`,
    rulesVersion: TOKEN_RULES_VERSION,
    tokenChallengeVersion: TOKEN_CHALLENGE_VERSION,
    snapshotCreatedAt: snap.createdAt,
    providerUpdatedAt: snap.providerUpdatedAt,
    status: snap.status,
    rankedEligible,
    tokens,
    totalTokenPointsPossible,
    attribution: MARKET_DATA_ATTRIBUTION,
  };
}
