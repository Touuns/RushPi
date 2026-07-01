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
 * The gameplay positions objects by logical (lane, y) and collisions use only
 * lane + y — never the on-screen x. This class draws the trapezoidal 3-lane road,
 * scrolling chevrons, and projects falling objects onto the road. Phase 9E adds
 * Track Drift: the vanishing point can shift horizontally (driftX), redrawn each
 * frame so the whole road leans — still no gameplay/collision impact.
 */
export class TrackVisuals {
  private readonly scene: Phaser.Scene;
  private readonly laneX: number[];
  private readonly centerX = GAME_WIDTH / 2;
  private readonly horizonY = GAME_HEIGHT * TRACK.horizonRatio;
  private readonly playerY = GAME_HEIGHT * PLAYER.yRatio;
  private readonly topWidth = GAME_WIDTH * TRACK.topWidthRatio;
  private chevrons: Chevron[] = [];

  // Redrawn road + horizon glow (so Track Drift can move the vanishing point).
  private roadGfx!: Phaser.GameObjects.Graphics;
  private haloGlow!: Phaser.GameObjects.Arc;
  private haloCore!: Phaser.GameObjects.Arc;

  // Event visuals (Phase 8B) + Track Drift (Phase 9E).
  private speedMultiplier = 1;
  private stageMultiplier = 1;
  private driftX = 0;
  private tunnelArcs: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, laneX: number[]) {
    this.scene = scene;
    this.laneX = laneX;
  }

  /** X of boundary line i (0..LANE_COUNT) at the far end, including drift. */
  private boundaryTopX(i: number): number {
    return this.centerX + this.driftX + (i / LANE_COUNT - 0.5) * this.topWidth;
  }

  /** X of a lane's center at the far end, including drift. */
  private laneTopX(lane: number): number {
    return this.centerX + this.driftX + ((lane + 0.5) / LANE_COUNT - 0.5) * this.topWidth;
  }

  /** Create the road graphics + horizon glow + chevrons (drawn each frame after). */
  drawStatic(): void {
    this.roadGfx = this.scene.add.graphics().setDepth(0);

    this.haloGlow = this.scene.add
      .circle(this.centerX, this.horizonY, TRACK.haloRadius, PALETTE.gold, 0.14)
      .setDepth(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.haloCore = this.scene.add
      .circle(this.centerX, this.horizonY, TRACK.haloCoreRadius, PALETTE.orange, 0.3)
      .setDepth(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < TRACK.chevronCount; i++) {
      const chevron: Chevron = { gfx: this.makeChevron(), t: i / TRACK.chevronCount };
      this.chevrons.push(chevron);
      this.positionChevron(chevron);
    }

    this.drawRoad();
  }

  /** Redraw the trapezoidal road + lane lines + horizon edge for the current drift. */
  private drawRoad(): void {
    const g = this.roadGfx;
    g.clear();

    const topL = this.boundaryTopX(0);
    const topR = this.boundaryTopX(LANE_COUNT);

    // Road surface (full width at the bottom, narrow at the drifting horizon).
    g.fillStyle(PALETTE.violet, TRACK.roadFillAlpha);
    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    g.lineTo(GAME_WIDTH, GAME_HEIGHT);
    g.lineTo(topR, this.horizonY);
    g.lineTo(topL, this.horizonY);
    g.closePath();
    g.fillPath();

    // Far edge at the horizon.
    g.lineStyle(2, PALETTE.gold, TRACK.laneAlpha);
    g.lineBetween(topL, this.horizonY, topR, this.horizonY);

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
  }

  private makeChevron(): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.lineStyle(4, TRACK.chevronColor, 0.7);
    const w = 28;
    const h = 13;
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
    // Chevrons follow the drift near the top, anchored at the bottom.
    const x = Phaser.Math.Linear(this.centerX + this.driftX, this.centerX, ch.t);
    ch.gfx.setPosition(x, y);
    ch.gfx.setScale(scale);
    ch.gfx.setAlpha(0.12 + 0.5 * ch.t);
  }

  /** Advance chevrons, apply Track Drift, and redraw the (drifting) road. */
  update(deltaMs: number, driftX = 0): void {
    this.driftX = driftX;

    const dt = deltaMs / 1000;
    for (const ch of this.chevrons) {
      ch.t += TRACK.chevronSpeed * this.speedMultiplier * this.stageMultiplier * dt;
      if (ch.t >= 1) ch.t -= 1;
      this.positionChevron(ch);
    }

    this.drawRoad();
    this.haloGlow.setX(this.centerX + this.driftX);
    this.haloCore.setX(this.centerX + this.driftX);
    for (const arc of this.tunnelArcs) arc.setX(this.centerX + this.driftX);
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
        .circle(this.centerX + this.driftX, this.horizonY, 18, PALETTE.magnetRing, 0)
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
   * Project a logical (lane, y) to its on-road screen x + depth scale, following
   * the current drift near the horizon. Visual only — never used for collisions.
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
