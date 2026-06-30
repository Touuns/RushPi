import type { GameMode, ProfileStats } from "../types";
import type { PiUser } from "../pi/piClient";
import { levelProgress } from "../utils/storage";
import PiPanel from "./PiPanel";

interface HomeScreenProps {
  profile: ProfileStats;
  badgeCount: number;
  onPlay: (mode: GameMode) => void;
  onLeaderboard: () => void;
  onProfile: () => void;
  // Pi integration (optional; game stays playable without it).
  piSdkAvailable: boolean;
  piUser: PiUser | null;
  onConnectPi: () => Promise<void>;
  onPiPaymentComplete: () => void;
}

/**
 * Home hub: brand, a tappable profile strip (level / XP / badges / streak), the
 * local best, and the primary actions. Daily and Training share onPlay(mode).
 * Scrollable + top-aligned so the richer Phase 2 content never clips on short screens.
 */
export default function HomeScreen({
  profile,
  badgeCount,
  onPlay,
  onLeaderboard,
  onProfile,
  piSdkAvailable,
  piUser,
  onConnectPi,
  onPiPaymentComplete,
}: HomeScreenProps) {
  const { ratio, intoLevel, perLevel } = levelProgress(profile.totalXp);

  return (
    <div className="screen home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true" />
        <h1 className="home__title">Rush Pi</h1>
        <p className="home__subtitle">Daily Runner Challenge</p>
      </div>

      {/* Profile strip — tap to open the full profile. */}
      <button className="profile-strip" type="button" onClick={onProfile}>
        <div className="profile-strip__top">
          <span className="profile-strip__level">Lv {profile.level}</span>
          <span className="profile-strip__name">{piUser?.username ?? "Pioneer"}</span>
          <span className="profile-strip__badges">🏅 {badgeCount}</span>
        </div>
        <div className="xpbar" aria-hidden="true">
          <div className="xpbar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <div className="profile-strip__meta">
          <span>{intoLevel}/{perLevel} XP</span>
          <span>🔥 {profile.streak} day streak</span>
        </div>
      </button>

      <div className="home__best">
        <span className="home__best-label">Best Score</span>
        <span className="home__best-value">{profile.bestDailyScore.toLocaleString()}</span>
      </div>

      <div className="home__actions">
        <button className="btn btn--primary" type="button" onClick={() => onPlay("daily")}>
          Play Daily Run
        </button>
        <button className="btn btn--secondary" type="button" onClick={() => onPlay("training")}>
          Training Mode
        </button>
        <button className="btn btn--secondary" type="button" onClick={onLeaderboard}>
          Leaderboard
        </button>
      </div>

      {/* Pi access directly on Home (connect + test payment), no scrolling needed. */}
      <PiPanel
        sdkAvailable={piSdkAvailable}
        piUser={piUser}
        onConnect={onConnectPi}
        onPaymentComplete={onPiPaymentComplete}
        testPaymentDone={profile.piTestPaymentCompleted}
      />

      <p className="home__hint">Swipe or use ← → to switch lanes</p>
    </div>
  );
}
