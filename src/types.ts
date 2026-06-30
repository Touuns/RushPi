/**
 * Shared types for Rush Pi.
 *
 * Kept framework-agnostic so both the React UI layer and the Phaser game layer
 * can depend on the same contracts without importing each other.
 */

/**
 * Game modes. Only `daily` is fully wired in Phase 1, but `training` exists in
 * the type system now so that adding the Training Mode later requires no refactor
 * (screens, scoring and storage already branch on this value where relevant).
 */
export type GameMode = "daily" | "training";

/** The screens the app can show. A tiny screen state-machine lives in App.tsx. */
export type Screen = "home" | "game" | "result";

/**
 * Live HUD state emitted by the Phaser scene during a run and rendered by React.
 * This is the React-overlay HUD contract: Phaser owns the loop, React owns the UI.
 */
export interface HudState {
  /** Current score, already including the combo multiplier. */
  score: number;
  /** Whole seconds remaining in the run (0..GAME_DURATION_SECONDS). */
  timeLeft: number;
  /** Current combo count (consecutive energies collected without a hit). */
  combo: number;
}

/**
 * Final result of a run, produced by the scene and consumed by the Result screen.
 * `mode` travels with the result so the UI/storage can treat Daily vs Training
 * differently (e.g. later: not ranking Training scores).
 */
export interface GameResult {
  mode: GameMode;
  score: number;
  energiesCollected: number;
  maxCombo: number;
  obstaclesHit: number;
  endBonus: number;
  /** Whether this run produced a new local best (Daily only). */
  isNewBest: boolean;
}

/** Events the Phaser game emits to the React layer. Keep names centralized. */
export const GameEvents = {
  HudUpdate: "hud-update",
  GameOver: "game-over",
} as const;
