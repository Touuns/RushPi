import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createRushPiGame, destroyRushPiGame } from "../game/RushPiGame";
import { RUN_DURATION_SECONDS } from "../game/gameConfig";
import { GameEvents, type GameMode, type GameResult, type HudState } from "../types";

interface GameScreenProps {
  mode: GameMode;
  onGameOver: (result: GameResult) => void;
  onQuit: () => void;
}

const INITIAL_HUD: HudState = {
  score: 0,
  timeLeft: RUN_DURATION_SECONDS,
  combo: 0,
};

/**
 * Hosts the Phaser canvas and overlays the HUD in React.
 *
 * Division of labor (per design): Phaser owns the loop/collisions/objects and
 * emits state via game.events; React owns the UI and just renders what it receives.
 * If this overlay ever proves too costly it could fall back to on-canvas text, but
 * the event contract (GameEvents) keeps that swap localized.
 */
export default function GameScreen({ mode, onGameOver, onQuit }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Keep the latest callback without re-running the mount effect.
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [hud, setHud] = useState<HudState>(INITIAL_HUD);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = createRushPiGame(containerRef.current, mode);
    gameRef.current = game;

    const handleHud = (next: HudState) => setHud(next);
    const handleOver = (result: GameResult) => onGameOverRef.current(result);

    game.events.on(GameEvents.HudUpdate, handleHud);
    game.events.on(GameEvents.GameOver, handleOver);

    return () => {
      game.events.off(GameEvents.HudUpdate, handleHud);
      game.events.off(GameEvents.GameOver, handleOver);
      destroyRushPiGame(game);
      gameRef.current = null;
    };
    // mode is fixed for the lifetime of a run; remounting changes it.
  }, [mode]);

  const lowTime = hud.timeLeft <= 10;

  return (
    <div className="game-screen">
      {/* HUD overlay — pointerEvents disabled so taps reach the Phaser canvas. */}
      <div className="hud" aria-hidden="true">
        <div className="hud__item">
          <span className="hud__label">Score</span>
          <span className="hud__value">{hud.score.toLocaleString()}</span>
        </div>
        <div className={`hud__item hud__item--time ${lowTime ? "is-low" : ""}`}>
          <span className="hud__label">Time</span>
          <span className="hud__value">{hud.timeLeft}s</span>
        </div>
        <div className="hud__item hud__item--combo">
          <span className="hud__label">Combo</span>
          <span className="hud__value">
            {hud.combo > 0 ? `x${hud.combo}` : "—"}
          </span>
        </div>
      </div>

      {/* Quit button: its own interactive layer above the no-pointer HUD. */}
      <button
        className="game-screen__quit"
        type="button"
        aria-label="Quit run"
        onClick={onQuit}
      >
        ✕
      </button>

      {mode === "training" && (
        <div className="game-screen__mode-tag">Training scores are not ranked</div>
      )}

      <div ref={containerRef} className="game-screen__canvas" />
    </div>
  );
}
