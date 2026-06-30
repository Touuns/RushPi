import type { BadgeId, ProfileStats } from "../types";
import { ALL_BADGES } from "../utils/badges";
import { levelProgress } from "../utils/storage";

interface ProfileScreenProps {
  profile: ProfileStats;
  unlockedBadgeIds: BadgeId[];
  onHome: () => void;
  onReset: () => void;
}

/**
 * Full local profile: identity, level/XP, cumulative stats and the badge grid
 * (locked + unlocked). Includes a discreet, confirmed "Reset local data" action.
 */
export default function ProfileScreen({
  profile,
  unlockedBadgeIds,
  onHome,
  onReset,
}: ProfileScreenProps) {
  const { ratio, intoLevel, perLevel } = levelProgress(profile.totalXp);
  const owned = new Set(unlockedBadgeIds);

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
        <div className="profile__avatar" aria-hidden="true">P</div>
        <div className="profile__id">
          <span className="profile__name">Pioneer</span>
          <span className="profile__level">Level {profile.level}</span>
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
        <Stat label="Day Streak" value={`🔥 ${profile.streak}`} />
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
