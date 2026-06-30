import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../types";
import {
  fetchDailyLeaderboard,
  fetchGlobalLeaderboard,
  type ServerScore,
} from "../utils/serverLeaderboard";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  piConnected: boolean;
  onHome: () => void;
  onPlayAgain: () => void;
}

type Tab = "local" | "daily" | "global";

/** Short local date/time, e.g. "Jun 30, 14:32". */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Leaderboard with three tabs:
 *  - Local: localStorage (always available, never broken by the server)
 *  - Daily: server top 50 for the current UTC day
 *  - Global: server top 50 of all time
 *
 * Server tabs fetch on demand and degrade gracefully (loading / discreet error).
 * Viewing is open to everyone; only posting a score needs a Pi connection.
 */
export default function LeaderboardScreen({
  entries,
  piConnected,
  onHome,
  onPlayAgain,
}: LeaderboardScreenProps) {
  const [tab, setTab] = useState<Tab>("local");

  // Server tab state (cached per session).
  const [serverScores, setServerScores] = useState<Record<"daily" | "global", ServerScore[] | null>>({
    daily: null,
    global: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (tab === "local") return;
    // Use cache if already loaded.
    if (serverScores[tab]) {
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    const load = tab === "daily" ? fetchDailyLeaderboard : fetchGlobalLeaderboard;
    load()
      .then((scores) => {
        if (cancelled) return;
        setServerScores((prev) => ({ ...prev, [tab]: scores }));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, serverScores]);

  return (
    <div className="screen leaderboard">
      <h2 className="leaderboard__title">Leaderboard</h2>

      <div className="tabs" role="tablist">
        <button
          className={`tab ${tab === "local" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("local")}
        >
          Local
        </button>
        <button
          className={`tab ${tab === "daily" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("daily")}
        >
          Daily
        </button>
        <button
          className={`tab ${tab === "global" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("global")}
        >
          Global
        </button>
      </div>

      {tab === "daily" && <p className="leaderboard__subhead">Daily Challenge — Today</p>}

      {tab === "local" ? (
        <LocalList entries={entries} />
      ) : (
        <ServerList
          loading={loading}
          error={error}
          scores={serverScores[tab]}
          piConnected={piConnected}
          emptyText={
            tab === "daily" ? "No ranked scores yet today." : "No scores yet. Be the first!"
          }
        />
      )}

      <div className="leaderboard__actions">
        <button className="btn btn--primary" type="button" onClick={onPlayAgain}>
          Play Daily Run
        </button>
        <button className="btn btn--secondary" type="button" onClick={onHome}>
          Back Home
        </button>
      </div>
    </div>
  );
}

function LocalList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="leaderboard__empty">
        No Daily runs yet. Play a Daily Run to claim the top spot!
      </p>
    );
  }
  return (
    <div className="leaderboard__list">
      {entries.map((e, i) => (
        <div key={`${e.dateISO}-${i}`} className={`lb-row rank-${i + 1}`}>
          <span className="lb-row__rank">{i + 1}</span>
          <div className="lb-row__main">
            <span className="lb-row__score">{e.score.toLocaleString()}</span>
            <span className="lb-row__meta">
              💠 {e.energiesCollected} · x{e.maxCombo} · ✕{e.obstaclesHit}
            </span>
          </div>
          <span className="lb-row__date">{shortDate(e.dateISO)}</span>
        </div>
      ))}
      {entries.length < 10 && (
        <p className="leaderboard__motivate">You are close to the Top 10.</p>
      )}
    </div>
  );
}

function ServerList({
  loading,
  error,
  scores,
  piConnected,
  emptyText,
}: {
  loading: boolean;
  error: boolean;
  scores: ServerScore[] | null;
  piConnected: boolean;
  emptyText: string;
}) {
  if (loading) return <p className="leaderboard__empty">Loading…</p>;
  if (error) {
    return (
      <p className="leaderboard__empty">
        Server leaderboard unavailable. Showing nothing for now — your local scores
        are safe under the Local tab.
      </p>
    );
  }
  return (
    <div className="leaderboard__list">
      {!piConnected && (
        <p className="leaderboard__note">Connect Pi to post your score here.</p>
      )}
      {scores && scores.length > 0 ? (
        scores.map((e, i) => (
          <div key={`${e.created_at}-${i}`} className={`lb-row rank-${i + 1}`}>
            <span className="lb-row__rank">{i + 1}</span>
            <div className="lb-row__main">
              <span className="lb-row__score">{e.score.toLocaleString()}</span>
              <span className="lb-row__meta">
                @{e.pi_username ?? "pioneer"} · 💠 {e.energy_collected} · x{e.max_combo}
              </span>
            </div>
            <span className="lb-row__date">{shortDate(e.created_at)}</span>
          </div>
        ))
      ) : (
        <p className="leaderboard__empty">{emptyText}</p>
      )}
    </div>
  );
}
