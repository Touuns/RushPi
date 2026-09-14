import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createRushPiGame, destroyRushPiGame } from "../game/RushPiGame";
import { RUN_DURATION_SECONDS } from "../game/gameConfig";
import { GameEvents, type GameMode, type GameResult, type HudState } from "../types";
import type { DailyTokenChallenge } from "../market/dailyTokenTypes";
import ScreenBackButton from "./ScreenBackButton";
import { COACH_MARKS, type CoachMarkId } from "./coachMarks";

interface GameScreenProps {
  mode: GameMode;
  campaignLevelId?: number;
  /** Daily Token Rush manifest (Phase 11B); null outside Daily. */
  dailyChallenge?: DailyTokenChallenge | null;
  /**
   * True only for a ranked Daily run (Phase 13B): the server already reserved
   * this attempt during preparation, before gameplay started, so quitting now
   * cannot give it back. Honest-costs wording only — never changes whether or
   * when an attempt is consumed.
   */
  dailyRanked?: boolean;
  /**
   * Phase 13D: this run is the one-time Guided First Run (Training, unmodified
   * rules). Purely presentational — it swaps the ordinary quit button for a
   * single "Skip →" affordance so the run has exactly one navigation action.
   * Never true for a returning player's manually-started Training run.
   */
  guidedFirstRun?: boolean;
  /** Leave the Guided First Run immediately (no confirmation, no run recorded). */
  onSkipGuidedFirstRun?: () => void;
  /**
   * Phase 13E: run the one-time Move → Avoid → Collect coach-mark sequence.
   * The parent only ever passes true when this IS the Guided First Run AND the
   * cues have not been seen before, so a second Training run, a returning
   * player's Training, Daily, Survival and Campaign can never receive them.
   * Read once at mount — flipping it mid-run neither starts nor restarts a
   * sequence.
   */
  showCoachMarks?: boolean;
  /** Fired once, after the THIRD cue has finished being displayed. */
  onCoachMarksSeen?: () => void;
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
  tokensCollected: 0,
  tokensTotal: 0,
};

const EVENT_LABEL: Record<NonNullable<HudState["event"]>, string> = {
  speed: "Speed Zone",
  energy: "Energy Zone",
  danger: "Danger Zone",
  tunnel: "Tunnel Pulse",
};

// Phase 12B-1.1: an icon (shape, not colour alone) per event kind for the
// single-slot gameplay status channel.
const EVENT_ICON: Record<NonNullable<HudState["event"]>, string> = {
  speed: "»",
  energy: "✦",
  danger: "▲",
  tunnel: "◎",
};

/** Kinds that can occupy the single gameplay-status slot (for CSS styling). */
type StatusKind = "shield" | "magnet" | NonNullable<HudState["event"]>;

/**
 * Pick the ONE gameplay status to show (Phase 12B-1.1). Priority: an active
 * Shield, else an active Magnet, else the active event — at most one at a time,
 * so the status channel never stacks. The player rings still show Shield/Magnet
 * independently, so no information is lost.
 */
