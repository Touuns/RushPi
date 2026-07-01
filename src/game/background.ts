import Phaser from "phaser";
import { GAME_WIDTH } from "./gameConfig";
import { PALETTE, BG } from "./theme";

/**
 * Light "living" background behind the track: faint mauve/gold energy dots
 * drifting downward (space/tunnel feel). Purely cosmetic. Intensity ramps with
 * the run phase. Deliberately subtle so it never competes with the track.
 */
export class BackgroundFX {
  private readonly scene: Phaser.Scene;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    if (!this.scene.textures.exists("spark")) {
      const tex = this.scene.make.graphics({ x: 0, y: 0 }, false);
      tex.fillStyle(PALETTE.white, 1);
      tex.fillCircle(4, 4, 4);
      tex.generateTexture("spark", 8, 8);
      tex.destroy();
    }

    this.emitter = this.scene.add.particles(0, 0, "spark", {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: -10, max: 0 },
      lifespan: BG.lifespanMs,
      speedY: { min: BG.driftSpeedMin, max: BG.driftSpeedMax },
      speedX: { min: -6, max: 6 },
      scale: { min: 0.18, max: 0.5 },
      alpha: { start: 0.28, end: 0 }, // soft twinkle (fade out over lifespan)
      tint: [PALETTE.violet, PALETTE.gold, PALETTE.orange],
      frequency: BG.baseFrequencyMs,
      quantity: 1,
      blendMode: "ADD",
    });
    this.emitter.setDepth(-10);
  }

  private baseFrequency: number = BG.baseFrequencyMs;
  private intensityScale = 1;

  private applyFrequency(): void {
    // Higher scale = livelier = shorter interval.
    this.emitter.frequency = this.baseFrequency / this.intensityScale;
  }

  /** phase: 0..(PHASES.count-1). More dots later in the run. */
  setPhase(phase: number, maxPhase: number): void {
    const t = maxPhase > 0 ? phase / maxPhase : 0;
    this.baseFrequency = Phaser.Math.Linear(BG.baseFrequencyMs, BG.finalFrequencyMs, t);
    this.applyFrequency();
  }

  /** Per-stage density multiplier (Phase 9E). >1 = livelier, <1 = calmer. */
  setIntensityScale(scale: number): void {
    this.intensityScale = scale > 0 ? scale : 1;
    this.applyFrequency();
  }
}
