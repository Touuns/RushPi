import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Top 50 valid Daily Token Rush scores of all time (global board).
 * Reads via the Supabase service role (server-side only). Only non-sensitive
 * columns are selected/returned (no pi_user_uid).
 *
 * Phase 11B: filtered to rules_version = 2 so the new Token Rush mode is never
 * compared to legacy v1 scores. Old rows are kept, just not shown here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[leaderboard global] Supabase env not configured");
    return res.status(500).json({ error: "Server is missing Supabase configuration" });
  }

  const query =
    `${supabaseUrl}/rest/v1/rushpi_scores` +
    `?select=pi_username,score,energy_collected,max_combo,obstacles_hit,created_at,token_points,tokens_collected_count` +
    `&game_mode=eq.daily&is_valid=eq.true` +
    `&rules_version=eq.2` +
    `&order=score.desc&limit=50`;

  try {
    const r = await fetch(query, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("[leaderboard global] Supabase error", r.status, detail);
      return res.status(502).json({ error: "Failed to load leaderboard" });
    }
    const scores = await r.json();
    return res.status(200).json({ ok: true, scores });
  } catch (error) {
    console.error("[leaderboard global] server error", error);
    return res.status(500).json({ error: "Server error loading leaderboard" });
  }
}
