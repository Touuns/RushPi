import { useCallback, useEffect, useRef, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import ProfileScreen from "./components/ProfileScreen";
import CampaignScreen from "./components/CampaignScreen";
import DailyPreparationScreen from "./components/DailyPreparationScreen";
import {
  consumeRankedAttempt,
  getCampaignProgress,
  getDailyHistory,
  getLeaderboard,
  getProfile,
  getRankedAttemptsToday,
  getStreakInfo,
  getUnlockedBadgeIds,
  markPiTestPaymentCompleted,
  recordRun,
  resetLocalProgress,
  syncRankedAttemptsFromServer,
  type RankedAttempts,
} from "./utils/storage";
import { CAMPAIGN_LEVELS } from "./game/campaign";
import type { DailyTokenChallenge } from "./market/dailyTokenTypes";
import { authenticatePi, initPi, isPiBrowser, type PiSession } from "./pi/piClient";
import {
  fetchAttemptStatus,
  ServerScoreError,
  submitServerScore,
  type ClaimResult,
} from "./utils/serverLeaderboard";
import { RUN_DURATION_SECONDS } from "./game/gameConfig";
import type {
  BadgeId,
  CampaignProgress,
  DailyHistoryEntry,
  GameResult,
  LeaderboardEntry,
  ProfileStats,
  RunOutcome,
  Screen,
  StreakInfo,
} from "./types";

/** Server-sync state for the just-finished Daily run, shown on the Result screen. */
export type ServerSyncStatus =
  | "idle"
  | "pending"
  | "ok"
  | "local-only"
  | "limit-reached"
  | "auth-required"
  | "failed-retryable"
  | "rejected"
  | "conflict";

/** Map a submission failure to the Result-screen sync status (never regex). */
function mapSubmitError(e: unknown): ServerSyncStatus {
  if (e instanceof ServerScoreError) {
    switch (e.code) {
      case "ATTEMPT_LIMIT":
        return "limit-reached";
      case "PI_AUTH_REQUIRED":
      case "PI_AUTH_INVALID":
      case "PI_AUTH_EXPIRED":
        return "auth-required";
      case "SUBMISSION_CONFLICT":
        return "conflict";
      case "SCORE_REJECTED":
      case "SUBMISSION_EXPIRED":
        return "rejected";
      default:
        // NETWORK_ERROR / SERVER_ERROR / CHALLENGE_UNAVAILABLE / MIGRATION_REQUIRED
        // / PI_AUTH_UNAVAILABLE — transient: the local score is saved, retry later.
        return "failed-retryable";
    }
  }
  return "failed-retryable";
}

/**
 * How the current run counts for ranking — decided at kickoff, never re-evaluated:
 *  - training: never ranked / never sent
 *  - ranked: Daily, Pi-connected, an attempt was available (and consumed)
 *  - local-only: Daily played without a Pi connection
 *  - limit-reached: Daily, connected, but no ranked attempts left today
 */
type RunRankState = "training" | "ranked" | "local-only" | "limit-reached";

/** Snapshot of persisted data the UI reads; refreshed on every navigation. */
interface LocalData {
  profile: ProfileStats;
  leaderboard: LeaderboardEntry[];
  badges: BadgeId[];
  attempts: RankedAttempts;
  streak: StreakInfo;
  history: DailyHistoryEntry[];
  campaign: CampaignProgress;
}

function readLocalData(): LocalData {
  return {
    profile: getProfile(),
    leaderboard: getLeaderboard(),
    badges: getUnlockedBadgeIds(),
    attempts: getRankedAttemptsToday(),
    streak: getStreakInfo(),
    history: getDailyHistory(),
    campaign: getCampaignProgress(),
  };
}

/**
 * Screen state-machine plus Pi/leaderboard wiring. Daily ranking eligibility and
 * the 3-attempts/day limit are decided when a run starts; the server is the real
 * authority on the limit (this only improves the UX).
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameResult["mode"]>("daily");
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [data, setData] = useState<LocalData>(() => readLocalData());

  // Pi integration state (optional; never blocks gameplay).
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  // Phase 11B-P4: keep the whole session (user + access token) in memory. The
  // access token is NEVER persisted; UI components only ever receive the user.
  const [piSession, setPiSession] = useState<PiSession | null>(null);
  const piUser = piSession?.user ?? null;
  const [serverSync, setServerSync] = useState<ServerSyncStatus>("idle");

  // `runKey` forces a fresh GameScreen mount (clean Phaser game) on each run.
  const [runKey, setRunKey] = useState(0);
  const [runRankState, setRunRankState] = useState<RunRankState>("training");
  // Campaign level currently being played (0 outside campaign).
  const [campaignLevelId, setCampaignLevelId] = useState(0);
  // Daily Token Rush (Phase 11B): pending rank while preparing, and the
  // manifest kept for GameScreen + ResultScreen (reused for same-day replays).
  const [pendingDailyRank, setPendingDailyRank] = useState<RunRankState>("local-only");
  const [dailyChallenge, setDailyChallenge] = useState<DailyTokenChallenge | null>(null);
  // Server reservation for the current ranked run (Phase 11B-P4). Threaded into
  // the GameResult so the score can be finalized/retried idempotently.
  const [rankedClaim, setRankedClaim] = useState<{
    submissionId: string;
    attemptNumber: number;
  } | null>(null);

  // Star recap for the just-finished campaign run (shown on the Result screen).
  const [campaignStarInfo, setCampaignStarInfo] = useState({
    earned: 0,
    best: 0,
    isNew: false,
  });

  const refresh = useCallback(() => setData(readLocalData()), []);

  /**
   * Load the SERVER-authoritative attempt counter for a session and mirror it
   * locally (Phase 11B-P4). When connected the server is the source of truth;
   * this fails soft — on any error (migration missing / Pi down / offline) the
   * existing local mirror is kept and the UI stays usable.
   */
  const refreshServerAttempts = useCallback((session: PiSession) => {
    fetchAttemptStatus(session.accessToken)
      .then((st) => {
        syncRankedAttemptsFromServer(st.challengeDate, st.used, st.max);
        setData(readLocalData());
      })
      .catch(() => {
        /* keep the local mirror; never present offline attempts as ranked */
      });
  }, []);

  const applySession = useCallback(
    (session: PiSession) => {
      setPiSession(session);
      refreshServerAttempts(session);
    },
    [refreshServerAttempts],
  );

  // Initialize the Pi SDK on load, and inside Pi Browser auto-connect so the
  // username shows and every Daily run syncs without re-tapping "Connect Pi".
  useEffect(() => {
    const available = isPiBrowser();
    setPiSdkAvailable(available);
    void initPi();
    if (available) {
      authenticatePi()
        .then(applySession)
        .catch(() => {
          /* stay disconnected; manual "Connect Pi" remains available */
        });
    }
  }, [applySession]);

  const connectPi = useCallback(async () => {
    const session = await authenticatePi();
    applySession(session);
  }, [applySession]);

  const onPiPaymentComplete = useCallback(() => {
    markPiTestPaymentCompleted();
    refresh();
  }, [refresh]);

  // Single low-level entry to start a run with an explicit rank state.
  const beginRun = useCallback(
    (nextMode: GameResult["mode"], rankState: RunRankState) => {
      if (rankState === "ranked") consumeRankedAttempt();
      setRunRankState(rankState);
      setMode(nextMode);
      setResult(null);
      setOutcome(null);
      setRunKey((k) => k + 1);
      setScreen("game");
      setData(readLocalData()); // reflect the consumed attempt
    },
    [],
  );

  const playTraining = useCallback(() => beginRun("training", "training"), [beginRun]);
  // Survival is local-only → treated as unranked ("training" rank state): no
  // attempt consumed, never submitted to the server.
  const playSurvival = useCallback(() => beginRun("survival", "training"), [beginRun]);
  // Daily runs go through the preparation screen (Phase 11B): the ranked
  // attempt is only consumed once the challenge + logos are actually ready.
  const goDailyPrep = useCallback((rank: RunRankState) => {
    setPendingDailyRank(rank);
    setScreen("daily-prep");
  }, []);

  const playRankedDaily = useCallback(() => goDailyPrep("ranked"), [goDailyPrep]);
  const playDailyLocalOnly = useCallback(() => goDailyPrep("local-only"), [goDailyPrep]);
  const playDailyUnranked = useCallback(() => goDailyPrep("limit-reached"), [goDailyPrep]);

  /**
   * Connect Pi (from the modal) then start a RANKED Daily preparation. The
   * local mirror may be stale right after connecting (P4.1) — claim-attempt is
   * the final authority: if the server says ATTEMPT_LIMIT, the preparation
   * screen shows the real limit and offers "Play locally".
   */
  const connectAndPlayDaily = useCallback(async () => {
    const session = await authenticatePi();
    applySession(session);
    goDailyPrep("ranked");
  }, [goDailyPrep, applySession]);

  /**
   * Auto-decide a Daily run (used by Result "Play Again" and the Leaderboard).
   * Connected → ranked preparation; the server-side claim is the authority on
   * the 3/day limit (the local mirror only drives display), P4.1.
   */
  const startDailyAuto = useCallback(() => {
    goDailyPrep(piUser ? "ranked" : "local-only");
  }, [goDailyPrep, piUser]);

  /**
   * Preparation finished. For a ranked run the attempt was ALREADY reserved on
   * the server (claim) before we got here — we only mirror its authoritative
   * counter, never double-consume. A missing/invalid claim downgrades to local.
   */
  const startPreparedDaily = useCallback(
    (
      challenge: DailyTokenChallenge | null,
      requestedRank: RunRankState,
      claim: ClaimResult | null = null,
    ) => {
      let rank = requestedRank;
      if (rank === "ranked" && (!piUser || !challenge?.rankedEligible || !claim)) {
        rank = "local-only";
      }
      if (rank === "ranked" && claim) {
        // Server already reserved the attempt: mirror its counter + keep the
        // reservation so the score can be finalized/retried idempotently.
        syncRankedAttemptsFromServer(claim.challengeDate, claim.used);
        setRankedClaim({
          submissionId: claim.submissionId,
          attemptNumber: claim.attemptNumber ?? 0,
        });
      } else {
        setRankedClaim(null);
      }
      setDailyChallenge(challenge);
      setRunRankState(rank);
      setMode("daily");
      setResult(null);
      setOutcome(null);
      setRunKey((k) => k + 1);
      setScreen("game");
      setData(readLocalData());
    },
    [piUser],
  );

  /** Start a Campaign level (local-only, unranked). */
  const startCampaignLevel = useCallback(
    (levelId: number) => {
      setCampaignLevelId(levelId);
      beginRun("campaign", "training");
    },
    [beginRun],
  );

  const goCampaign = useCallback(() => {
    refresh();
    setScreen("campaign");
  }, [refresh]);

  const playAgain = useCallback(() => {
    if (mode === "training") playTraining();
    else if (mode === "survival") playSurvival();
    else if (mode === "campaign") startCampaignLevel(campaignLevelId);
    else startDailyAuto();
  }, [mode, playTraining, playSurvival, startCampaignLevel, campaignLevelId, startDailyAuto]);

  // Guards against concurrent/double submissions (e.g. rapid Retry-sync clicks),
  // independent of React render timing. The server is also idempotent per
  // submissionId, so this is a UX belt-and-braces, not the only safeguard.
  const syncInFlightRef = useRef(false);

  /**
   * Submit (or re-submit) a ranked Daily run. Idempotent: the same reservation
   * id + same run facts never create a second score or consume another attempt.
   */
  const submitRankedRun = useCallback((run: GameResult, token: string) => {
    if (syncInFlightRef.current) return; // ignore a second click while in flight
    syncInFlightRef.current = true;
    setServerSync("pending");
    submitServerScore(token, {
      submission_id: run.dailySubmissionId,
      score: run.score,
      energy_collected: run.energiesCollected,
      max_combo: run.maxCombo,
      obstacles_hit: run.obstaclesHit,
      duration_seconds: RUN_DURATION_SECONDS,
      rules_version: 2,
      daily_token_challenge_version: 1,
      token_ids_collected: run.dailyTokenIdsCollected,
      token_points: run.dailyTokenPoints,
      tokens_collected_count: run.dailyTokenIdsCollected.length,
    })
      .then((out) => setServerSync(out.ranked ? "ok" : "rejected"))
      .catch((e: unknown) => setServerSync(mapSubmitError(e)))
      .finally(() => {
        syncInFlightRef.current = false;
      });
  }, []);

  const handleGameOver = useCallback(
    (r: GameResult) => {
      // Read the previous best stars BEFORE recording, to flag "new stars earned".
      if (r.mode === "campaign") {
        const prevStars =
          getCampaignProgress().starsByLevel[String(r.campaignLevelId)] ?? 0;
        setCampaignStarInfo({
          earned: r.campaignStars,
          best: Math.max(prevStars, r.campaignStars),
          isNew: r.campaignStars > prevStars,
        });
      }
      // Attach the ranked reservation to Daily results (neutral otherwise). The
      // local score is always saved first, before any network call.
      const enriched: GameResult =
        r.mode === "daily"
          ? {
              ...r,
              dailySubmissionId: rankedClaim?.submissionId ?? "",
              serverRankedAttemptNumber: rankedClaim?.attemptNumber ?? 0,
            }
          : r;
      const o = recordRun(enriched);
      setResult(enriched);
      setOutcome(o);
      refresh();
      setScreen("result");

      // Server sync only for ranked Daily runs. Never for training / local-only /
      // limit-reached, and never retroactively.
      if (enriched.mode !== "daily" || runRankState === "training") {
        setServerSync("idle");
      } else if (runRankState === "limit-reached") {
        setServerSync("limit-reached");
      } else if (runRankState !== "ranked" || !piSession || !enriched.dailySubmissionId) {
        setServerSync("local-only");
      } else {
        submitRankedRun(enriched, piSession.accessToken);
      }
    },
    [refresh, piSession, runRankState, rankedClaim, submitRankedRun],
  );

  /**
   * Retry a failed ranked sync (Phase 11B-P4): reuses the exact same GameResult
   * (same submissionId + facts) so the server dedupes it — no new reservation,
   * no extra attempt, no duplicate score. The local score is already saved.
   */
  const retrySync = useCallback(() => {
    if (!result || result.mode !== "daily" || !result.dailySubmissionId || !piSession) return;
    submitRankedRun(result, piSession.accessToken);
  }, [result, piSession, submitRankedRun]);

  const goHome = useCallback(() => {
    refresh();
    setScreen("home");
  }, [refresh]);

  const goLeaderboard = useCallback(() => {
    refresh();
    setScreen("leaderboard");
  }, [refresh]);

  const goProfile = useCallback(() => {
    refresh();
    setScreen("profile");
  }, [refresh]);

  const handleReset = useCallback(() => {
    resetLocalProgress();
    refresh();
    setScreen("home");
  }, [refresh]);

  return (
    <div className="app-frame">
      {/* Phase 12A-1: decorative production Home background. It lives in the
          NON-scrolling frame (a sibling behind the scrolling .home content), so
          it stays fixed during Home scroll, never intercepts input, and only
          exists on the Home screen. The .app-frame gradients remain behind it as
          the fallback (before decode / if WebP is unavailable). */}
      {screen === "home" && (
        <div className="home-bg" aria-hidden="true">
          <img
            className="home-bg__img"
            src="/assets/rushpi/production/backgrounds/home-background-production-414w.webp"
            srcSet={
              "/assets/rushpi/production/backgrounds/home-background-production-414w.webp 414w, " +
              "/assets/rushpi/production/backgrounds/home-background-production-828w.webp 828w"
            }
            sizes="(max-width: 480px) 100vw, 480px"
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            fetchPriority="high"
            loading="eager"
            onError={(e) => {
              // If the WebP can't load (unsupported/blocked/missing), hide the
              // <img> so only the .app-frame gradient fallback shows — no broken
              // image icon, no white flash.
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
      {screen === "home" && (
        <HomeScreen
          profile={data.profile}
          badgeCount={data.badges.length}
          attemptsLeft={data.attempts.left}
          maxAttempts={data.attempts.max}
          streak={data.streak}
          piSdkAvailable={piSdkAvailable}
          piUser={piUser}
          onPlayTraining={playTraining}
          onPlaySurvival={playSurvival}
          onPlayRankedDaily={playRankedDaily}
          onPlayDailyLocalOnly={playDailyLocalOnly}
          onPlayDailyUnranked={playDailyUnranked}
          onConnectAndPlayDaily={connectAndPlayDaily}
          onConnectPi={connectPi}
          onPiPaymentComplete={onPiPaymentComplete}
          onLeaderboard={goLeaderboard}
          onProfile={goProfile}
          onCampaign={goCampaign}
        />
      )}

      {screen === "campaign" && (
        <CampaignScreen
          progress={data.campaign}
          onSelectLevel={startCampaignLevel}
          onHome={goHome}
        />
      )}

      {screen === "daily-prep" && (
        <DailyPreparationScreen
          ranked={pendingDailyRank === "ranked"}
          accessToken={piSession?.accessToken ?? null}
          cachedChallenge={dailyChallenge}
          onReady={(c, claim) => startPreparedDaily(c, pendingDailyRank, claim)}
          onPlayLocally={(c) => startPreparedDaily(c, "local-only")}
          onReconnect={connectPi}
          onCancel={goHome}
        />
      )}

      {screen === "game" && (
        <GameScreen
          key={runKey}
          mode={mode}
          campaignLevelId={campaignLevelId}
          dailyChallenge={mode === "daily" ? dailyChallenge : null}
          onGameOver={handleGameOver}
          onQuit={mode === "campaign" ? goCampaign : goHome}
        />
      )}

      {screen === "result" && result && outcome && (
        <ResultScreen
          result={result}
          outcome={outcome}
          bestScore={
            result.mode === "daily"
              ? data.profile.bestDailyTokenRushScore
              : data.profile.bestDailyScore
          }
          dailyChallenge={result.mode === "daily" ? dailyChallenge : null}
          bestSurvivalScore={data.profile.bestSurvivalScore}
          bestSurvivalStageName={data.profile.bestSurvivalStageName}
          campaignLevelBest={data.campaign.bestScoreByLevel[String(result.campaignLevelId)] ?? 0}
          campaignStarsEarned={campaignStarInfo.earned}
          campaignStarsBest={campaignStarInfo.best}
          campaignStarsNew={campaignStarInfo.isNew}
          serverSync={serverSync}
          onRetrySync={retrySync}
          streak={data.streak}
          onPlayAgain={playAgain}
          onHome={goHome}
          onLeaderboard={goLeaderboard}
          onRetry={() => startCampaignLevel(result.campaignLevelId)}
          onBackToCampaign={goCampaign}
          onNextLevel={
            result.mode === "campaign" &&
            result.campaignSuccess &&
            result.campaignLevelId < CAMPAIGN_LEVELS.length &&
            result.campaignLevelId + 1 <= data.campaign.unlockedLevel
              ? () => startCampaignLevel(result.campaignLevelId + 1)
              : undefined
          }
        />
      )}

      {screen === "leaderboard" && (
        <LeaderboardScreen
          entries={data.leaderboard}
          piConnected={piUser !== null}
          onHome={goHome}
          onPlayAgain={startDailyAuto}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          profile={data.profile}
          unlockedBadgeIds={data.badges}
          streak={data.streak}
          history={data.history}
          campaign={data.campaign}
          onHome={goHome}
          onReset={handleReset}
          piSdkAvailable={piSdkAvailable}
          piUser={piUser}
          onPiPaymentComplete={onPiPaymentComplete}
        />
      )}
    </div>
  );
}
