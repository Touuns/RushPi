import { useCallback, useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import ProfileScreen from "./components/ProfileScreen";
import {
  consumeRankedAttempt,
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
import { authenticatePi, initPi, isPiBrowser, type PiUser } from "./pi/piClient";
import { submitServerScore } from "./utils/serverLeaderboard";
import { getDailyChallengeId, getDailyDate } from "./game/seededRandom";
import { RUN_DURATION_SECONDS } from "./game/gameConfig";
import type {
  BadgeId,
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
}

function readLocalData(): LocalData {
  return {
    profile: getProfile(),
    leaderboard: getLeaderboard(),
    badges: getUnlockedBadgeIds(),
    attempts: getRankedAttemptsToday(),
    streak: getStreakInfo(),
    history: getDailyHistory(),
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
  const playRankedDaily = useCallback(() => beginRun("daily", "ranked"), [beginRun]);
  const playDailyLocalOnly = useCallback(
    () => beginRun("daily", "local-only"),
    [beginRun],
  );
  const playDailyUnranked = useCallback(
    () => beginRun("daily", "limit-reached"),
    [beginRun],
  );

  /** Connect Pi (from the modal) then start a Daily run respecting the limit. */
  const connectAndPlayDaily = useCallback(async () => {
    const user = await authenticatePi();
    setPiUser(user);
    const left = getRankedAttemptsToday().left;
    beginRun("daily", left > 0 ? "ranked" : "limit-reached");
  }, [beginRun]);

  /** Auto-decide a Daily run (used by Result "Play Again" and the Leaderboard). */
  const startDailyAuto = useCallback(() => {
    if (!piUser) {
      beginRun("daily", "local-only");
      return;
    }
    const left = getRankedAttemptsToday().left;
    beginRun("daily", left > 0 ? "ranked" : "limit-reached");
  }, [beginRun, piUser]);

  const playAgain = useCallback(() => {
    if (mode === "training") playTraining();
    else if (mode === "survival") playSurvival();
    else startDailyAuto();
  }, [mode, playTraining, playSurvival, startDailyAuto]);

  const handleGameOver = useCallback(
    (r: GameResult) => {
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
        />
      )}

      {screen === "game" && (
        <GameScreen key={runKey} mode={mode} onGameOver={handleGameOver} onQuit={goHome} />
      )}

      {screen === "result" && result && outcome && (
        <ResultScreen
          result={result}
          outcome={outcome}
          bestScore={data.profile.bestDailyScore}
          bestSurvivalScore={data.profile.bestSurvivalScore}
          bestSurvivalStageName={data.profile.bestSurvivalStageName}
          serverSync={serverSync}
          streak={data.streak}
          onPlayAgain={playAgain}
          onHome={goHome}
          onLeaderboard={goLeaderboard}
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
          onHome={goHome}
          onReset={handleReset}
          piSdkAvailable={piSdkAvailable}
          piUser={piUser}
          onConnectPi={connectPi}
          onPiPaymentComplete={onPiPaymentComplete}
        />
      )}
    </div>
  );
}
