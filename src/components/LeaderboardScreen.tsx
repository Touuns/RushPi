import { useState } from "react";
import type { LeaderboardEntry } from "../types";

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  onHome: () => void;
  onPlayAgain: () => void;
}

type Tab = "daily" | "weekly" | "country";

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
 * Local Daily leaderboard (Top 10). Weekly/Country tabs are shown but disabled
 * ("Coming soon") in Phase 2 — only Daily reads from localStorage.
 */
export default function LeaderboardScreen({
  entries,
  onHome,
  onPlayAgain,
}: LeaderboardScreenProps) {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="screen leaderboard">
      <h2 className="leaderboard__title">Leaderboard</h2>

      <div className="tabs" role="tablist">
        <button
          className={`tab ${tab === "daily" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("daily")}
        >
          Daily
        </button>
        <button className="tab is-disabled" type="button" disabled title="Coming soon">
          Weekly
        </button>
        <button className="tab is-disabled" type="button" disabled title="Coming soon">
          Country
        </button>
      </div>

      {tab === "daily" ? (
        <div className="leaderboard__list">
          {entries.length === 0 ? (
            <p className="leaderboard__empty">
              No Daily runs yet. Play a Daily Run to claim the top spot!
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <p className="leaderboard__coming">Coming soon</p>
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
