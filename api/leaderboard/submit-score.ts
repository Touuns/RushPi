import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Insert a Daily Run score into the Supabase leaderboard (server-side only).
 *
 * Security:
 *  - uses SUPABASE_SERVICE_ROLE_KEY (server env, bypasses RLS) — never on client
 *  - the frontend only calls this route; it never touches Supabase directly
 *
 * Anti-cheat (minimal, not perfect): reject malformed/Training submissions; flag
 * implausible-but-well-formed runs with is_valid=false (excluded from boards).
 */

// Plausible bounds for a 60s run. Tune as the game evolves.
const LIMITS = {
  maxScore: 50000,
  minDuration: 50,
  maxDuration: 70,
  maxEnergy: 1000,
  maxCombo: 1000,
  maxObstacles: 1000,
};

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
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

  // Training scores are never accepted server-side.
  if (body.game_mode !== "daily") {
    return res.status(400).json({ error: "Only daily scores are accepted" });
  }

  const pi_username =
    typeof body.pi_username === "string" ? body.pi_username.trim().slice(0, 50) : "";
  if (!pi_username) {
    return res.status(400).json({ error: "Missing pi_username" });
  }
  const pi_user_uid =
    typeof body.pi_user_uid === "string" ? body.pi_user_uid.slice(0, 128) : null;

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

  // Well-formed but implausible -> stored as is_valid=false (excluded from boards).
  const is_valid =
    score <= LIMITS.maxScore &&
    duration_seconds >= LIMITS.minDuration &&
    duration_seconds <= LIMITS.maxDuration &&
    energy_collected <= LIMITS.maxEnergy &&
    max_combo <= LIMITS.maxCombo &&
    obstacles_hit <= LIMITS.maxObstacles;

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rushpi_scores`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
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
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("[leaderboard submit] Supabase error", r.status, detail);
      return res.status(502).json({ error: "Failed to save score" });
    }

    return res.status(200).json({ ok: true, is_valid });
  } catch (error) {
    console.error("[leaderboard submit] server error", error);
    return res.status(500).json({ error: "Server error saving score" });
  }
}
