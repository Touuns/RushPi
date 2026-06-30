/**
 * Client for the server leaderboard (Phase 6A).
 *
 * Talks ONLY to our own Vercel API routes (same origin) — never to Supabase
 * directly, so no Supabase key is ever in the frontend. All calls fail soft:
 * callers keep the local leaderboard working if the server is unavailable.
 *
 * Note: in `npm run dev` (Vite only) the /api routes are not served, so these
 * will fail — that's expected; use the deployed site or `vercel dev` to test.
 */

export interface ServerScore {
  pi_username: string | null;
  score: number;
  energy_collected: number;
  max_combo: number;
  obstacles_hit: number;
  created_at: string;
}

export interface SubmitScorePayload {
  pi_user_uid: string;
  pi_username: string;
  score: number;
  energy_collected: number;
  max_combo: number;
  obstacles_hit: number;
  duration_seconds: number;
  game_mode: "daily";
  /** Daily challenge this run belongs to (server is authoritative, but we send). */
  challenge_id: string;
  challenge_date: string;
}

async function getScores(url: string): Promise<ServerScore[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load leaderboard (${res.status})`);
  const data = (await res.json()) as { scores?: ServerScore[] };
  return Array.isArray(data.scores) ? data.scores : [];
}

export function fetchDailyLeaderboard(): Promise<ServerScore[]> {
  return getScores("/api/leaderboard/daily");
}

export function fetchGlobalLeaderboard(): Promise<ServerScore[]> {
  return getScores("/api/leaderboard/global");
}

/** Submit a Daily Run score. Throws on failure (caller keeps the run unblocked). */
export async function submitServerScore(payload: SubmitScorePayload): Promise<void> {
  const res = await fetch("/api/leaderboard/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = `Server sync failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
}
