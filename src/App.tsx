import { useCallback, useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import ProfileScreen from "./components/ProfileScreen";
import {
  getLeaderboard,
  getProfile,
  getUnlockedBadgeIds,
  markPiTestPaymentCompleted,
  recordRun,
  resetLocalProgress,
} from "./utils/storage";
import {
  authenticatePi,
  initPi,
  isPiBrowser,
  type PiUser,
} from "./pi/piClient";
import type {
  BadgeId,
  GameMode,
  GameResult,
  LeaderboardEntry,
  ProfileStats,
  RunOutcome,
  Screen,
} from "./types";

/** Snapshot of persisted data the UI reads; refreshed on every navigation. */
interface LocalData {
  profile: ProfileStats;
  leaderboard: LeaderboardEntry[];
  badges: BadgeId[];
}

function readLocalData(): LocalData {
  return {
    profile: getProfile(),
    leaderboard: getLeaderboard(),
    badges: getUnlockedBadgeIds(),
  };
}

/**
 * Screen state-machine: home -> game -> result -> (home | game | leaderboard),
 * plus leaderboard and profile reachable from home. Persisted progression is read
 * into `data` and refreshed whenever we leave a run or mutate storage.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("daily");
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [data, setData] = useState<LocalData>(() => readLocalData());

  // Pi integration state (optional; never blocks gameplay).
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  const [piUser, setPiUser] = useState<PiUser | null>(null);

  // `runKey` forces a fresh GameScreen mount (clean Phaser game) on each run.
  const [runKey, setRunKey] = useState(0);

  const refresh = useCallback(() => setData(readLocalData()), []);

  // Initialize the Pi SDK once on load (no auth, no payment — just init).
  useEffect(() => {
    setPiSdkAvailable(isPiBrowser());
    void initPi();
  }, []);

  const connectPi = useCallback(async () => {
    const user = await authenticatePi();
    setPiUser(user);
  }, []);

  const onPiPaymentComplete = useCallback(() => {
    markPiTestPaymentCompleted();
    refresh();
  }, [refresh]);

  const startRun = useCallback((nextMode: GameMode) => {
    setMode(nextMode);
    setResult(null);
    setOutcome(null);
    setRunKey((k) => k + 1);
    setScreen("game");
  }, []);

  const handleGameOver = useCallback(
    (r: GameResult) => {
      const o = recordRun(r);
      setResult(r);
      setOutcome(o);
      refresh();
      setScreen("result");
    },
    [refresh],
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
          piUsername={piUser?.username ?? null}
          onPlay={startRun}
          onLeaderboard={goLeaderboard}
          onProfile={goProfile}
        />
      )}

      {screen === "game" && (
        <GameScreen
          key={runKey}
          mode={mode}
          onGameOver={handleGameOver}
          onQuit={goHome}
        />
      )}

      {screen === "result" && result && outcome && (
        <ResultScreen
          result={result}
          outcome={outcome}
          bestScore={data.profile.bestDailyScore}
          onPlayAgain={() => startRun(mode)}
          onHome={goHome}
          onLeaderboard={goLeaderboard}
        />
      )}

      {screen === "leaderboard" && (
        <LeaderboardScreen
          entries={data.leaderboard}
          onHome={goHome}
          onPlayAgain={() => startRun("daily")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          profile={data.profile}
          unlockedBadgeIds={data.badges}
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
