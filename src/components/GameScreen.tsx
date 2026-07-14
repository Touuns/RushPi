import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createRushPiGame, destroyRushPiGame } from "../game/RushPiGame";
import { RUN_DURATION_SECONDS } from "../game/gameConfig";
import { GameEvents, type GameMode, type GameResult, type HudState } from "../types";
import ScreenBackButton from "./ScreenBackButton";

interface GameScreenProps {
  mode: GameMode;
  campaignLevelId?: number;
  onGameOver: (result: GameResult) => void;
  onQuit: () => void;
}

const INITIAL_HUD: HudState = {
  score: 0,
  timeLeft: RUN_DURATION_SECONDS,
  combo: 0,
  shieldSecs: 0,
  magnetSecs: 0,
  event: null,
  lives: 3,
  charge: 1,
  stage: "",
  progress: 0,
};

const EVENT_LABEL: Record<NonNullable<HudState["event"]>, string> = {
  speed: "Speed Zone",
  energy: "Energy Zone",
  danger: "Danger Zone",
  tunnel: "Tunnel Pulse",
};

/**
 * Hosts the Phaser canvas and overlays the HUD in React.
 *
 * Division of labor (per design): Phaser owns the loop/collisions/objects and
 * emits state via game.events; React owns the UI and just renders what it receives.
 * If this overlay ever proves too costly it could fall back to on-canvas text, but
 * the event contract (GameEvents) keeps that swap localized.
 */
export default function GameScreen({
  mode,
  campaignLevelId = 0,
  onGameOver,
  onQuit,
}: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Keep the latest callback without re-running the mount effect.
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  // Quit confirmation (10B-P4): the Phaser scene is paused while it is open.
  const [confirmQuit, setConfirmQuit] = useState(false);
  const quittingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = createRushPiGame(containerRef.current, mode, campaignLevelId);
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
    // mode/level are fixed for the lifetime of a run; remounting changes them.
  }, [mode, campaignLevelId]);

  const isSurvival = mode === "survival";
  const isCampaign = mode === "campaign";
  const isSurvivalLike = isSurvival || isCampaign;
  const lowTime = !isSurvivalLike && hud.timeLeft <= 10;

  // Quit flow: pause the scene while the confirmation is open so nothing can be
  // collected / no lane can change behind the modal; resume cleanly on cancel.
  const openQuitConfirm = () => {
    if (confirmQuit || quittingRef.current) return;
    setConfirmQuit(true);
    gameRef.current?.scene.pause("MainScene");
  };

  const keepPlaying = () => {
    setConfirmQuit(false);
    gameRef.current?.scene.resume("MainScene");
  };

  const quitRun = () => {
    if (quittingRef.current) return; // never quit twice
    quittingRef.current = true;
    setConfirmQuit(false);
    // No GameResult / score / XP / badge is recorded: the parent navigates away
    // and the unmount destroys the Phaser game before any GameOver can fire.
    onQuit();
  };

  return (
    <div className="game-screen">
      {/* HUD overlay — pointerEvents disabled so taps reach the Phaser canvas. */}
      <div className="hud" aria-hidden="true">
        <div className="hud__item">
          <span className="hud__label">Score</span>
          <span className="hud__value">{hud.score.toLocaleString()}</span>
        </div>
        {isSurvivalLike ? (
          <div className="hud__item hud__item--lives">
            <span className="hud__label">Lives</span>
            <span className="hud__value">
              {hud.lives > 0 ? "❤️".repeat(hud.lives) : "—"}
            </span>
          </div>
        ) : (
          <div className={`hud__item hud__item--time ${lowTime ? "is-low" : ""}`}>
            <span className="hud__label">Time</span>
            <span className="hud__value">{hud.timeLeft}s</span>
          </div>
        )}
        <div className="hud__item hud__item--combo">
          <span className="hud__label">Combo</span>
          <span className="hud__value">
            {hud.combo > 0 ? `x${hud.combo}` : "—"}
          </span>
        </div>
      </div>

      {isSurvival && (
        <div className="survival-time" aria-hidden="true">
          {hud.stage && <span className="survival-stage">{hud.stage}</span>}
          Survived {hud.timeLeft}s · Charge Lv {hud.charge}/6
        </div>
      )}

      {isCampaign && (
        <div className="survival-time" aria-hidden="true">
          {hud.stage && <span className="survival-stage">{hud.stage}</span>}
          <div className="campaign-progress">
            <div
              className="campaign-progress__fill"
              style={{ width: `${Math.round(hud.progress * 100)}%` }}
            />
          </div>
          <span className="campaign-progress__label">
            Progress {Math.round(hud.progress * 100)}% · Charge Lv {hud.charge}/6
          </span>
        </div>
      )}

      {/* Active power-up + event chips (only shown while active). */}
      {(hud.shieldSecs > 0 || hud.magnetSecs > 0 || hud.event) && (
        <div className="powerups" aria-hidden="true">
          {hud.shieldSecs > 0 && (
            <span className="powerup-chip powerup-chip--shield">
              🛡 Shield {hud.shieldSecs}s
            </span>
          )}
          {hud.magnetSecs > 0 && (
            <span className="powerup-chip powerup-chip--magnet">
              🧲 Magnet {hud.magnetSecs}s
            </span>
          )}
          {hud.event && (
            <span className={`powerup-chip powerup-chip--event is-${hud.event}`}>
              {EVENT_LABEL[hud.event]}
            </span>
          )}
        </div>
      )}

      {/* Back arrow: opens a quit confirmation instead of quitting directly. */}
      <ScreenBackButton
        onBack={openQuitConfirm}
        label={isCampaign ? "Quit level" : "Quit run"}
      />

      {confirmQuit && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Quit this run?</h2>
            <p className="modal__text">Your current run progress will be lost.</p>
            <div className="modal__actions">
              <button className="btn btn--primary" type="button" onClick={keepPlaying}>
                Keep playing
              </button>
              <button className="btn btn--secondary" type="button" onClick={quitRun}>
                {isCampaign ? "Quit level" : "Quit run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "training" && (
        <div className="game-screen__mode-tag">Training scores are not ranked</div>
      )}
      {mode === "survival" && (
        <div className="game-screen__mode-tag">Survival · local only</div>
      )}
      {mode === "campaign" && (
        <div className="game-screen__mode-tag">Campaign · local only</div>
      )}

      <div ref={containerRef} className="game-screen__canvas" />
    </div>
  );
}
