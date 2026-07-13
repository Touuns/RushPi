import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./gameConfig";
import { TRACK } from "./theme";
import type { ZoneVisual } from "./stages";

/**
 * ZoneDecor (Phase 10D-A): one lightweight decorative pattern at a time, giving
 * each Survival zone an identifiable look beyond the tint. Everything here is
 * procedural (Phaser shapes/particles), PURELY VISUAL (no hitbox, no gameplay),
 * and kept small for mobile: a handful of pooled objects per pattern, cleared
 * and rebuilt on each zone change.
 */
export class ZoneDecor {
  private readonly scene: Phaser.Scene;
  private readonly horizonY = GAME_HEIGHT * TRACK.horizonRatio;

  // Live decor state (cleared on every apply()).
  private objects: Phaser.GameObjects.GameObject[] = [];
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private gfx: Phaser.GameObjects.Graphics | null = null;
  private pattern: ZoneVisual["pattern"] | null = null;
  private visual: ZoneVisual | null = null;

  // Per-pattern animation state.
  private blocks: { rect: Phaser.GameObjects.Rectangle; speed: number }[] = [];
  private gridScroll = 0;
  private boltTimer = 0;
  private boltLife = 0;
  private boltPoints: { x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTextures();
  }

  private ensureTextures(): void {
    if (!this.scene.textures.exists("streak")) {
      const t = this.scene.make.graphics({ x: 0, y: 0 }, false);
      t.fillStyle(0xffffff, 1);
      t.fillRect(0, 0, 3, 18);
      t.generateTexture("streak", 3, 18);
      t.destroy();
    }
    if (!this.scene.textures.exists("confetti")) {
      const t = this.scene.make.graphics({ x: 0, y: 0 }, false);
      t.fillStyle(0xffffff, 1);
      t.fillRect(0, 0, 5, 5);
      t.generateTexture("confetti", 5, 5);
      t.destroy();
    }
  }

  /** Swap to a zone's pattern (destroys the previous one). */
  apply(v: ZoneVisual): void {
    this.clear();
    this.visual = v;
    this.pattern = v.pattern;
    switch (v.pattern) {
      case "rings":
        this.buildRings(v.railColor, 0.3 * v.patternIntensity, 2600);
        break;
      case "blocks":
        this.buildBlocks(v);
        break;
      case "nodes":
        this.buildNodes(v);
        break;
      case "streaks":
        this.buildStreaks(v);
        break;
      case "grid":
        this.gfx = this.scene.add.graphics().setDepth(-5);
        break;
      case "confetti":
        this.buildConfetti(v);
        break;
      case "tunnel":
        this.buildRings(v.laneColor, 0.4 * v.patternIntensity, 3200, false);
        this.buildFog();
        break;
      case "storm":
        this.buildRings(v.railColor, 0.18 * v.patternIntensity, 2200);
        this.gfx = this.scene.add.graphics().setDepth(1);
        break;
    }
  }

  /** Per-frame animation for the patterns that need it. */
  update(deltaMs: number): void {
    if (this.pattern === "blocks") {
      for (const b of this.blocks) {
        b.rect.y += b.speed * (deltaMs / 1000);
        if (b.rect.y > GAME_HEIGHT + 20) b.rect.y = this.horizonY - 20;
      }
    } else if (this.pattern === "grid" && this.gfx && this.visual) {
      this.gridScroll = (this.gridScroll + deltaMs * 0.028) % 90;
      const g = this.gfx;
      g.clear();
      g.lineStyle(1.5, this.visual.railColor, 0.1 * this.visual.patternIntensity + 0.04);
      for (let y = this.horizonY + this.gridScroll; y < GAME_HEIGHT; y += 90) {
        g.lineBetween(0, y, GAME_WIDTH, y);
      }
      g.lineStyle(1.5, this.visual.railColor, 0.08);
      g.lineBetween(28, this.horizonY, 8, GAME_HEIGHT);
      g.lineBetween(GAME_WIDTH - 28, this.horizonY, GAME_WIDTH - 8, GAME_HEIGHT);
    } else if (this.pattern === "storm" && this.gfx && this.visual) {
      this.updateStorm(deltaMs);
    }
  }

  // ---- Builders ------------------------------------------------------------

