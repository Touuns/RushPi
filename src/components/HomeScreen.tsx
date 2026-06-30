import { useState } from "react";
import type { GameMode, ProfileStats } from "../types";
import type { PiUser } from "../pi/piClient";
import { levelProgress } from "../utils/storage";
import PiPanel from "./PiPanel";

interface HomeScreenProps {
  profile: ProfileStats;
  badgeCount: number;
  onPlay: (mode: GameMode) => void;
  /** Connect Pi then start a ranked Daily run (from the connect modal). */
  onConnectAndPlayDaily: () => Promise<void>;
  /** Start a Daily run that will NOT be ranked (from the connect modal). */
  onPlayDailyLocal: () => void;
  onLeaderboard: () => void;
  onProfile: () => void;
  // Pi integration (optional; game stays playable without it).
  piSdkAvailable: boolean;
  piUser: PiUser | null;
  onConnectPi: () => Promise<void>;
  onPiPaymentComplete: () => void;
}

/**
 * Home hub. Daily Run is "ranked" only when connected with Pi BEFORE playing, so
 * if the user isn't connected we surface a clear choice (connect / play local /
 * cancel) instead of silently producing an unranked score. Training is unaffected.
 */
export default function HomeScreen({
  profile,
  badgeCount,
  onPlay,
  onConnectAndPlayDaily,
  onPlayDailyLocal,
  onLeaderboard,
  onProfile,
  piSdkAvailable,
  piUser,
  onConnectPi,
  onPiPaymentComplete,
}: HomeScreenProps) {
  const { ratio, intoLevel, perLevel } = levelProgress(profile.totalXp);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleDailyClick = () => {
    if (piUser) {
      onPlay("daily"); // connected → ranked run starts directly
    } else {
      setConnectError(null);
      setShowConnectModal(true);
    }
  };

  const handleModalConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnectAndPlayDaily(); // navigates to the game on success
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect to Pi.");
      setConnecting(false);
    }
  };

  const closeModal = () => {
    setShowConnectModal(false);
    setConnecting(false);
    setConnectError(null);
  };

  return (
    <div className="screen home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true" />
        <h1 className="home__title">Rush Pi</h1>
        <p className="home__subtitle">Daily Runner Challenge</p>
      </div>

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
        <button className="btn btn--primary" type="button" onClick={handleDailyClick}>
          Play Daily Run
        </button>
        {/* Ranked-status hint right under the Daily button. */}
        <p className={`rank-hint ${piUser ? "is-ranked" : ""}`}>
          {piUser
            ? `Connected as @${piUser.username} — scores will be ranked`
            : "Connect Pi before playing to rank your score"}
        </p>

        <button className="btn btn--secondary" type="button" onClick={() => onPlay("training")}>
          Training Mode
        </button>
        <button className="btn btn--secondary" type="button" onClick={onLeaderboard}>
          Leaderboard
        </button>
      </div>

      <PiPanel
        sdkAvailable={piSdkAvailable}
        piUser={piUser}
        onConnect={onConnectPi}
        onPaymentComplete={onPiPaymentComplete}
        testPaymentDone={profile.piTestPaymentCompleted}
      />

      <p className="home__hint">Swipe or use ← → to switch lanes</p>

      {showConnectModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Connect to Pi to rank your score</h2>
            <p className="modal__text">
              Daily Run scores can only be submitted to the server leaderboard when
              you are connected with Pi before playing. You can still play locally,
              but this score will not be ranked.
            </p>
            {connectError && <p className="modal__error">{connectError}</p>}
            <div className="modal__actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={handleModalConnect}
                disabled={connecting}
              >
                {connecting ? "Connecting…" : "Connect Pi"}
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={onPlayDailyLocal}
                disabled={connecting}
              >
                Play locally
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={closeModal}
                disabled={connecting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
