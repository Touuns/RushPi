import type { GameResult, RunOutcome, StreakInfo } from "../types";
import type { ServerSyncStatus } from "../App";
import { getCampaignLevel } from "../game/campaign";

/** "★★☆" for n out of 3. */
function starString(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
}

interface ResultScreenProps {
  result: GameResult;
  outcome: RunOutcome;
  bestScore: number;
  bestSurvivalScore: number;
  bestSurvivalStageName: string;
  campaignLevelBest: number;
  campaignStarsEarned: number;
  campaignStarsBest: number;
  campaignStarsNew: boolean;
  serverSync: ServerSyncStatus;
  streak: StreakInfo;
  onPlayAgain: () => void;
  onHome: () => void;
  onLeaderboard: () => void;
  onRetry: () => void;
  onBackToCampaign: () => void;
  /** Provided only when a next campaign level exists AND is unlocked. */
  onNextLevel?: () => void;
}

/** "1m 23s" / "45s". */
function formatDuration(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const SYNC_MESSAGE: Record<ServerSyncStatus, string | null> = {
  idle: null,
  pending: "Syncing score to the server…",
  ok: "Score synced to today's Daily Challenge leaderboard.",
  failed: "Score saved locally. Server sync failed.",
  "local-only":
    "Score saved locally only. Connect Pi before your next Daily Run to join the leaderboard.",
  "limit-reached": "Daily ranked attempt limit reached. Score saved locally only.",
};

/**
 * End-of-run summary. Branches per mode: Daily/Training/Survival show a score
 * recap; Campaign shows Level Complete / Level Failed with Next / Retry / Back.
 */
export default function ResultScreen({
  result,
  outcome,
  bestScore,
  bestSurvivalScore,
  bestSurvivalStageName,
  campaignLevelBest,
  campaignStarsEarned,
  campaignStarsBest,
  campaignStarsNew,
  serverSync,
  streak,
  onPlayAgain,
  onHome,
  onLeaderboard,
  onRetry,
  onBackToCampaign,
  onNextLevel,
}: ResultScreenProps) {
  const isTraining = result.mode === "training";
  const isSurvival = result.mode === "survival";
  const isCampaign = result.mode === "campaign";

  const badgesBlock = outcome.unlockedBadges.length > 0 && (
    <div className="result__unlocks">
      <span className="result__unlocks-title">Badges unlocked</span>
      <div className="result__unlocks-list">
        {outcome.unlockedBadges.map((b) => (
          <div key={b.id} className="badge-chip" title={b.description}>
            <span className="badge-chip__icon">{b.icon}</span>
            <span className="badge-chip__name">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- Campaign: Level Complete / Level Failed --------------------------
  if (isCampaign) {
    const level = getCampaignLevel(result.campaignLevelId);
    const success = result.campaignSuccess;
    const runStats = {
      livesRemaining: result.livesRemaining,
      energiesCollected: result.energiesCollected,
      maxCombo: result.maxCombo,
      maxChargeLevel: result.highestChargeLevel,
    };

    return (
      <div className="screen result">
        <h2 className="result__title">{success ? "Level Complete" : "Level Failed"}</h2>
        <div className="result__training-tag">
          Level {result.campaignLevelId} — {level?.name ?? ""} · local only
        </div>

        <div className="result__score">
          <span className="result__score-label">Score</span>
          <span className="result__score-value">{result.score.toLocaleString()}</span>
          {outcome.isNewBest && <span className="result__badge">New Best!</span>}
          <span className="result__xp">+{outcome.xpGained} XP</span>
          {outcome.leveledUp && (
            <span className="result__levelup">Level up! → Lv {outcome.level}</span>
          )}
        </div>

        {success && (
          <div className="result__stars">
            <span className="result__stars-row">{starString(campaignStarsEarned)}</span>
            <span className="result__stars-best">Best {starString(campaignStarsBest)}</span>
            {campaignStarsNew && <span className="result__badge">New stars earned!</span>}
          </div>
        )}

        {badgesBlock}

        {/* Per-objective breakdown for replay value. */}
        {level && (
          <div className="result__objectives">
            {level.stars.map((s, i) => {
              const met = result.reachedFinish && s.test(runStats);
              return (
                <div key={i} className={`objective-row ${met ? "is-met" : ""}`}>
                  <span className="objective-row__star">{met ? "★" : "☆"}</span>
                  <span className="objective-row__label">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="result__stats">
          <Stat label="Energy Collected" value={result.energiesCollected} />
          <Stat label="Lives Remaining" value={result.livesRemaining} />
          <Stat label="Max Combo" value={`x${result.maxCombo}`} />
          <Stat label="Best (level)" value={campaignLevelBest.toLocaleString()} />
        </div>

        {!success && (
          <p className="result__streak">Out of lives — you didn't reach the finish.</p>
        )}

        <div className="result__actions">
          {success && onNextLevel && (
            <button className="btn btn--primary" type="button" onClick={onNextLevel}>
              Next Level
            </button>
          )}
          <button
            className={`btn ${success && onNextLevel ? "btn--secondary" : "btn--primary"}`}
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
          <button className="btn btn--secondary" type="button" onClick={onBackToCampaign}>
            Back to Campaign
          </button>
        </div>
      </div>
    );
  }

  // ---- Daily / Training / Survival --------------------------------------
  const syncMessage = SYNC_MESSAGE[serverSync];
  const streakMessage =
    result.mode === "daily" && streak.playedToday && streak.current > 0
      ? `🔥 ${streak.current}-day streak — come back tomorrow to keep it!`
      : null;

  return (
    <div className="screen result">
      <h2 className="result__title">{isSurvival ? "Game Over" : "Run Complete"}</h2>

      {isTraining && (
        <div className="result__training-tag">Training score — not ranked</div>
      )}
      {isSurvival && (
        <div className="result__training-tag">Survival Run · local only</div>
      )}

      <div className="result__score">
        <span className="result__score-label">Score</span>
        <span className="result__score-value">{result.score.toLocaleString()}</span>
        {outcome.isNewBest && <span className="result__badge">New Best!</span>}
        <span className="result__xp">+{outcome.xpGained} XP</span>
        {outcome.leveledUp && (
          <span className="result__levelup">Level up! → Lv {outcome.level}</span>
        )}
      </div>

      {badgesBlock}

      {isSurvival ? (
        <div className="result__stats">
          <Stat label="Zone Reached" value={`${result.stageReached} · ${result.stageName}`} />
          <Stat label="Farthest Zone" value={bestSurvivalStageName || "—"} />
          <Stat label="Best Survival" value={bestSurvivalScore.toLocaleString()} />
          <Stat label="Distance Survived" value={formatDuration(result.timeSurvivedSecs)} />
          <Stat label="Lives Remaining" value={result.livesRemaining} />
          <Stat label="Max Charge" value={`Lv ${result.highestChargeLevel}`} />
          <Stat label="Lives Recovered" value={result.livesRecovered} />
          <Stat label="Max Combo" value={`x${result.maxCombo}`} />
        </div>
      ) : (
        <div className="result__stats">
          <Stat label="Best Score" value={bestScore.toLocaleString()} />
          <Stat label="Energy Collected" value={result.energiesCollected} />
          <Stat label="Max Combo" value={`x${result.maxCombo}`} />
          <Stat label="Obstacles Hit" value={result.obstaclesHit} />
          <Stat label="End Bonus" value={`+${result.endBonus}`} />
        </div>
      )}

      {syncMessage && <p className={`result__sync is-${serverSync}`}>{syncMessage}</p>}
      {streakMessage && <p className="result__streak">{streakMessage}</p>}

      <div className="result__actions">
        <button className="btn btn--primary" type="button" onClick={onPlayAgain}>
          Play Again
        </button>
        {!isSurvival && (
          <button className="btn btn--secondary" type="button" onClick={onLeaderboard}>
            Leaderboard
          </button>
        )}
        <button className="btn btn--secondary" type="button" onClick={onHome}>
          Back Home
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
