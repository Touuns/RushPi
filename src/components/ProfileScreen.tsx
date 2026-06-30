import type { BadgeId, DailyHistoryEntry, ProfileStats, StreakInfo } from "../types";
import type { PiUser } from "../pi/piClient";
import { ALL_BADGES } from "../utils/badges";
import { getStreakTitle, levelProgress } from "../utils/storage";
import PiPanel from "./PiPanel";

interface ProfileScreenProps {
  profile: ProfileStats;
  unlockedBadgeIds: BadgeId[];
  streak: StreakInfo;
  history: DailyHistoryEntry[];
  onHome: () => void;
  onReset: () => void;
  // Pi integration (optional; game stays playable without it).
  piSdkAvailable: boolean;
  piUser: PiUser | null;
  onConnectPi: () => Promise<void>;
  onPiPaymentComplete: () => void;
}

/** Short label like "Jun 30" from a YYYY-MM-DD string. */
function historyLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Full local profile: identity, level/XP, cumulative stats and the badge grid
 * (locked + unlocked). Includes a discreet, confirmed "Reset local data" action.
 */
export default function ProfileScreen({
  profile,
  unlockedBadgeIds,
  streak,
  history,
  onHome,
  onReset,
  piSdkAvailable,
  piUser,
  onConnectPi,
  onPiPaymentComplete,
}: ProfileScreenProps) {
  const { ratio, intoLevel, perLevel } = levelProgress(profile.totalXp);
  const owned = new Set(unlockedBadgeIds);
  const displayName = piUser?.username ?? "Pioneer";
  const title = getStreakTitle(profile.bestStreak);

  const handleReset = () => {
    if (
      window.confirm(
        "Reset all local data? This erases your best score, leaderboard, XP, level and badges.",
      )
    ) {
      onReset();
    }
  };

  return (
    <div className="screen profile">
      <h2 className="profile__title">Profile</h2>

      <div className="profile__header">
        <div className="profile__avatar" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="profile__id">
          <span className="profile__name">{displayName}</span>
          <span className="profile__level">Level {profile.level}</span>
          {title && <span className="profile__pi-title">{title}</span>}
        </div>
      </div>

      <div className="xpbar" aria-hidden="true">
        <div className="xpbar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <span className="profile__xp-text">
        {intoLevel}/{perLevel} XP · {profile.totalXp.toLocaleString()} total
      </span>

      <div className="profile__stats">
        <Stat label="Daily Runs" value={profile.dailyRuns} />
        <Stat label="Training Runs" value={profile.trainingRuns} />
        <Stat label="Best Daily" value={profile.bestDailyScore.toLocaleString()} />
        <Stat label="Total Energy" value={profile.totalEnergies.toLocaleString()} />
        <Stat label="Best Combo" value={`x${profile.bestCombo}`} />
        <Stat label="Obstacles Hit" value={profile.totalObstaclesHit.toLocaleString()} />
        <Stat label="Day Streak" value={`🔥 ${streak.current}`} />
        <Stat label="Best Streak" value={`🔥 ${profile.bestStreak}`} />
        <Stat label="Badges" value={`${owned.size}/${ALL_BADGES.length}`} />
      </div>

      <div className="profile__badges-section">
        <span className="profile__section-title">Badges</span>
        <div className="badges-grid">
          {ALL_BADGES.map((b) => {
            const unlocked = owned.has(b.id);
            return (
              <div
                key={b.id}
                className={`badge-card ${unlocked ? "is-unlocked" : "is-locked"}`}
                title={b.description}
              >
                <span className="badge-card__icon">{unlocked ? b.icon : "🔒"}</span>
                <span className="badge-card__name">{b.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div className="profile__history-section">
          <span className="profile__section-title">Daily Challenge history</span>
          <div className="history-list">
            {history.slice(0, 10).map((h) => (
              <div key={h.date} className="history-row">
                <span className="history-row__date">{historyLabel(h.date)}</span>
                <span className="history-row__score">{h.bestScore.toLocaleString()}</span>
                <span className="history-row__runs">{h.runs} run{h.runs > 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PiPanel
        sdkAvailable={piSdkAvailable}
        piUser={piUser}
        onConnect={onConnectPi}
        onPaymentComplete={onPiPaymentComplete}
        testPaymentDone={profile.piTestPaymentCompleted}
      />

      <div className="profile__actions">
        <button className="btn btn--secondary" type="button" onClick={onHome}>
          Back Home
        </button>
        <button className="reset-link" type="button" onClick={handleReset}>
          Reset local data
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
