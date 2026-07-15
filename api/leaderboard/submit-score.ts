import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOrCreateDailySnapshot } from "../_lib/dailySnapshot";
import {
  buildDailyTokenChallenge,
  computeDailyTokenPoints,
  DAILY_TOKEN_COUNT,
  TOKEN_CHALLENGE_VERSION,
  TOKEN_RULES_VERSION,
} from "../_lib/dailyTokenChallenge";

/**
 * Insert a ranked Daily Token Rush score into the Supabase leaderboard (server).
 *
 * Security & integrity:
 *  - uses SUPABASE_SERVICE_ROLE_KEY (server env, bypasses RLS) — never on client
 *  - the challenge_date/challenge_id are computed HERE (server-authoritative), so
 *    a client can't backdate a score to another day
 *  - enforces the 3 ranked attempts / UTC day limit per Pi user, server-side
 *    (the frontend limit is only a UX aid and can be bypassed)
 *  - Token Rush (Phase 11B): the manifest is REBUILT here from the persisted
 *    snapshot and every token field (ids, count, points) is re-derived and
 *    checked — client-sent token data is never trusted. This is a consistency /
 *    plausibility check, not a cryptographic anti-cheat guarantee.
 *
 * Anti-cheat (minimal): reject malformed/Training; flag implausible runs
 * is_valid=false (excluded from boards).
 */

