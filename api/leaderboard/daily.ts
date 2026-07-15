import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Top 50 valid scores of TODAY's Daily Token Rush (challenge_date = current UTC
 * day), so the daily board reflects the shared seeded challenge — not a floating
 * 24h window. Reads via the service role; returns only non-sensitive columns.
 *
 * Phase 11B versioning: filtered to rules_version = 2 AND today's Token Rush
 * challenge_id so v2 (Token Rush) scores are never mixed with legacy v1 rows.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[leaderboard daily] Supabase env not configured");
    return res.status(500).json({ error: "Server is missing Supabase configuration" });
  }

  const challengeDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const challengeId = `RUSHPI-${challengeDate}-TOKEN-V1`;

  const query =
    `${supabaseUrl}/rest/v1/rushpi_scores` +
    `?select=pi_username,score,energy_collected,max_combo,obstacles_hit,created_at,token_points,tokens_collected_count` +
    `&game_mode=eq.daily&is_valid=eq.true` +
    `&rules_version=eq.2` +
    `&challenge_id=eq.${encodeURIComponent(challengeId)}` +
    `&challenge_date=eq.${challengeDate}` +
    `&order=score.desc&limit=50`;

  try {
    const r = await fetch(query, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("[leaderboard daily] Supabase error", r.status, detail);
      return res.status(502).json({ error: "Failed to load leaderboard" });
    }
    const scores = await r.json();
    return res.status(200).json({ ok: true, scores });
  } catch (error) {
    console.error("[leaderboard daily] server error", error);
    return res.status(500).json({ error: "Server error loading leaderboard" });
  }
}
