import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./gameConfig";
import { PALETTE } from "./theme";
import MainScene from "./scenes/MainScene";
import type { GameMode } from "../types";

/**
 * Thin factory that owns the Phaser.Game lifecycle. React (GameScreen) calls
 * createRushPiGame() on mount and destroyRushPiGame() on unmount; it never touches
 * Phaser internals directly. The returned game's `events` emitter is the bridge
 * to the React HUD (see types.ts / GameEvents).
 */
export function createRushPiGame(
  parent: HTMLElement,
  mode: GameMode,
  campaignLevelId = 0,
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: PALETTE.bgCss,
    // FIT keeps the logical resolution and scales to the container (portrait).
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // No arcade physics needed — collisions are simple distance checks in the scene.
    scene: [MainScene],
  };

  const game = new Phaser.Game(config);
  game.scene.start("MainScene", { mode, campaignLevelId });

  // Dev-only: expose the game for manual inspection/automation (stripped in prod).
  if (import.meta.env.DEV) {
    (window as unknown as { __rushpi?: Phaser.Game }).__rushpi = game;
  }

  return game;
}

export function destroyRushPiGame(game: Phaser.Game | null): void {
  if (game) {
    game.destroy(true);
  }
}