// Plausibility ceilings (Phase 8A balance check).
// A perfect 60s run tops out around ~3,500-3,800 pts: survival 5/s*60=300,
// at most ~97 spawns/run, energies capped at the x3 combo multiplier (~2,700),
// + 500 clean-run bonus. The Magnet only helps COLLECT existing (seeded) energies
// — it never creates them — so it doesn't raise this ceiling. These limits keep
// huge headroom (~10x+) so no legitimate score is ever rejected, while still
// blocking absurd values.
// Token Rush (Phase 11B) adds at most 15*750 = 11,250 fixed token points; even
// combined with a perfect block run the theoretical max stays well under 50,000,
// so maxScore needs no change.
const LIMITS = {
  maxScore: 50000,
  minDuration: 50,
  maxDuration: 70,
  maxEnergy: 1000,
  maxCombo: 1000,
  maxObstacles: 1000,
};
const MAX_RANKED_ATTEMPTS = 3;

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[leaderboard submit] Supabase env not configured");
    return res.status(500).json({ error: "Server is missing Supabase configuration" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  if (body.game_mode !== "daily") {
    return res.status(400).json({ error: "Only daily scores are accepted" });
  }

  const pi_user_uid =
    typeof body.pi_user_uid === "string" ? body.pi_user_uid.trim().slice(0, 128) : "";
  if (!pi_user_uid) {
    return res.status(400).json({ error: "Missing pi_user_uid" });
  }
  const pi_username =
    typeof body.pi_username === "string" ? body.pi_username.trim().slice(0, 50) : "";
  if (!pi_username) {
    return res.status(400).json({ error: "Missing pi_username" });
  }

  const score = body.score;
  const energy_collected = body.energy_collected;
  const max_combo = body.max_combo;
  const obstacles_hit = body.obstacles_hit;
  const duration_seconds = body.duration_seconds;

  if (
    !isInt(score) ||
    !isInt(energy_collected) ||
    !isInt(max_combo) ||
    !isInt(obstacles_hit) ||
    !isInt(duration_seconds)
  ) {
    return res.status(400).json({ error: "Invalid score fields" });
  }
  if (score < 0 || energy_collected < 0 || max_combo < 0 || obstacles_hit < 0) {
    return res.status(400).json({ error: "Negative values not allowed" });
  }

  // Server-authoritative challenge identity (ignore any client-sent values).
  const challenge_date = todayUtc();

  // ---- Daily Token Rush validation (Phase 11B, Bloc 14) ------------------
  // Rebuild the manifest from the PERSISTED snapshot and re-derive every token
  // value. The client's date/id/points/count/order are never trusted.
  if (body.rules_version !== TOKEN_RULES_VERSION) {
    return res.status(400).json({ error: "Unsupported rules_version" });
  }
  if (body.daily_token_challenge_version !== TOKEN_CHALLENGE_VERSION) {
    return res.status(400).json({ error: "Unsupported token challenge version" });
  }
  const token_ids_collected = body.token_ids_collected;
  const token_points = body.token_points;
  const tokens_collected_count = body.tokens_collected_count;
  if (!isStringArray(token_ids_collected)) {
    return res.status(400).json({ error: "Invalid token_ids_collected" });
  }
  if (!isInt(token_points) || token_points < 0 || !isInt(tokens_collected_count)) {
    return res.status(400).json({ error: "Invalid token score fields" });
  }
  // No duplicates allowed.
  if (new Set(token_ids_collected).size !== token_ids_collected.length) {
    return res.status(400).json({ error: "Duplicate token ids" });
  }

  let challenge: ReturnType<typeof buildDailyTokenChallenge>;
  try {
    const snap = await getOrCreateDailySnapshot();
    challenge = buildDailyTokenChallenge(snap);
  } catch (e) {
    console.error("[leaderboard submit] snapshot/manifest error", e);
    return res.status(503).json({ error: "Daily challenge unavailable — score not ranked" });
  }
  // Ranked scores require a live, persisted, today's manifest with all 15 tokens.
  if (!challenge.rankedEligible || challenge.challengeDate !== challenge_date) {
    return res.status(409).json({ error: "Daily challenge not rankable — score not ranked" });
  }

  // Every collected id must belong to today's 15 tokens; re-derive points.
  const pointsById = new Map(
    challenge.tokens.map((t) => [
      t.id,
      computeDailyTokenPoints({
        currentPriceUsd: t.referencePriceUsd,
        marketCapRank: t.marketCapRank,
      }),
    ]),
  );
  let recomputedTokenPoints = 0;
  for (const id of token_ids_collected) {
    const pts = pointsById.get(id);
    if (pts === undefined) {
      return res.status(400).json({ error: "Unknown token id in submission" });
    }
    recomputedTokenPoints += pts;
  }
  if (recomputedTokenPoints !== token_points) {
    return res.status(400).json({ error: "Token points mismatch" });
  }
  if (tokens_collected_count !== token_ids_collected.length) {
    return res.status(400).json({ error: "Token count mismatch" });
  }
  if (token_points > challenge.totalTokenPointsPossible) {
    return res.status(400).json({ error: "Token points exceed maximum" });
  }
  if (score < token_points) {
    return res.status(400).json({ error: "Score is below token points" });
  }

  // Server-authoritative Token Rush challenge id (never trust the client's).
  const challenge_id = challenge.challengeId; // RUSHPI-YYYY-MM-DD-TOKEN-V1

  const is_valid =
    score <= LIMITS.maxScore &&
    duration_seconds >= LIMITS.minDuration &&
    duration_seconds <= LIMITS.maxDuration &&
    energy_collected <= LIMITS.maxEnergy &&
    max_combo <= LIMITS.maxCombo &&
    obstacles_hit <= LIMITS.maxObstacles;

  const authHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  try {
    // Enforce the 3-ranked-attempts/day limit for this user (server side).
    const countUrl =
      `${supabaseUrl}/rest/v1/rushpi_scores` +
      `?select=id&pi_user_uid=eq.${encodeURIComponent(pi_user_uid)}` +
      `&challenge_date=eq.${challenge_date}`;
    const countRes = await fetch(countUrl, { headers: authHeaders });
    if (!countRes.ok) {
      const detail = await countRes.text();
      console.error("[leaderboard submit] count error", countRes.status, detail);
      return res.status(502).json({ error: "Failed to check attempts" });
    }
    const existing = (await countRes.json()) as unknown[];
    const usedToday = Array.isArray(existing) ? existing.length : 0;
    if (usedToday >= MAX_RANKED_ATTEMPTS) {
      return res.status(409).json({ error: "Daily ranked attempt limit reached" });
    }
    const ranked_attempt_number = usedToday + 1;

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/rushpi_scores`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        pi_user_uid,
        pi_username,
        score,
        energy_collected,
        max_combo,
        obstacles_hit,
        duration_seconds,
        game_mode: "daily",
        is_valid,
        challenge_id,
        challenge_date,
        ranked_attempt_number,
        // Token Rush (Phase 11B) — only server-verified values are stored.
        rules_version: TOKEN_RULES_VERSION,
        token_challenge_version: TOKEN_CHALLENGE_VERSION,
        token_points,
        tokens_collected_count,
        token_ids_collected,
      }),
    });

    if (!insertRes.ok) {
      const detail = await insertRes.text();
      console.error("[leaderboard submit] insert error", insertRes.status, detail);
      return res.status(502).json({ error: "Failed to save score" });
    }

    return res.status(200).json({ ok: true, is_valid, ranked_attempt_number });
  } catch (error) {
    console.error("[leaderboard submit] server error", error);
    return res.status(500).json({ error: "Server error saving score" });
  }
}
