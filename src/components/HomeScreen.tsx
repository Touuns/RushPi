import { useState } from "react";
import type { ProfileStats, StreakInfo } from "../types";
import type { PiUser } from "../pi/piClient";
import { levelProgress } from "../utils/storage";
import { getDailyChallengeLabel } from "../game/seededRandom";
import PiPanel from "./PiPanel";
import PiConnectChip from "./PiConnectChip";
import ModeIntroModal, {
  hasSeenIntro,
  markIntroSeen,
  type IntroMode,
} from "./ModeIntroModal";

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
  onCampaign: () => void;
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
  onCampaign,
  onProfile,
}: HomeScreenProps) {
  const { ratio } = levelProgress(profile.totalXp);
  const challengeLabel = getDailyChallengeLabel();

  const [modal, setModal] = useState<ModalKind>("none");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Mode onboarding: which intro modal is open (auto on first launch, or via "?").
  const [intro, setIntro] = useState<IntroMode | null>(null);

  const startDaily = () => {
    if (!piUser) {
      setConnectError(null);
      setModal("connect");
    } else if (attemptsLeft <= 0) {
      setModal("no-attempts");
    } else {
      onPlayRankedDaily();
    }
  };

  // Launch actions per mode; the intro modal's "Play" re-enters these.
  const LAUNCH: Record<IntroMode, () => void> = {
    daily: startDaily,
    survival: onPlaySurvival,
    campaign: onCampaign,
  };

  /** First launch of a mode opens its intro; afterwards it launches directly. */
  const handleModeClick = (mode: IntroMode) => {
    if (!hasSeenIntro(mode)) {
      setIntro(mode);
    } else {
      LAUNCH[mode]();
    }
  };

  const handleIntroPlay = () => {
    if (!intro) return;
    markIntroSeen(intro);
    const launch = LAUNCH[intro];
    setIntro(null);
    launch();
  };

  const handleIntroClose = () => {
    if (intro) markIntroSeen(intro);
    setIntro(null);
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
      {/* Header: brand on the left, single Pi connection point on the right. */}
      <div className="home__header">
        <div className="home__brand-row">
          <div className="home__logo home__logo--small" aria-hidden="true" />
          <h1 className="home__title home__title--small">Rush Pi</h1>
        </div>
        <PiConnectChip
          sdkAvailable={piSdkAvailable}
          piUser={piUser}
          onConnect={onConnectPi}
          onProfile={onProfile}
        />
      </div>
      <p className="home__challenge">Daily Challenge — {challengeLabel}</p>

      <button className="profile-strip profile-strip--compact" type="button" onClick={onProfile}>
        <div className="profile-strip__top">
          <span className="profile-strip__level">Lv {profile.level}</span>
          <span className="profile-strip__name">{piUser?.username ?? "Pioneer"}</span>
          <span className="profile-strip__badges">🏅 {badgeCount}</span>
        </div>
        <div className="xpbar" aria-hidden="true">
          <div className="xpbar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <div className="profile-strip__meta">
          <span>🔥 {streak.current}d</span>
          <span>🏆 {profile.bestDailyScore.toLocaleString()}</span>
        </div>
      </button>

      {/* The 3 pillars, prominent and above the fold. */}
      <div className="home__modes">
        <span className="home__section-title">Game Modes</span>

        {/* Each card is a wrapper: main launch button + a SEPARATE "?" info
            button (never nested inside the launch button). */}
        <div className="mode-wrap">
          <button
            className="mode-card mode-card--primary"
            type="button"
            onClick={() => handleModeClick("daily")}
          >
            <div className="mode-card__head">
              <span className="mode-card__name">Daily Run</span>
              <span className="mode-tag mode-tag--ranked">Ranked</span>
            </div>
            <span className="mode-card__sub">60s · ranked daily race</span>
            <span className={`mode-card__hint ${piUser ? "is-ranked" : ""}`}>
              {piUser
                ? `@${piUser.username} — ${attemptsLeft}/${maxAttempts} ranked runs left · ${streakMessage(
                    streak,
                  )}`
                : "Connect Pi before playing to rank your score"}
            </span>
          </button>
          <button
            className="mode-info"
            type="button"
            aria-label="How to play Daily Run"
            onClick={() => setIntro("daily")}
          >
            ?
          </button>
        </div>

        {/* Secondary modes side by side under the ranked mode. */}
        <div className="home__modes-row">
          <div className="mode-wrap">
            <button
              className="mode-card mode-card--half"
              type="button"
              onClick={() => handleModeClick("survival")}
            >
              <span className="mode-card__name">Survival</span>
              <span className="mode-card__sub">3 lives · zones · charge</span>
              <span className="mode-tag">Local</span>
            </button>
            <button
              className="mode-info"
              type="button"
              aria-label="How to play Survival"
              onClick={() => setIntro("survival")}
            >
              ?
            </button>
          </div>

          <div className="mode-wrap">
            <button
              className="mode-card mode-card--half"
              type="button"
              onClick={() => handleModeClick("campaign")}
            >
              <span className="mode-card__name">Campaign</span>
              <span className="mode-card__sub">Levels · stars · progress</span>
              <span className="mode-tag">Local</span>
            </button>
            <button
              className="mode-info"
              type="button"
              aria-label="How to play Campaign"
              onClick={() => setIntro("campaign")}
            >
              ?
            </button>
          </div>
        </div>
      </div>

      <div className="home__more">
        <span className="home__section-title">More</span>
        <div className="home__more-row">
          <button className="btn btn--secondary btn--small" type="button" onClick={onPlayTraining}>
            Training
          </button>
          <button className="btn btn--secondary btn--small" type="button" onClick={onLeaderboard}>
            Leaderboard
          </button>
          <button className="btn btn--secondary btn--small" type="button" onClick={onProfile}>
            Profile
          </button>
        </div>
      </div>

      <PiPanel
        sdkAvailable={piSdkAvailable}
        piUser={piUser}
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

      {intro && (
        <ModeIntroModal mode={intro} onPlay={handleIntroPlay} onClose={handleIntroClose} />
      )}
    </div>
  );
}
