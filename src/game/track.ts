import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, LANE_COUNT, PLAYER } from "./gameConfig";
import { PALETTE, TRACK, EVENTS } from "./theme";

interface Chevron {
  gfx: Phaser.GameObjects.Container;
  /** Progress along the track, 0 (horizon) .. 1 (bottom). */
  t: number;
}

/**
 * Procedural perspective track ("race feeling"). PURELY VISUAL.
 *
 * The gameplay keeps positioning objects by logical (lane, y) and collisions use
 * only lane + y — never the on-screen x. This class:
 *  - draws the static trapezoidal 3-lane road converging to a vanishing point,
 *  - animates scrolling chevrons as a speed cue,
 *  - exposes project(lane, y) so the scene can render falling objects "on the
 *    road" (converging toward the vanishing point + scaling with depth) without
 *    affecting the deterministic spawn sequence or collisions.
 */
export class TrackVisuals {
  private readonly scene: Phaser.Scene;
  private readonly laneX: number[];
  private readonly centerX = GAME_WIDTH / 2;
  private readonly horizonY = GAME_HEIGHT * TRACK.horizonRatio;
  private readonly playerY = GAME_HEIGHT * PLAYER.yRatio;
  private readonly topWidth = GAME_WIDTH * TRACK.topWidthRatio;
  private chevrons: Chevron[] = [];

  // Event visuals (Phase 8B).
  private speedMultiplier = 1;
  // Per-stage chevron factor (Phase 9D), composed with the event speed boost.
  private stageMultiplier = 1;
  private tunnelArcs: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, laneX: number[]) {
    this.scene = scene;
    this.laneX = laneX;
  }

  /** X of boundary line i (0..LANE_COUNT) at the far end (horizon). */
  private boundaryTopX(i: number): number {
    return this.centerX + (i / LANE_COUNT - 0.5) * this.topWidth;
  }

  /** X of a lane's center at the far end (horizon). */
  private laneTopX(lane: number): number {
    return this.centerX + ((lane + 0.5) / LANE_COUNT - 0.5) * this.topWidth;
  }

  /** Draw the static road + vanishing-point glow, and create the chevrons. */
  drawStatic(): void {
    const g = this.scene.add.graphics();
    g.setDepth(0);

    // Road surface: trapezoid (full width at the bottom, narrow at the horizon).
    g.fillStyle(PALETTE.violet, TRACK.roadFillAlpha);
    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    g.lineTo(GAME_WIDTH, GAME_HEIGHT);
    g.lineTo(this.boundaryTopX(LANE_COUNT), this.horizonY);
    g.lineTo(this.boundaryTopX(0), this.horizonY);
    g.closePath();
    g.fillPath();

    // Far edge of the road at the horizon.
    g.lineStyle(2, PALETTE.gold, TRACK.laneAlpha);
    g.lineBetween(
      this.boundaryTopX(0),
      this.horizonY,
      this.boundaryTopX(LANE_COUNT),
      this.horizonY,
    );

    // Lane boundary lines from the bottom to the far edge.
    const laneWidth = GAME_WIDTH / LANE_COUNT;
    for (let i = 0; i <= LANE_COUNT; i++) {
      const outer = i === 0 || i === LANE_COUNT;
      g.lineStyle(
        outer ? 4 : 2,
        outer ? PALETTE.gold : PALETTE.violet,
        outer ? TRACK.edgeAlpha : TRACK.laneAlpha,
      );
      g.lineBetween(laneWidth * i, GAME_HEIGHT, this.boundaryTopX(i), this.horizonY);
    }

    // Subtle horizon glow (like the logo's distant light). Additive so it reads
    // as light, not a muddy overlay.
    this.scene.add
      .circle(this.centerX, this.horizonY, TRACK.haloRadius, PALETTE.gold, 0.14)
      .setDepth(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.add
      .circle(this.centerX, this.horizonY, TRACK.haloCoreRadius, PALETTE.orange, 0.3)
      .setDepth(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Scrolling chevrons (speed cue), evenly spaced along the track.
    for (let i = 0; i < TRACK.chevronCount; i++) {
      const chevron: Chevron = { gfx: this.makeChevron(), t: i / TRACK.chevronCount };
      this.chevrons.push(chevron);
      this.positionChevron(chevron);
    }
  }

  private makeChevron(): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.lineStyle(4, TRACK.chevronColor, 0.7);
    const w = 28;
    const h = 13;
    // "^" pointing up toward the vanishing point.
    g.beginPath();
    g.moveTo(-w / 2, h / 2);
    g.lineTo(0, -h / 2);
    g.lineTo(w / 2, h / 2);
    g.strokePath();
    return this.scene.add.container(0, 0, [g]).setDepth(1);
  }

  private positionChevron(ch: Chevron): void {
    const y = Phaser.Math.Linear(this.horizonY, GAME_HEIGHT, ch.t);
    const scale = Phaser.Math.Linear(TRACK.vanishingScale, TRACK.nearScale * 1.25, ch.t);
    ch.gfx.setPosition(this.centerX, y);
    ch.gfx.setScale(scale);
    ch.gfx.setAlpha(0.12 + 0.5 * ch.t); // fade in as it approaches
  }

  /** Advance the scrolling chevrons. Call from the scene's update(). */
  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const ch of this.chevrons) {
      ch.t += TRACK.chevronSpeed * this.speedMultiplier * this.stageMultiplier * dt;
      if (ch.t >= 1) ch.t -= 1;
      this.positionChevron(ch);
    }
  }

  // ---- Event visuals (cosmetic; no gameplay impact) -----------------------

  /** Speed Zone: chevrons scroll faster (does NOT change real game speed). */
  setSpeedBoost(active: boolean): void {
    this.speedMultiplier = active ? EVENTS.speedChevronMultiplier : 1;
  }

  /** Per-stage chevron feel (Phase 9D, Survival). Visual only. */
  setStageMultiplier(m: number): void {
    this.stageMultiplier = m;
  }

  /** Tunnel Pulse: expanding light rings from the vanishing point. */
  startTunnel(scene: Phaser.Scene): void {
    if (this.tunnelArcs.length > 0) return;
    for (let i = 0; i < 3; i++) {
      const arc = scene.add
        .circle(this.centerX, this.horizonY, 18, PALETTE.magnetRing, 0)
        .setStrokeStyle(3, PALETTE.magnetRing, 0.8)
        .setDepth(1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tunnelArcs.push(arc);
      scene.tweens.add({
        targets: arc,
        scale: 7,
        alpha: { from: 0.55, to: 0 },
        duration: 1500,
        delay: i * 500,
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
  }

  stopTunnel(scene: Phaser.Scene): void {
    for (const arc of this.tunnelArcs) {
      scene.tweens.killTweensOf(arc);
      arc.destroy();
    }
    this.tunnelArcs = [];
  }

  /**
   * Project a logical (lane, y) to its on-road screen x + depth scale.
   * Visual only — does not influence collisions.
   */
  project(lane: number, y: number): { x: number; scale: number } {
    const p = Phaser.Math.Clamp(
      (y - this.horizonY) / (this.playerY - this.horizonY),
      0,
      1,
    );
    return {
      x: Phaser.Math.Linear(this.laneTopX(lane), this.laneX[lane], p),
      scale: Phaser.Math.Linear(TRACK.vanishingScale, TRACK.nearScale, p),
    };
  }
}
