import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LANE_COUNT,
  RUN_DURATION_SECONDS,
  PLAYER,
  OBJECTS,
  SCORING,
  HIT,
} from "../gameConfig";
import { PALETTE, GLOW, TRACK } from "../theme";
import { TrackVisuals } from "../track";
import { createSeededRandom, getDailySeed } from "../seededRandom";
import { GameEvents, type GameMode, type GameResult, type HudState } from "../../types";

type FallingType = "energy" | "obstacle";

interface FallingObject {
  container: Phaser.GameObjects.Container;
  type: FallingType;
  lane: number;
  alive: boolean;
}

/**
 * MainScene owns the entire game loop: lanes, player, falling objects, collisions,
 * scoring and the 60s timer. It communicates with React purely through events
 * (HudUpdate during the run, GameOver at the end) — Phaser drives, React displays.
 *
 * All art is drawn procedurally (Graphics/Arc), centralized via theme.ts, so it can
 * later be swapped for real sprites without touching the gameplay logic here.
 */
export default class MainScene extends Phaser.Scene {
  private mode: GameMode = "daily";

  // Lane geometry
  private laneX: number[] = [];
  private currentLane = 1; // start centered

  // Player
  private player!: Phaser.GameObjects.Container;

  // Visual track (perspective road, chevrons, projection) — purely cosmetic.
  private track!: TrackVisuals;

  // Falling objects
  private objects: FallingObject[] = [];
  private spawnAccumulatorMs = 0;

  // Run state
  private elapsedMs = 0;
  private scoreValue = 0;
  private combo = 0;
  private maxCombo = 0;
  private energiesCollected = 0;
  private obstaclesHit = 0;
  private finished = false;

  // Anti-frustration timers
  private invulnerableUntilMs = 0;
  private slowUntilMs = 0;

  // HUD throttling (only emit when displayed values change)
  private lastHud: HudState = { score: -1, timeLeft: -1, combo: -1 };

  // Input
  private pointerDownX: number | null = null;

  // RNG: seeded (identical course for everyone) in Daily mode, random in Training.
  private rng: () => number = Math.random;

  constructor() {
    super({ key: "MainScene" });
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? "daily";
    // Daily Run: deterministic course from the UTC daily seed (same for everyone).
    // Training: ordinary randomness. Seed is fixed at run start.
    this.rng = this.mode === "daily" ? createSeededRandom(getDailySeed()) : Math.random;
    // Reset all state (scenes are reused on replay).
    this.objects = [];
    this.spawnAccumulatorMs = 0;
    this.elapsedMs = 0;
    this.scoreValue = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.energiesCollected = 0;
    this.obstaclesHit = 0;
    this.finished = false;
    this.currentLane = 1;
    this.invulnerableUntilMs = 0;
    this.slowUntilMs = 0;
    this.lastHud = { score: -1, timeLeft: -1, combo: -1 };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);

    this.computeLanes();
    this.track = new TrackVisuals(this, this.laneX);
    this.track.drawStatic();
    this.createPlayer();
    this.createPlayerTrail();
    this.setupInput();

