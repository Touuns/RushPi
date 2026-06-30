import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Insert a ranked Daily Run score into the Supabase leaderboard (server-side).
 *
 * Security & integrity:
 *  - uses SUPABASE_SERVICE_ROLE_KEY (server env, bypasses RLS) — never on client
 *  - the challenge_date/challenge_id are computed HERE (server-authoritative), so
 *    a client can't backdate a score to another day
 *  - enforces the 3 ranked attempts / UTC day limit per Pi user, server-side
 *    (the frontend limit is only a UX aid and can be bypassed)
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

  const is_valid =
    score <= LIMITS.maxScore &&
    duration_seconds >= LIMITS.minDuration &&
    duration_seconds <= LIMITS.maxDuration &&
    energy_collected <= LIMITS.maxEnergy &&
    max_combo <= LIMITS.maxCombo &&
    obstacles_hit <= LIMITS.maxObstacles;

  // Server-authoritative challenge identity (ignore any client-sent values).
  const challenge_date = todayUtc();
  const challenge_id = `RUSHPI-${challenge_date}`;

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
