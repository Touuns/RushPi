import { useEffect, useRef, useState } from "react";
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
import { LANE_CONTROL_INSTRUCTION } from "./modeGuidance";

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
  /**
   * Request a ranked Daily. Phase 13G: Home no longer decides auth vs local or
   * attempt availability — DailyPreparationScreen owns every one of those
   * decisions, so this always hands straight over to it.
   */
  onPlayRankedDaily: () => void;
  onConnectPi: () => Promise<void>;
  onPiPaymentComplete: () => void;
  onLeaderboard: () => void;
  onProfile: () => void;
  onCampaign: () => void;
  /**
   * Phase 13E — one-shot intent raised by the First Result's "Try the Daily
   * Run". Home responds by entering its OWN Daily card handler, so the intro
   * modal and the preparation screen (with its auth / attempt / last-attempt
   * gates) behave exactly as a real tap on the Daily card would. Nothing about ranking,
   * authentication or attempt accounting is decided here or duplicated
   * elsewhere — this only saves the player a redundant second tap.
   */
  autoOpenDaily?: boolean;
  /** Clear the intent so it can never fire twice. */
  onAutoOpenDailyConsumed?: () => void;
  /**
   * Phase 13F — true until the player has COMPLETED their first Daily. Adds the
   * one-time attempt-context notice to the Daily intro modal. Read-only: this
   * never changes which run is ranked or when an attempt is reserved.
   */
  firstDailyPending?: boolean;
}

/**
 * Home hub. Phase 13G: the Daily card only shows its one-time intro (if owed)
 * and then hands over to DailyPreparationScreen, the single authority for
 * Pi connection, attempt availability and the last-attempt confirmation.
 * Home renders no Daily gate modal of its own. Training is always free.
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
  onConnectPi,
  onPiPaymentComplete,
  onLeaderboard,
  onCampaign,
  onProfile,
  autoOpenDaily = false,
  onAutoOpenDailyConsumed,
  firstDailyPending = false,
}: HomeScreenProps) {
  const { ratio } = levelProgress(profile.totalXp);
  const challengeLabel = getDailyChallengeLabel();

  // Mode onboarding: which intro modal is open (auto on first launch, or via "?").
  const [intro, setIntro] = useState<IntroMode | null>(null);

  // Launch actions per mode; the intro modal's "Play" re-enters these.
  const LAUNCH: Record<IntroMode, () => void> = {
    daily: onPlayRankedDaily,
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

  /**
   * Phase 13E — consume the "Try the Daily Run" intent exactly once, by calling
   * the very same handler the Daily card's onClick calls. Held in a ref so the
   * effect below can stay mount-scoped without re-running as Home re-renders.
   */
  const handleModeClickRef = useRef(handleModeClick);
  handleModeClickRef.current = handleModeClick;
  const autoDailyFiredRef = useRef(false);

  useEffect(() => {
    if (!autoOpenDaily || autoDailyFiredRef.current) return;
    autoDailyFiredRef.current = true;
    onAutoOpenDailyConsumed?.();
    handleModeClickRef.current("daily");
  }, [autoOpenDaily, onAutoOpenDailyConsumed]);

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
          {/* Phase 13-R2: active (v3) best only — v2 bests are not comparable. */}
          <span>🏆 {profile.bestDailyRulesV3Score.toLocaleString()}</span>
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
            <span className="mode-info__mark" aria-hidden="true">
              ?
            </span>
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
              <span className="mode-info__mark" aria-hidden="true">
                ?
              </span>
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
              <span className="mode-info__mark" aria-hidden="true">
                ?
              </span>
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

      <p className="home__hint">{LANE_CONTROL_INSTRUCTION}</p>

      {intro && (
        <ModeIntroModal
          mode={intro}
          // Phase 13F — the one-time first-Daily fact the modal cannot state
          // statically. Built from LIVE attempt state rather than a hardcoded
          // "run 1 of 3", which would be a lie for anyone playing locally or
          // returning with attempts already spent. Shown once: it disappears
          // permanently the moment a first Daily is actually completed.
          notice={
            intro === "daily" && firstDailyPending
              ? `${attemptsLeft} of ${maxAttempts} ranked runs left today. A local run costs none.`
              : null
          }
          onPlay={handleIntroPlay}
          onClose={handleIntroClose}
        />
      )}
    </div>
  );
}
