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
import { submitServerScore } from "./utils/serverLeaderboard";
import { RUN_DURATION_SECONDS } from "./game/gameConfig";

/** Server-sync state for the just-finished Daily run, shown on the Result screen. */
export type ServerSyncStatus = "idle" | "pending" | "ok" | "failed" | "local-only";
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
  const [serverSync, setServerSync] = useState<ServerSyncStatus>("idle");

  // `runKey` forces a fresh GameScreen mount (clean Phaser game) on each run.
  const [runKey, setRunKey] = useState(0);

  // Leaderboard eligibility is decided when a run STARTS, not at the end.
  // A Daily run is ranked only if the player was Pi-connected at kickoff. This is
  // never re-evaluated later (no retroactive sync after connecting) — by design.
  const [runRanked, setRunRanked] = useState(false);

  const refresh = useCallback(() => setData(readLocalData()), []);

  // Initialize the Pi SDK on load, and inside Pi Browser auto-connect so the
  // username shows and every Daily run syncs without re-tapping "Connect Pi"
  // each session. Silent if already authorized; failures never block the game.
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

  const startRun = useCallback(
    (nextMode: GameMode, forcedRanked?: boolean) => {
      // Daily is ranked only when connected at start; training is never ranked.
      const ranked =
        forcedRanked ?? (nextMode === "daily" && piUser !== null);
      setRunRanked(ranked);
      setMode(nextMode);
      setResult(null);
      setOutcome(null);
      setRunKey((k) => k + 1);
      setScreen("game");
    },
    [piUser],
  );

  /** From the "Connect Pi" modal action: authenticate, then start a ranked Daily. */
  const connectAndPlayDaily = useCallback(async () => {
    const user = await authenticatePi();
    setPiUser(user);
    startRun("daily", true); // just authenticated → ranked, no state race
  }, [startRun]);

  /** From the "Play locally" modal action: Daily run that won't be ranked. */
  const playDailyLocal = useCallback(() => {
    startRun("daily", false);
  }, [startRun]);

  const handleGameOver = useCallback(
    (r: GameResult) => {
      const o = recordRun(r);
      setResult(r);
      setOutcome(o);
      refresh();
      setScreen("result");

      // Server leaderboard sync: Daily runs that were RANKED at start (i.e. the
      // player was Pi-connected when the run began). Training and local-only runs
      // are never sent; we never retroactively sync a run played while offline.
      if (r.mode !== "daily") {
        setServerSync("idle");
      } else if (!runRanked || !piUser) {
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
        })
          .then(() => setServerSync("ok"))
          .catch(() => setServerSync("failed"));
      }
    },
    [refresh, piUser, runRanked],
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
          onPlay={startRun}
          onConnectAndPlayDaily={connectAndPlayDaily}
          onPlayDailyLocal={playDailyLocal}
          onLeaderboard={goLeaderboard}
          onProfile={goProfile}
          piSdkAvailable={piSdkAvailable}
          piUser={piUser}
          onConnectPi={connectPi}
          onPiPaymentComplete={onPiPaymentComplete}
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
          serverSync={serverSync}
          onPlayAgain={() => startRun(mode)}
          onHome={goHome}
          onLeaderboard={goLeaderboard}
        />
      )}

      {screen === "leaderboard" && (
        <LeaderboardScreen
          entries={data.leaderboard}
          piConnected={piUser !== null}
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
