import { useCallback, useEffect, useState } from "react";
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
  type RankedAttempts,
} from "./utils/storage";
import { CAMPAIGN_LEVELS } from "./game/campaign";
import type { DailyTokenChallenge } from "./market/dailyTokenTypes";
import { authenticatePi, initPi, isPiBrowser, type PiUser } from "./pi/piClient";
import { submitServerScore } from "./utils/serverLeaderboard";
import { getDailyChallengeId, getDailyDate } from "./game/seededRandom";
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
  | "failed"
  | "local-only"
  | "limit-reached";

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
  const [piUser, setPiUser] = useState<PiUser | null>(null);
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

  // Star recap for the just-finished campaign run (shown on the Result screen).
  const [campaignStarInfo, setCampaignStarInfo] = useState({
    earned: 0,
    best: 0,
    isNew: false,
  });

  const refresh = useCallback(() => setData(readLocalData()), []);

  // Initialize the Pi SDK on load, and inside Pi Browser auto-connect so the
  // username shows and every Daily run syncs without re-tapping "Connect Pi".
  useEffect(() => {
    const available = isPiBrowser();
    setPiSdkAvailable(available);
    void initPi();
    if (available) {
      authenticatePi()
        .then(setPiUser)
        .catch(() => {
          /* stay disconnected; manual "Connect Pi" remains available */
        });
    }
  }, []);

  const connectPi = useCallback(async () => {
    const user = await authenticatePi();
    setPiUser(user);
  }, []);

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

  /** Connect Pi (from the modal) then start a Daily run respecting the limit. */
  const connectAndPlayDaily = useCallback(async () => {
    const user = await authenticatePi();
    setPiUser(user);
    const left = getRankedAttemptsToday().left;
    goDailyPrep(left > 0 ? "ranked" : "limit-reached");
  }, [goDailyPrep]);

  /** Auto-decide a Daily run (used by Result "Play Again" and the Leaderboard). */
  const startDailyAuto = useCallback(() => {
    if (!piUser) {
      goDailyPrep("local-only");
      return;
    }
    const left = getRankedAttemptsToday().left;
    goDailyPrep(left > 0 ? "ranked" : "limit-reached");
  }, [goDailyPrep, piUser]);

  /**
   * Preparation finished: revalidate NOW, consume the ranked attempt exactly
   * once, then start Phaser with the manifest.
   */
  const startPreparedDaily = useCallback(
    (challenge: DailyTokenChallenge | null, requestedRank: RunRankState) => {
      let rank = requestedRank;
      if (rank === "ranked") {
        if (!piUser || !challenge?.rankedEligible) rank = "local-only";
        else if (getRankedAttemptsToday().left <= 0) rank = "limit-reached";
      }
      if (rank === "ranked") consumeRankedAttempt();
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
      const o = recordRun(r);
      setResult(r);
      setOutcome(o);
      refresh();
      setScreen("result");

      // Server sync only for ranked Daily runs. Never for training / local-only /
      // limit-reached, and never retroactively.
      if (r.mode !== "daily" || runRankState === "training") {
        setServerSync("idle");
      } else if (runRankState === "limit-reached") {
        setServerSync("limit-reached");
      } else if (runRankState !== "ranked" || !piUser) {
        setServerSync("local-only");
      } else {
        setServerSync("pending");
        submitServerScore({
          pi_user_uid: piUser.uid,
          pi_username: piUser.username,
          score: r.score,
          energy_collected: r.energiesCollected,
          max_combo: r.maxCombo,
          obstacles_hit: r.obstaclesHit,
          duration_seconds: RUN_DURATION_SECONDS,
          game_mode: "daily",
          challenge_id: getDailyChallengeId(),
          challenge_date: getDailyDate(),
        })
          .then(() => setServerSync("ok"))
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : "";
            setServerSync(/limit/i.test(msg) ? "limit-reached" : "failed");
          });
      }
    },
    [refresh, piUser, runRankState],
  );

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
          cachedChallenge={dailyChallenge}
          onReady={(c) => startPreparedDaily(c, pendingDailyRank)}
          onPlayLocally={(c) => startPreparedDaily(c, "local-only")}
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
          bestScore={data.profile.bestDailyScore}
          bestSurvivalScore={data.profile.bestSurvivalScore}
          bestSurvivalStageName={data.profile.bestSurvivalStageName}
          campaignLevelBest={data.campaign.bestScoreByLevel[String(result.campaignLevelId)] ?? 0}
          campaignStarsEarned={campaignStarInfo.earned}
          campaignStarsBest={campaignStarInfo.best}
          campaignStarsNew={campaignStarInfo.isNew}
          serverSync={serverSync}
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