  /** Expanding rings from the horizon (Genesis calm / Privacy dark / Storm mix). */
  private buildRings(color: number, alpha: number, durationMs: number, additive = true): void {
    for (let i = 0; i < 3; i++) {
      const arc = this.scene.add
        .circle(GAME_WIDTH / 2, this.horizonY, 16, color, 0)
        .setStrokeStyle(2.5, color, alpha)
        .setDepth(1);
      if (additive) arc.setBlendMode(Phaser.BlendModes.ADD);
      this.objects.push(arc);
      this.scene.tweens.add({
        targets: arc,
        scale: 6.5,
        alpha: { from: 1, to: 0 },
        duration: durationMs,
        delay: (i * durationMs) / 3,
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
  }

  /** Heavy block silhouettes drifting down the side margins (Orange Chain). */
  private buildBlocks(v: ZoneVisual): void {
    const count = Math.round(4 + 3 * v.patternIntensity);
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0;
      const x = side ? 10 + Math.random() * 42 : GAME_WIDTH - 10 - Math.random() * 42;
      const y = this.horizonY + Math.random() * (GAME_HEIGHT - this.horizonY);
      const w = 12 + Math.random() * 16;
      const rect = this.scene.add
        .rectangle(x, y, w, w * (0.6 + Math.random() * 0.9), v.laneColor, 0.3)
        .setStrokeStyle(1.5, v.railColor, 0.45)
        .setDepth(-5);
      this.objects.push(rect);
      this.blocks.push({ rect, speed: 20 + Math.random() * 26 });
    }
  }

  /** Connected node mesh in the top margins, gently pulsing (Smart Layer). */
  private buildNodes(v: ZoneVisual): void {
    const g = this.scene.add.graphics().setDepth(-5);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 9; i++) {
      pts.push({
        x: Math.random() * GAME_WIDTH,
        y: 20 + Math.random() * (this.horizonY + 120),
      });
    }
    g.lineStyle(1, v.railColor, 0.22);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (const p of pts) {
      g.fillStyle(v.railColor, 0.55);
      g.fillCircle(p.x, p.y, 2.5);
    }
    this.objects.push(g);
    this.scene.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.45 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Long light trails rushing down (Neon Speednet). */
  private buildStreaks(v: ZoneVisual): void {
    const e = this.scene.add.particles(0, 0, "streak", {
      x: { min: 0, max: GAME_WIDTH },
      y: -20,
      lifespan: 900,
      speedY: { min: 280, max: 460 },
      scaleX: 0.7,
      scaleY: { min: 1, max: 2.2 },
      alpha: { start: 0.32, end: 0 },
      tint: v.particleColors,
      frequency: 130 / Math.max(0.4, v.patternIntensity),
      quantity: 1,
      blendMode: "ADD",
    });
    e.setDepth(-4);
    this.emitters.push(e);
  }

  /** Geometric confetti tumbling down (Meme Circuit). */
  private buildConfetti(v: ZoneVisual): void {
    const e = this.scene.add.particles(0, 0, "confetti", {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 3200,
      speedY: { min: 60, max: 140 },
      speedX: { min: -30, max: 30 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 0.55, end: 0 },
      tint: v.particleColors,
      frequency: 150 / Math.max(0.4, v.patternIntensity),
      quantity: 1,
    });
    e.setDepth(-4);
    this.emitters.push(e);
  }

  /** Subtle dark fog overlay (Privacy Tunnel). Below objects, so collectibles
   *  and hazards stay bright and readable. */
  private buildFog(): void {
    const fog = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x08040f, 0.16)
      .setDepth(2);
    this.objects.push(fog);
  }

  /** Procedural lightning bolts + quick flashes (Chain Storm). */
  private updateStorm(deltaMs: number): void {
    const g = this.gfx!;
    const v = this.visual!;
    this.boltTimer -= deltaMs;
    if (this.boltTimer <= 0 && this.boltLife <= 0) {
      // Spawn a new jagged bolt from near the horizon.
      this.boltTimer = 1200 + Math.random() * 900;
      this.boltLife = 240;
      this.boltPoints = [];
      let x = 40 + Math.random() * (GAME_WIDTH - 80);
      let y = this.horizonY - 30;
      this.boltPoints.push({ x, y });
      const segs = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < segs; i++) {
        x += (Math.random() - 0.5) * 52;
        y += 26 + Math.random() * 20;
        this.boltPoints.push({ x, y });
      }
    }
    if (this.boltLife > 0) {
      this.boltLife -= deltaMs;
      const a = Math.max(0, this.boltLife / 240);
      g.clear();
      g.lineStyle(2.5, 0xffffff, 0.75 * a);
      for (let i = 0; i < this.boltPoints.length - 1; i++) {
        g.lineBetween(
          this.boltPoints[i].x,
          this.boltPoints[i].y,
          this.boltPoints[i + 1].x,
          this.boltPoints[i + 1].y,
        );
      }
      g.lineStyle(5, v.railColor, 0.25 * a);
      for (let i = 0; i < this.boltPoints.length - 1; i++) {
        g.lineBetween(
          this.boltPoints[i].x,
          this.boltPoints[i].y,
          this.boltPoints[i + 1].x,
          this.boltPoints[i + 1].y,
        );
      }
      if (this.boltLife <= 0) g.clear();
    }
  }

  /** Destroy the current pattern's objects (called on zone change / shutdown). */
  clear(): void {
    for (const o of this.objects) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    for (const e of this.emitters) e.destroy();
    this.gfx?.destroy();
    this.objects = [];
    this.emitters = [];
    this.blocks = [];
    this.gfx = null;
    this.pattern = null;
    this.visual = null;
    this.boltLife = 0;
    this.boltTimer = 0;
  }
}
