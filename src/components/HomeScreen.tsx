import { useState } from "react";
import type { ProfileStats, StreakInfo } from "../types";
import type { PiUser } from "../pi/piClient";
import { levelProgress } from "../utils/storage";
import { getDailyChallengeLabel } from "../game/seededRandom";
import PiPanel from "./PiPanel";

function streakMessage(streak: StreakInfo): string {
  if (streak.playedToday) return "🔥 Come back tomorrow to keep your streak!";
  if (streak.atRisk) return `🔥 Play today to keep your ${streak.current}-day streak!`;
  return "Start a daily streak today!";
}

interface HomeScreenProps {
  profile: ProfileStats;
  badgeCount: number;
  attemptsLeft: number;
  maxAttempts: number;
  streak: StreakInfo;
  piSdkAvailable: boolean;
  piUser: PiUser | null;
  onPlayTraining: () => void;
  onPlaySurvival: () => void;
  onPlayRankedDaily: () => void;
  onPlayDailyLocalOnly: () => void;
  onPlayDailyUnranked: () => void;
  onConnectAndPlayDaily: () => Promise<void>;
  onConnectPi: () => Promise<void>;
  onPiPaymentComplete: () => void;
  onLeaderboard: () => void;
  onProfile: () => void;
}

type ModalKind = "none" | "connect" | "no-attempts";

/**
 * Home hub. Daily Run is ranked only when connected AND with attempts left, both
 * decided before playing. Not connected -> connect modal; out of attempts ->
 * no-attempts modal. Training is always free. The server enforces the real limit.
 */
export default function HomeScreen({
  profile,
  badgeCount,
  attemptsLeft,
  maxAttempts,
  streak,
  piSdkAvailable,
  piUser,
  onPlayTraining,
  onPlaySurvival,
  onPlayRankedDaily,
  onPlayDailyLocalOnly,
  onPlayDailyUnranked,
  onConnectAndPlayDaily,
  onConnectPi,
  onPiPaymentComplete,
  onLeaderboard,
  onProfile,
}: HomeScreenProps) {
  const { ratio, intoLevel, perLevel } = levelProgress(profile.totalXp);
  const challengeLabel = getDailyChallengeLabel();

  const [modal, setModal] = useState<ModalKind>("none");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleDailyClick = () => {
    if (!piUser) {
      setConnectError(null);
      setModal("connect");
    } else if (attemptsLeft <= 0) {
      setModal("no-attempts");
    } else {
      onPlayRankedDaily();
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
    setModal("none");
    setConnecting(false);
    setConnectError(null);
  };

  return (
    <div className="screen home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true" />
        <h1 className="home__title">Rush Pi</h1>
        <p className="home__subtitle">Daily Runner Challenge</p>
        <p className="home__challenge">Daily Challenge — {challengeLabel}</p>
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
          <span>🔥 {streak.current} day streak</span>
        </div>
      </button>

      <div className="home__best">
        <span className="home__best-label">Best Score</span>
        <span className="home__best-value">{profile.bestDailyScore.toLocaleString()}</span>
      </div>

      <div className="home__actions">
        <button className="btn btn--primary" type="button" onClick={handleDailyClick}>
          Play Daily Run
          <span className="btn__sub">60s Time Attack</span>
        </button>
        <p className={`rank-hint ${piUser ? "is-ranked" : ""}`}>
          {piUser
            ? `Connected as @${piUser.username} — Ranked attempts left: ${attemptsLeft}/${maxAttempts}`
            : "Connect Pi before playing to rank your score"}
        </p>
        <p className="streak-msg">{streakMessage(streak)}</p>

        <button className="btn btn--secondary" type="button" onClick={onPlaySurvival}>
          Survival Mode
          <span className="btn__sub">3 lives · endless</span>
        </button>
        <button className="btn btn--secondary" type="button" onClick={onPlayTraining}>
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

      {modal === "connect" && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Connect to Pi to rank your score</h2>
            <p className="modal__text">
              Daily Run scores can only be submitted to the server leaderboard when
              you are connected with Pi before playing. You can still play locally,
              but this score will not be ranked.
            </p>
            <p className="modal__note">Ranked Daily Runs are limited to 3 attempts per day.</p>
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
                onClick={onPlayDailyLocalOnly}
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

      {modal === "no-attempts" && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">No ranked attempts left today</h2>
            <p className="modal__text">
              You have used your {maxAttempts} ranked Daily Run attempts for today.
              You can still play Training Mode, or play locally without submitting to
              the server leaderboard.
            </p>
            <div className="modal__actions">
              <button className="btn btn--primary" type="button" onClick={onPlayTraining}>
                Training Mode
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={onPlayDailyUnranked}
              >
                Play locally
              </button>
              <button className="btn btn--ghost" type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
