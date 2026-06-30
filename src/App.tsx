import { useCallback, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import { getBestScore } from "./utils/storage";
import type { GameMode, GameResult, Screen } from "./types";

/**
 * Tiny screen state-machine: home -> game -> result -> (home | game).
 * No router dependency needed for a 3-screen Phase 1 flow.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("daily");
  const [result, setResult] = useState<GameResult | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => getBestScore());

  // `runKey` forces a fresh GameScreen mount (and thus a clean Phaser game) on replay.
  const [runKey, setRunKey] = useState(0);

  const startRun = useCallback((nextMode: GameMode) => {
    setMode(nextMode);
    setResult(null);
    setRunKey((k) => k + 1);
    setScreen("game");
  }, []);

  const handleGameOver = useCallback((r: GameResult) => {
    setResult(r);
    setBestScore(getBestScore());
    setScreen("result");
  }, []);

  const goHome = useCallback(() => {
    setBestScore(getBestScore());
    setScreen("home");
  }, []);

  return (
    <div className="app-frame">
      {screen === "home" && <HomeScreen bestScore={bestScore} onPlay={startRun} />}

      {screen === "game" && (
        <GameScreen
          key={runKey}
          mode={mode}
          onGameOver={handleGameOver}
          onQuit={goHome}
        />
      )}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          bestScore={bestScore}
          onPlayAgain={() => startRun(mode)}
          onHome={goHome}
        />
      )}
    </div>
  );
}
