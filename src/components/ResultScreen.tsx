import type { Badge, GameResult, RunOutcome, StreakInfo } from "../types";
import type { ServerSyncStatus } from "../App";
import { getCampaignLevel, CAMPAIGN_LEVELS } from "../game/campaign";
import ScreenBackButton from "./ScreenBackButton";

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

/** "★★☆" for n out of 3. */
function starString(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
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
 * Grouped badge presentation (Phase 10B-P3): unlock CONDITIONS are untouched —
 * this only changes how freshly unlocked badges are displayed. 0 → nothing;
 * 1 → a single compact card; 2+ → count + first badge highlighted, the rest
 * behind a collapsed section.
 */
function BadgeUnlockSummary({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  const [first, ...rest] = badges;

  return (
    <div className="badge-summary">
      <span className="badge-summary__title">
        {badges.length === 1 ? "Badge unlocked" : `${badges.length} badges unlocked`}
      </span>
      <div className="badge-summary__card" title={first.description}>
        <span className="badge-summary__icon">{first.icon}</span>
        <span className="badge-summary__text">
          <span className="badge-summary__name">{first.name}</span>
          <span className="badge-summary__desc">{first.description}</span>
        </span>
      </div>
      {rest.length > 0 && (
        <details className="badge-summary__more">
          <summary>+ {rest.length} other badge{rest.length > 1 ? "s" : ""}</summary>
          <div className="badge-summary__list">
            {rest.map((b) => (
              <div key={b.id} className="badge-chip" title={b.description}>
                <span className="badge-chip__icon">{b.icon}</span>
                <span className="badge-chip__name">{b.name}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Up to three always-visible key stats. */
function KeyStats({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className="result__stats result__stats--key">
      {stats.slice(0, 3).map((s) => (
        <Stat key={s.label} label={s.label} value={s.value} />
      ))}
    </div>
  );
}

/** Secondary stats behind a native collapsed section. */
function ResultDetails({ stats }: { stats: { label: string; value: string | number }[] }) {
  if (stats.length === 0) return null;
  return (
    <details className="result__details">
      <summary>View details</summary>
      <div className="result__stats">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} />
        ))}
      </div>
    </details>
  );
}

/**
 * End-of-run summary (Phase 10B-P3 hierarchy): main outcome → up to 3 key
 * stats → meaningful rewards (stars/badges) → collapsed details → actions.
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

  const scoreHero = (
    <div className="result__score">
      <span className="result__score-label">Score</span>
      <span className="result__score-value">{result.score.toLocaleString()}</span>
      {outcome.isNewBest && <span className="result__badge">New Best!</span>}
      <span className="result__xp">+{outcome.xpGained} XP</span>
      {outcome.leveledUp && (
        <span className="result__levelup">Level up! → Lv {outcome.level}</span>
      )}
    </div>
  );

  const badgesBlock = <BadgeUnlockSummary badges={outcome.unlockedBadges} />;

  // ---- Campaign: Level Complete / Level Failed --------------------------
  if (isCampaign) {
    const level = getCampaignLevel(result.campaignLevelId);
    const success = result.campaignSuccess;
    const isLastLevel = result.campaignLevelId >= CAMPAIGN_LEVELS.length;
    const seasonComplete = success && isLastLevel;
    const runStats = {
      livesRemaining: result.livesRemaining,
      energiesCollected: result.energiesCollected,
      maxCombo: result.maxCombo,
      maxChargeLevel: result.highestChargeLevel,
    };

    return (
      <div className="screen result">
        <ScreenBackButton onBack={onBackToCampaign} label="Back to Campaign" />
        <h2 className="result__title">
          {seasonComplete ? "Season 1 Complete" : success ? "Level Complete" : "Level Failed"}
        </h2>
        <div className="result__training-tag">
          Level {result.campaignLevelId} — {level?.name ?? ""} · local only
        </div>
        {seasonComplete && (
          <p className="result__season">🏆 Chain Journey cleared — well played!</p>
        )}

        {scoreHero}

        {success && (
          <div className="result__stars">
            <span className="result__stars-row">{starString(campaignStarsEarned)}</span>
            <span className="result__stars-best">Best {starString(campaignStarsBest)}</span>
            {campaignStarsNew && <span className="result__badge">New stars earned!</span>}
          </div>
        )}

        {badgesBlock}

        {/* Per-objective breakdown stays visible — it drives replay. */}
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

        <KeyStats
          stats={[
            { label: "Energy Collected", value: result.energiesCollected },
            { label: "Lives Remaining", value: result.livesRemaining },
            { label: "Max Charge", value: `Lv ${result.highestChargeLevel}` },
          ]}
        />

        {!success && (
          <p className="result__streak">Out of lives — you didn't reach the finish.</p>
        )}

        <ResultDetails
          stats={[
            { label: "Best (level)", value: campaignLevelBest.toLocaleString() },
            { label: "Max Combo", value: `x${result.maxCombo}` },
          ]}
        />

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

  const keyStats = isSurvival
    ? [
        { label: "Time Survived", value: formatDuration(result.timeSurvivedSecs) },
        { label: "Zone Reached", value: `${result.stageReached} · ${result.stageName}` },
        { label: "Max Charge", value: `Lv ${result.highestChargeLevel}` },
      ]
    : [
        // Daily texts say "Blocks" since Phase 11B (Chain Blocks); Training keeps
        // its energy orbs and wording.
        {
          label: result.mode === "daily" ? "Blocks Collected" : "Energy Collected",
          value: result.energiesCollected,
        },
        { label: "Max Combo", value: `x${result.maxCombo}` },
        { label: "Obstacles Hit", value: result.obstaclesHit },
      ];

  const detailStats = isSurvival
    ? [
        { label: "Farthest Zone", value: bestSurvivalStageName || "—" },
        { label: "Best Survival", value: bestSurvivalScore.toLocaleString() },
        { label: "Lives Remaining", value: result.livesRemaining },
        { label: "Lives Recovered", value: result.livesRecovered },
        { label: "Max Combo", value: `x${result.maxCombo}` },
      ]
    : [
        { label: "Best Score", value: bestScore.toLocaleString() },
        { label: "End Bonus", value: `+${result.endBonus}` },
      ];

  return (
    <div className="screen result">
      <ScreenBackButton onBack={onHome} label="Back to Home" />
      <h2 className="result__title">{isSurvival ? "Run Ended" : "Run Complete"}</h2>

      {isTraining && (
        <div className="result__training-tag">Training score — not ranked</div>
      )}
      {isSurvival && (
        <div className="result__training-tag">Survival Run · local only</div>
      )}

      {scoreHero}

      {badgesBlock}

      <KeyStats stats={keyStats} />

      {syncMessage && <p className={`result__sync is-${serverSync}`}>{syncMessage}</p>}
      {streakMessage && <p className="result__streak">{streakMessage}</p>}

      <ResultDetails stats={detailStats} />

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
