import Phaser from "phaser";
import { GAME_HEIGHT, PLAYER } from "./gameConfig";
import { TRACK, PALETTE } from "./theme";
import type { TrackVisuals } from "./track";

/**
 * TrackGate (Phase 10B-P2 / 10D-A): a decorative arch/finish line that appears
 * at the horizon and travels down the track's perspective until the player
 * "crosses" it. PURELY VISUAL — no hitbox, no collision, no gameplay effect.
 * Used for the Daily FINISH line and for Survival zone checkpoints.
 */
export interface GateOptions {
  color: number;
  /** Optional label riding above the beam (e.g. "FINISH"). */
  label?: string;
  /** Travel time from horizon to the player line. */
  durationMs?: number;
  /** Fired exactly once when the gate reaches the player line. */
  onCross: () => void;
}

export class TrackGate {
  private readonly scene: Phaser.Scene;
  private readonly track: TrackVisuals;
  private readonly opts: GateOptions;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text | null;
  private readonly horizonY = GAME_HEIGHT * TRACK.horizonRatio;
  private readonly targetY = GAME_HEIGHT * PLAYER.yRatio + 26;
  private t = 0;
  private crossed = false;

  constructor(scene: Phaser.Scene, track: TrackVisuals, opts: GateOptions) {
    this.scene = scene;
    this.track = track;
    this.opts = opts;
    this.gfx = scene.add.graphics().setDepth(6);
    this.text = opts.label
      ? scene.add
          .text(0, 0, opts.label, {
            fontFamily: "Segoe UI, system-ui, sans-serif",
            fontSize: "22px",
            fontStyle: "bold",
            color: "#ffd166",
          })
          .setOrigin(0.5)
          .setDepth(6)
      : null;
    this.draw();
  }

  /** Advance the gate. Returns false once it has crossed (and faded). */
  update(deltaMs: number): boolean {
    if (this.crossed) return false;
    this.t = Math.min(1, this.t + deltaMs / (this.opts.durationMs ?? 1300));
    this.draw();
    if (this.t >= 1) {
      this.crossed = true;
      this.opts.onCross();
      // Quick fade-out so the beam doesn't linger on the player.
      this.scene.tweens.add({
        targets: [this.gfx, ...(this.text ? [this.text] : [])],
        alpha: 0,
        duration: 220,
        onComplete: () => this.destroy(),
      });
      return false;
    }
    return true;
  }

  private draw(): void {
    // Quadratic ease-in: approaches slowly from afar then rushes past, matching
    // the track's perspective feel.
    const eased = this.t * this.t;
    const y = Phaser.Math.Linear(this.horizonY, this.targetY, eased);
    const { left, right, scale } = this.track.roadEdges(y);
    const g = this.gfx;
    g.clear();

    const postH = 30 * scale;
    // Glow underlay for the beam.
    g.lineStyle(8 * scale, this.opts.color, 0.22);
    g.lineBetween(left, y, right, y);
    // Main beam.
    g.lineStyle(3.5 * scale, this.opts.color, 0.95);
    g.lineBetween(left, y, right, y);
    // Posts.
    g.lineStyle(3.5 * scale, this.opts.color, 0.9);
    g.lineBetween(left, y, left, y - postH);
    g.lineBetween(right, y, right, y - postH);
    // Top bar (arch).
    g.lineStyle(2.5 * scale, this.opts.color, 0.65);
    g.lineBetween(left, y - postH, right, y - postH);
    // Small centre marker.
    g.fillStyle(PALETTE.white, 0.85);
    g.fillCircle((left + right) / 2, y, 2.5 * scale);

    if (this.text) {
      this.text.setPosition((left + right) / 2, y - postH - 14 * scale);
      this.text.setScale(scale);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.text?.destroy();
  }
}