function pickStatus(
  hud: HudState,
): { kind: StatusKind; icon: string; text: string } | null {
  if (hud.shieldSecs > 0)
    return { kind: "shield", icon: "🛡", text: `SHIELD · ${hud.shieldSecs}s` };
  if (hud.magnetSecs > 0)
    return { kind: "magnet", icon: "🧲", text: `MAGNET · ${hud.magnetSecs}s` };
  if (hud.event)
    return { kind: hud.event, icon: EVENT_ICON[hud.event], text: EVENT_LABEL[hud.event] };
  return null;
}

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
  dailyChallenge = null,
  dailyRanked = false,
  guidedFirstRun = false,
  onSkipGuidedFirstRun,
  showCoachMarks = false,
  onCoachMarksSeen,
  onGameOver,
  onQuit,
}: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Keep the latest callback without re-running the mount effect.
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const onCoachMarksSeenRef = useRef(onCoachMarksSeen);
  onCoachMarksSeenRef.current = onCoachMarksSeen;

  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  // Quit confirmation (10B-P4): the Phaser scene is paused while it is open.
  const [confirmQuit, setConfirmQuit] = useState(false);
  const quittingRef = useRef(false);
  // Phase 13E — which coach mark is on screen right now (null = none). Driven
  // by a fixed set of one-shot timers, never by a render loop.
  const [coachMark, setCoachMark] = useState<CoachMarkId | null>(null);
  /**
   * Whether this mount is allowed to run the sequence at all, captured ONCE.
   * The parent flips `showCoachMarks` to false as soon as the third cue is
   * recorded; reading the prop directly in the effect below would then tear
   * the schedule down and re-arm it on the next mount for the wrong run.
   */
  const coachMarksArmedRef = useRef(showCoachMarks);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = createRushPiGame(containerRef.current, mode, campaignLevelId, dailyChallenge);
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

  /**
   * Phase 13E — the coach-mark schedule. Deliberately the cheapest possible
   * mechanism: a fixed, finite set of one-shot `setTimeout`s created once at
   * mount from the static COACH_MARKS table.
   *
   * What it explicitly is NOT: no requestAnimationFrame loop, no Phaser update
   * hook, no per-frame React state, no reaction to `hud` (which the scene emits
   * on every change), no read of gameplay RNG, no spawn/timing manipulation.
   * The Phaser game underneath is never paused, never inspected and never
   * touched — the cues are pure overlay.
   *
   * Every timer is tracked and cleared on unmount, so Skip, the natural finish
   * and any mode transition all tear the sequence down before a delayed cue
   * could fire into an unmounted tree (no set-state-after-unmount warning, and
   * no cue can appear after the Guided First Run is over).
   */
  useEffect(() => {
    if (!coachMarksArmedRef.current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    COACH_MARKS.forEach((mark, index) => {
      const isLast = index === COACH_MARKS.length - 1;
      timers.push(setTimeout(() => setCoachMark(mark.id), mark.atMs));
      timers.push(
        setTimeout(() => {
          setCoachMark((current) => (current === mark.id ? null : current));
          // The sequence counts as SEEN only once the last cue has actually
          // finished being displayed — never when the run merely started.
          if (isLast) onCoachMarksSeenRef.current?.();
        }, mark.atMs + mark.durationMs),
      );
    });

    return () => {
      for (const t of timers) clearTimeout(t);
    };
    // Armed once per mount, from a ref — see coachMarksArmedRef.

  }, []);

  const isSurvival = mode === "survival";
  const isCampaign = mode === "campaign";
  const isSurvivalLike = isSurvival || isCampaign;
  const lowTime = !isSurvivalLike && hud.timeLeft <= 10;
  // Single gameplay status to display this frame (Phase 12B-1.1).
  const status = pickStatus(hud);
  // Phase 13E — constant for the lifetime of this mount (see coachMarksArmedRef).
  const coachMarksArmed = coachMarksArmedRef.current;

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
      {/* HUD overlay — pointerEvents disabled so taps reach the Phaser canvas.
          Phase 13D: `--guided` re-reserves the corner gutter on the right for
          "Skip →" so it never covers the Combo readout. */}
      <div className={`hud ${guidedFirstRun ? "hud--guided" : ""}`} aria-hidden="true">
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

      {/* Daily Token Rush (Phase 11B): compact tokens counter under the HUD. */}
      {mode === "daily" && hud.tokensTotal > 0 && (
        <div className="token-chip" aria-hidden="true">
          🪙 Tokens {hud.tokensCollected}/{hud.tokensTotal}
        </div>
      )}

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

      {/* Single-slot gameplay status channel (Phase 12B-1.1): at most ONE status
          at a time (Shield > Magnet > event), on its own fixed row below the HUD
          — never stacked, never overlapping the Tokens X/N chip. */}
      {status && (
        <div
          className={`status-channel ${isSurvivalLike ? "status-channel--low" : ""}`}
          aria-hidden="true"
        >
          <span className={`status-chip status-chip--${status.kind}`}>
            <span className="status-chip__icon">{status.icon}</span>
            {status.text}
          </span>
        </div>
      )}

      {/* Phase 13D — the Guided First Run has exactly ONE navigation action
          ("Skip →", top-right), so the ordinary quit arrow is not rendered
          alongside it. Every other run (normal Training, Daily, Survival,
          Campaign) keeps the unchanged back-arrow + confirmation flow. */}
      {guidedFirstRun ? (
        <button
          className="guided-skip"
          type="button"
          onClick={onSkipGuidedFirstRun}
          aria-label="Skip the first run and go to the home screen"
        >
          Skip →
        </button>
      ) : (
        <ScreenBackButton
          onBack={openQuitConfirm}
          label={isCampaign ? "Quit level" : "Quit run"}
        />
      )}

      {/* Phase 13E — the one-time instructional layer of the Guided First Run.
          Non-blocking by construction: `pointer-events: none` on the layer, no
          button, no Next, no step counter, no confirmation, and the Phaser
          scene keeps running underneath (contrast with the quit modal above,
          which is the ONLY thing in this screen that pauses gameplay).
          `aria-live="polite"` announces each cue without stealing or trapping
          focus; the element is never focusable. The layer exists only for a
          mount that is actually armed, so no other mode ever renders it — and
          it is mounted from frame 1 (empty) so the live region is established
          before the first cue arrives. */}
      {coachMarksArmed && (
        <div className="coach-mark-layer" aria-live="polite" aria-atomic="true">
          {coachMark && (
            <p key={coachMark} className={`coach-mark coach-mark--${coachMark}`}>
              {COACH_MARKS.find((m) => m.id === coachMark)?.text}
            </p>
          )}
        </div>
      )}

      {confirmQuit && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Quit this run?</h2>
            <p className="modal__text">
              {dailyRanked
                ? "This ranked run is already counted. Quitting won't give the attempt back."
                : "Your current run progress will be lost."}
            </p>
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

      {/* Phase 13E — "not ranked" is exactly right for ordinary Training, but
          the first run deliberately defers every meta concept (ranking,
          attempts, tokens, streaks) until after the first Daily. So the chip is
          suppressed for the Guided First Run ONLY, with no replacement copy:
          the three coach marks are the complete instructional layer. Normal
          Training is untouched. */}
      {mode === "training" && !guidedFirstRun && (
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