    // Emit an initial HUD frame so React shows full timer immediately.
    this.emitHud(true);
  }

  // ---- Setup helpers -------------------------------------------------------

  private computeLanes(): void {
    const laneWidth = GAME_WIDTH / LANE_COUNT;
    this.laneX = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      this.laneX.push(laneWidth * (i + 0.5));
    }
  }

  /** Light gold particle trail streaming downward from the player (speed cue). */
  private createPlayerTrail(): void {
    // Generate a tiny soft dot texture once (no external assets).
    if (!this.textures.exists("spark")) {
      const tex = this.make.graphics({ x: 0, y: 0 }, false);
      tex.fillStyle(PALETTE.white, 1);
      tex.fillCircle(4, 4, 4);
      tex.generateTexture("spark", 8, 8);
      tex.destroy();
    }
    const emitter = this.add.particles(0, 0, "spark", {
      speedY: { min: 70, max: 130 },
      speedX: { min: -16, max: 16 },
      lifespan: TRACK.trailLifespanMs,
      scale: { start: 0.85, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: PALETTE.gold,
      frequency: TRACK.trailFrequencyMs,
      quantity: 1,
      blendMode: "ADD",
    });
    emitter.setDepth(9);
    emitter.startFollow(this.player, 0, PLAYER.radius * 0.4);
  }

  /**
   * Creates a glowing round orb (outer faint halo + solid core) as a container.
   * Used for the player and for energies — "round = collect".
   */
  private makeOrb(color: number, radius: number): Phaser.GameObjects.Container {
    const halo = this.add.circle(0, 0, radius * GLOW.outerScale, color, GLOW.outerAlpha);
    const core = this.add.circle(0, 0, radius, color, 1);
    core.setStrokeStyle(2, PALETTE.white, 0.85);
    return this.add.container(0, 0, [halo, core]);
  }

  /**
   * Creates an angular hazard shape (diamond) as a container — "spiky = avoid".
   * The sharp silhouette reads as danger in a fraction of a second, distinct from
   * the round energies even before color is processed.
   */
  private makeHazard(color: number, radius: number): Phaser.GameObjects.Container {
    const halo = this.add.circle(0, 0, radius * GLOW.outerScale, color, GLOW.outerAlpha);
    // A square rotated 45° = diamond. Slightly larger so the sharp corners are clear.
    const d = radius * 1.7;
    const core = this.add.rectangle(0, 0, d, d, color, 1);
    core.setStrokeStyle(3, PALETTE.white, 0.9);
    core.setAngle(45);
    // Inner dark mark reinforces the "warning" read.
    const mark = this.add.rectangle(0, 0, d * 0.34, d * 0.34, PALETTE.bg, 0.85);
    mark.setAngle(45);
    return this.add.container(0, 0, [halo, core, mark]);
  }

  private createPlayer(): void {
    this.player = this.makeOrb(PALETTE.player, PLAYER.radius);
    this.player.setPosition(this.laneX[this.currentLane], GAME_HEIGHT * PLAYER.yRatio);
    this.player.setDepth(10);
    // Gentle idle pulse (separate property from the lane-change x tween).
    this.tweens.add({
      targets: this.player,
      scale: 1.06,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private setupInput(): void {
    // Keyboard (desktop testing)
    this.input.keyboard!.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard!.on("keydown-RIGHT", () => this.moveLane(1));
    // A/D as a convenience
    this.input.keyboard!.on("keydown-A", () => this.moveLane(-1));
    this.input.keyboard!.on("keydown-D", () => this.moveLane(1));

    // Touch: swipe left/right, with tap-half as a fallback.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.pointerDownX = p.x;
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.pointerDownX === null) return;
      const dx = p.x - this.pointerDownX;
      const SWIPE_THRESHOLD = 24;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        this.moveLane(dx > 0 ? 1 : -1);
      } else {
        // Treat a tap as "move toward the tapped side".
        this.moveLane(p.x > GAME_WIDTH / 2 ? 1 : -1);
      }
      this.pointerDownX = null;
    });
  }

  // ---- Movement ------------------------------------------------------------

  private moveLane(dir: -1 | 1): void {
    if (this.finished) return;
    const target = Phaser.Math.Clamp(this.currentLane + dir, 0, LANE_COUNT - 1);
    if (target === this.currentLane) return;
    this.currentLane = target;
    this.tweens.add({
      targets: this.player,
      x: this.laneX[this.currentLane],
      duration: PLAYER.laneTweenMs,
      ease: "Quad.easeOut",
    });
  }

  // ---- Spawning ------------------------------------------------------------

  /** Run progress in [0,1] used to ramp difficulty. */
  private progress(): number {
    return Phaser.Math.Clamp(this.elapsedMs / (RUN_DURATION_SECONDS * 1000), 0, 1);
  }

  private currentSpawnIntervalMs(): number {
    const t = this.progress();
    return Phaser.Math.Linear(OBJECTS.baseSpawnIntervalMs, OBJECTS.minSpawnIntervalMs, t);
  }

  private currentFallSpeed(): number {
    const t = this.progress();
    const base = OBJECTS.baseSpeed + OBJECTS.speedRampPerRun * t;
    const slowed = this.time.now < this.slowUntilMs;
    return slowed ? base * HIT.slowFactor : base;
  }

  private spawnObject(): void {
    // Use the seeded RNG (Daily) / Math.random (Training). Two draws per spawn,
    // in a fixed order, so the Daily sequence is identical across all devices.
    const lane = Math.floor(this.rng() * LANE_COUNT);
    const type: FallingType =
      this.rng() < OBJECTS.obstacleChance ? "obstacle" : "energy";
    const container =
      type === "obstacle"
        ? this.makeHazard(PALETTE.obstacle, OBJECTS.radius)
        : this.makeOrb(PALETTE.energy, OBJECTS.radius);
    container.setPosition(this.laneX[lane], -OBJECTS.radius * 2);
    container.setDepth(5); // above the road/chevrons, below the player
    this.objects.push({ container, type, lane, alive: true });
  }

  // ---- Main loop -----------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.finished) return;

    // Animate the visual track (chevrons) — cosmetic only.
    this.track.update(delta);

    this.elapsedMs += delta;

    // Passive survival score.
    this.scoreValue += SCORING.survivalPerSecond * (delta / 1000);

    // Spawning on a difficulty-scaled interval.
    this.spawnAccumulatorMs += delta;
    const interval = this.currentSpawnIntervalMs();
    while (this.spawnAccumulatorMs >= interval) {
      this.spawnAccumulatorMs -= interval;
      this.spawnObject();
    }

    // Move + test objects.
    const speed = this.currentFallSpeed();
    const dy = speed * (delta / 1000);
    const invulnerable = this.time.now < this.invulnerableUntilMs;

    for (const obj of this.objects) {
      if (!obj.alive) continue;
      obj.container.y += dy;

      // Perspective render (cosmetic only): converge toward the vanishing point
      // and scale with depth. Collisions below still use lane + y, never this x.
      const proj = this.track.project(obj.lane, obj.container.y);
      obj.container.x = proj.x;
      obj.container.setScale(proj.scale);

      // Off-screen cleanup.
      if (obj.container.y > GAME_HEIGHT + OBJECTS.radius * 2) {
        obj.alive = false;
        obj.container.destroy();
        continue;
      }

      // Collision only matters near the player row and same lane.
      if (obj.lane !== this.currentLane) continue;
      const dist = Math.abs(obj.container.y - this.player.y);
      if (dist <= PLAYER.radius + OBJECTS.radius) {
        if (obj.type === "energy") {
          this.collectEnergy(obj);
        } else if (!invulnerable) {
          this.hitObstacle(obj);
        }
      }
    }

    // Prune dead objects from the array periodically (cheap).
    if (this.objects.length > 0 && this.objects.length % 8 === 0) {
      this.objects = this.objects.filter((o) => o.alive);
    }

    // Timer / end of run.
    if (this.elapsedMs >= RUN_DURATION_SECONDS * 1000) {
      this.endRun();
      return;
    }

    this.emitHud();
  }

  // ---- Collisions ----------------------------------------------------------

  private comboMultiplier(): number {
    return Math.min(1 + this.combo * SCORING.comboStep, SCORING.comboMaxMultiplier);
  }

  private collectEnergy(obj: FallingObject): void {
    obj.alive = false;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.energiesCollected += 1;
    this.scoreValue += SCORING.energyPoints * this.comboMultiplier();

    // Quick pop feedback then remove.
    this.tweens.add({
      targets: obj.container,
      scale: 1.6,
      alpha: 0,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => obj.container.destroy(),
    });
  }

  private hitObstacle(obj: FallingObject): void {
    obj.alive = false;
    obj.container.destroy();

    // Penalty + combo reset, but the player does NOT die (anti-frustration).
    this.obstaclesHit += 1;
    this.combo = 0;
    this.scoreValue = Math.max(0, this.scoreValue - SCORING.obstaclePenalty);

    // Grant brief invulnerability + a short slow-down so a mistake is recoverable.
    this.invulnerableUntilMs = this.time.now + HIT.invulnerabilityMs;
    this.slowUntilMs = this.time.now + HIT.slowDurationMs;

    // Visual feedback: camera shake + red flash + player blink during i-frames.
    this.cameras.main.shake(140, 0.008);
    this.cameras.main.flash(120, 255, 77, 109);
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: Math.floor(HIT.invulnerabilityMs / 240),
      onComplete: () => this.player.setAlpha(1),
    });
  }

  // ---- HUD / end -----------------------------------------------------------

  private emitHud(force = false): void {
    const score = Math.floor(this.scoreValue);
    const timeLeft = Math.max(
      0,
      Math.ceil(RUN_DURATION_SECONDS - this.elapsedMs / 1000),
    );
    if (
      force ||
      score !== this.lastHud.score ||
      timeLeft !== this.lastHud.timeLeft ||
      this.combo !== this.lastHud.combo
    ) {
      this.lastHud = { score, timeLeft, combo: this.combo };
      this.game.events.emit(GameEvents.HudUpdate, { ...this.lastHud });
    }
  }

  private endRun(): void {
    if (this.finished) return;
    this.finished = true;

    const endBonus =
      this.obstaclesHit <= SCORING.cleanRunMaxHits ? SCORING.cleanRunBonus : 0;
    const finalScore = Math.floor(this.scoreValue) + endBonus;

    // The scene only reports the raw run; persistence/progression is handled by
    // React via storage.recordRun() (keeps gameplay decoupled from storage).
    const result: GameResult = {
      mode: this.mode,
      score: finalScore,
      energiesCollected: this.energiesCollected,
      maxCombo: this.maxCombo,
      obstaclesHit: this.obstaclesHit,
      endBonus,
    };

    // Final HUD push (so the on-canvas score matches the result) then notify React.
    this.lastHud = { score: finalScore, timeLeft: 0, combo: this.combo };
    this.game.events.emit(GameEvents.HudUpdate, { ...this.lastHud });
    this.game.events.emit(GameEvents.GameOver, result);
  }
}
