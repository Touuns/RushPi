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
  CONTROLS,
  SURVIVAL,
} from "../gameConfig";
import { PALETTE, GLOW, TRACK, PHASES, POWERUPS, EVENTS } from "../theme";
import { TrackVisuals } from "../track";
import { BackgroundFX } from "../background";
import { buildEventSchedule, type EventSlot } from "../events";
import { STAGES, stageIndexForTime, type Stage } from "../stages";
import { getCampaignLevel, computeStars, type CampaignLevel } from "../campaign";
import { TrackDrift } from "../trackDrift";
import { TrackGate } from "../zoneTransition";
import { ZoneDecor } from "../zoneDecor";
import { createSeededRandom, getDailySeed } from "../seededRandom";
import {
  GameEvents,
  type GameEventKind,
  type GameMode,
  type GameResult,
  type HudState,
  type PowerupKind,
} from "../../types";

interface EnergyExtra {
  timeMs: number;
  lane: number;
  spawned: boolean;
}

type FallingType = "energy" | "obstacle" | "life" | PowerupKind;

interface FallingObject {
  container: Phaser.GameObjects.Container;
  type: FallingType;
  lane: number;
  alive: boolean;
}

interface PowerupSlot {
  timeMs: number;
  kind: PowerupKind;
  lane: number;
  spawned: boolean;
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
  private bg!: BackgroundFX;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Player visual states (cosmetic; hitbox unchanged).
  private shieldRing!: Phaser.GameObjects.Arc;
  private magnetAura!: Phaser.GameObjects.Arc;
  private currentPhase = -1;

  // Power-ups (deterministic schedule on a SEPARATE seeded stream so the
  // obstacle/energy course is byte-identical to before).
  private powerupRng: () => number = Math.random;
  private powerupSchedule: PowerupSlot[] = [];
  private shieldCharges = 0;
  private shieldUntilMs = 0;
  private magnetUntilMs = 0;

  // Dynamic events (deterministic, separate seeded stream).
  private eventSchedule: EventSlot[] = [];
  private energyExtras: EnergyExtra[] = [];
  private activeEventKind: GameEventKind | null = null;
  private eventSpeedActive = false;
  private vignette!: Phaser.GameObjects.Rectangle;

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

  // Run lifecycle (Phase 10B-P2): "running" → (Daily only) "finishing" during
  // the FINISH-gate sequence → endRun(). Score/collisions/spawns/lane changes
  // are all frozen while finishing; the sequence is purely visual.
  private runState: "running" | "finishing" = "running";
  private finishGate: TrackGate | null = null;
  private finishSpeedFactor = 1;

  // Survival Mode (Phase 9B).
  private lives = 0;
  private livesLost = 0;

  // Survival charge + life recovery (Phase 9C).
  private chargeLevel = 1;
  private energyForChargeCount = 0;
  private energyForLifeGauge = 0;
  private nextLifeOrbMs = Number.POSITIVE_INFINITY;
  private livesRecovered = 0;
  private chargeAbsorbs = 0;
  private lifeOrbsCollected = 0;
  private highestChargeLevel = 1;
  private chargeAura!: Phaser.GameObjects.Arc;

  // Survival stages (Phase 9D) + Track Drift / stage personality (Phase 9E).
  private currentStageIndex = -1;
  private stageTint!: Phaser.GameObjects.Rectangle;
  private drift = new TrackDrift();
  private driftAmplitudePx = 0;
  private stageObstacleScale = 1;

  // Survival zone gates + per-zone identity (Phase 10D-A). Visual only.
  private zoneGate: TrackGate | null = null;
  private zoneDecor: ZoneDecor | null = null;

  // Anti-frustration timers
  private invulnerableUntilMs = 0;
  private slowUntilMs = 0;

  // HUD throttling (only emit when displayed values change)
  private lastHud: HudState = {
    score: -1,
    timeLeft: -1,
    combo: -1,
    shieldSecs: -1,
    magnetSecs: -1,
    event: null,
    lives: -1,
    charge: -1,
    stage: "",
    progress: -1,
  };

  // Input. `pointerDownX` = where the press started (for tap/swipe on release).
  // `dragRefX` = moving reference for continuous drag/slide; `dragMoved` marks
  // that the drag already changed lane(s) so release doesn't double-fire.
  private pointerDownX: number | null = null;
  private dragRefX: number | null = null;
  private dragMoved = false;

  // RNG: seeded (identical course for everyone) in Daily mode, random in Training.
  private rng: () => number = Math.random;

  // Campaign (Phase 9F): fixed-finish level. 0/null outside campaign.
  private campaignLevelId = 0;
  private campaignLevel: CampaignLevel | null = null;
  private campaignTargetMs = 0;

  constructor() {
    super({ key: "MainScene" });
  }

  /** Survival + Campaign share the same engine (lives, charge, Life Orbs, absorb). */
  private survivalLike(): boolean {
    return this.mode === "survival" || this.mode === "campaign";
  }

  init(data: { mode?: GameMode; campaignLevelId?: number }): void {
    this.mode = data.mode ?? "daily";
    this.campaignLevelId = data.campaignLevelId ?? 0;
    this.campaignLevel =
      this.mode === "campaign" ? getCampaignLevel(this.campaignLevelId) ?? null : null;
    this.campaignTargetMs = this.campaignLevel
      ? this.campaignLevel.targetDurationSecs * 1000
      : 0;
    // Daily Run: deterministic course from the UTC daily seed (same for everyone).
    // Training: ordinary randomness. Seed is fixed at run start.
    this.rng = this.mode === "daily" ? createSeededRandom(getDailySeed()) : Math.random;
    // Power-ups use a SEPARATE seeded stream so the main course is unaffected.
    // Daily → deterministic (same for everyone); Training → varies per run.
    this.powerupRng =
      this.mode === "daily"
        ? createSeededRandom(`${getDailySeed()}:pups`)
        : createSeededRandom(`training:${Date.now()}:${Math.random()}`);
    this.powerupSchedule = this.buildPowerupSchedule();

    // Dynamic events: yet another SEPARATE seeded stream (course + power-ups
    // stay byte-identical). Daily → deterministic; Training → varies per run.
    const eventsRng =
      this.mode === "daily"
        ? createSeededRandom(`${getDailySeed()}:events`)
        : createSeededRandom(`training-events:${Date.now()}:${Math.random()}`);
    this.eventSchedule = buildEventSchedule(
      eventsRng,
      RUN_DURATION_SECONDS * 1000,
      LANE_COUNT,
    );
    this.energyExtras = this.eventSchedule
      .flatMap((s) => s.extraEnergies)
      .map((e) => ({ timeMs: e.timeMs, lane: e.lane, spawned: false }));
    this.activeEventKind = null;
    this.eventSpeedActive = false;

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
    this.shieldCharges = 0;
    this.shieldUntilMs = 0;
    this.magnetUntilMs = 0;
    this.currentPhase = -1;
    this.lives = this.survivalLike() ? SURVIVAL.startLives : 0;
    this.livesLost = 0;
    this.chargeLevel = 1;
    this.energyForChargeCount = 0;
    this.energyForLifeGauge = 0;
    this.nextLifeOrbMs = this.survivalLike()
      ? SURVIVAL.lifeOrbMinTimeMs
      : Number.POSITIVE_INFINITY;
    this.livesRecovered = 0;
    this.chargeAbsorbs = 0;
    this.lifeOrbsCollected = 0;
    this.highestChargeLevel = 1;
    this.currentStageIndex = -1;
    this.drift.reset();
    this.driftAmplitudePx = 0;
    this.stageObstacleScale = 1;
    this.runState = "running";
    this.finishGate = null;
    this.finishSpeedFactor = 1;
    this.zoneGate = null;
    this.lastHud = {
      score: -1,
      timeLeft: -1,
      combo: -1,
      shieldSecs: -1,
      magnetSecs: -1,
      event: null,
      lives: -1,
      charge: -1,
      stage: "",
      progress: -1,
    };
  }

  /**
   * Deterministic power-up schedule from the dedicated seeded stream.
   * 1–2 shields (>=20s) and 1–2 magnets (>=25s), never after maxTimeMs.
   * Same times + lanes for every Daily player.
   */
  private buildPowerupSchedule(): PowerupSlot[] {
    const slots: PowerupSlot[] = [];
    const pick = (kind: PowerupKind, minMs: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const span = POWERUPS.maxTimeMs - minMs;
        const timeMs = Math.round(minMs + this.powerupRng() * span);
        const lane = Math.floor(this.powerupRng() * LANE_COUNT);
        slots.push({ timeMs, kind, lane, spawned: false });
      }
    };
    const shieldCount = 1 + (this.powerupRng() < 0.5 ? 1 : 0);
    const magnetCount = 1 + (this.powerupRng() < 0.5 ? 1 : 0);
    pick("shield", POWERUPS.shield.minTimeMs, shieldCount);
    pick("magnet", POWERUPS.magnet.minTimeMs, magnetCount);
    slots.sort((a, b) => a.timeMs - b.timeMs);
    return slots;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.bg);

    this.computeLanes();
    this.bg = new BackgroundFX(this);
    this.bg.create();
    this.track = new TrackVisuals(this, this.laneX);
    this.track.drawStatic();
    if (this.mode === "survival") this.zoneDecor = new ZoneDecor(this);
    this.createPlayer();
    this.createPlayerTrail();
    this.setupInput();

    // Persistent per-stage ambiance tint (Survival, Phase 9D). Normal blend +
    // low alpha so it shifts the mood without hurting readability.
    this.stageTint = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, PALETTE.violet, 1)
      .setDepth(7)
      .setAlpha(0);

    // Full-screen additive tint used by events (subtle; toggled via alpha).
    this.vignette = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, PALETTE.gold, 1)
      .setDepth(8)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Campaign: apply this level's fixed zone ambiance + intro banner.
    if (this.mode === "campaign" && this.campaignLevel) {
      const lvl = this.campaignLevel;
      this.stageTint.setFillStyle(lvl.tint, 1).setAlpha(lvl.tintAlpha);
      this.track.setStageMultiplier(lvl.chevronMultiplier);
      this.driftAmplitudePx = lvl.driftMaxX * GAME_WIDTH;
      this.bg.setIntensityScale(lvl.bgBoost);
      this.showBanner(
        `Level ${lvl.id} — ${lvl.name}\n` +
          `★ ${lvl.stars[0].label}\n` +
          `★★ ${lvl.stars[1].label}\n` +
          `★★★ ${lvl.stars[2].label}`,
        18,
      );
    }

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
    this.trailEmitter = this.add.particles(0, 0, "spark", {
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
    this.trailEmitter.setDepth(9);
    this.trailEmitter.startFollow(this.player, 0, PLAYER.radius * 0.4);
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

    // Shield ring + magnet aura as children (auto-follow the player). Hidden until
    // the matching power-up is active. They do NOT change the hitbox.
    this.shieldRing = this.add
      .circle(0, 0, PLAYER.radius + 9, PALETTE.shieldRing, 0)
      .setStrokeStyle(3, PALETTE.shield, 0.95)
      .setVisible(false);
    this.magnetAura = this.add
      .circle(0, 0, PLAYER.radius + 6, PALETTE.magnetRing, 0)
      .setStrokeStyle(2, PALETTE.magnetRing, 0.8)
      .setVisible(false);
    // Survival charge aura (Phase 9C): gold ring that intensifies with charge.
    this.chargeAura = this.add
      .circle(0, 0, PLAYER.radius + 5, PALETTE.gold, 0)
      .setStrokeStyle(3, PALETTE.gold, 0.9)
      .setVisible(false);
    this.player.add([this.chargeAura, this.shieldRing, this.magnetAura]);

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

    // Touch: three complementary gestures.
    //  - drag/slide: hold the finger and slide; each ~40px of horizontal travel
    //    steps one lane (snaps to lanes, never follows the finger pixel-by-pixel).
    //  - swipe: a quick flick handled on release (if no drag step fired).
    //  - tap: a tap on the left/right half moves toward that side.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.pointerDownX = p.x;
      this.dragRefX = p.x;
      this.dragMoved = false;
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragRefX === null || !p.isDown) return;
      // Only horizontal travel matters, so vertical jitter never changes lanes.
      let dx = p.x - this.dragRefX;
      while (Math.abs(dx) >= CONTROLS.dragLaneThresholdPx) {
        const dir = dx > 0 ? 1 : -1;
        this.moveLane(dir);
        this.dragMoved = true;
        // Advance the reference so a held finger can slide across all lanes.
        this.dragRefX += dir * CONTROLS.dragLaneThresholdPx;
        dx = p.x - this.dragRefX;
      }
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const startX = this.pointerDownX;
      const draggedLanes = this.dragMoved;
      this.pointerDownX = null;
      this.dragRefX = null;
      this.dragMoved = false;
      if (startX === null || draggedLanes) return; // drag already handled it

      const dx = p.x - startX;
      if (Math.abs(dx) >= CONTROLS.swipeThresholdPx) {
        this.moveLane(dx > 0 ? 1 : -1); // quick swipe
      } else {
        this.moveLane(p.x > GAME_WIDTH / 2 ? 1 : -1); // tap toward side
      }
    });
  }

  // ---- Movement ------------------------------------------------------------

  private moveLane(dir: -1 | 1): void {
    if (this.finished || this.runState !== "running") return;
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

  /**
   * Difficulty progress in [0,1]. Time Attack/Training ramp over the 60s run
   * (unchanged). Survival ramps more slowly (over SURVIVAL.rampToHardMs) then
   * holds at max, so it starts gentler and never becomes impossible.
   */
  private progress(): number {
    const span =
      this.survivalLike() ? SURVIVAL.rampToHardMs : RUN_DURATION_SECONDS * 1000;
    return Phaser.Math.Clamp(this.elapsedMs / span, 0, 1);
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

  /** Spawn a power-up orb at the top of `lane` (falls + projects like any object). */
  private spawnPowerup(kind: PowerupKind, lane: number): void {
    const container =
      kind === "shield" ? this.makeShieldOrb() : this.makeMagnetOrb();
    container.setPosition(this.laneX[lane], -OBJECTS.radius * 2);
    container.setDepth(6);
    this.objects.push({ container, type: kind, lane, alive: true });
  }

  /** Cyan shield orb with a protective ring — clearly not energy/obstacle. */
  private makeShieldOrb(): Phaser.GameObjects.Container {
    const r = OBJECTS.radius;
    const halo = this.add.circle(0, 0, r * GLOW.outerScale, PALETTE.shield, GLOW.outerAlpha);
    const ring = this.add
      .circle(0, 0, r + 4, PALETTE.shieldRing, 0)
      .setStrokeStyle(3, PALETTE.shieldRing, 0.9);
    const core = this.add.circle(0, 0, r * 0.7, PALETTE.shield, 1);
    core.setStrokeStyle(2, PALETTE.white, 0.9);
    return this.add.container(0, 0, [halo, ring, core]);
  }

  /** Orange magnet orb with a violet ring + small orbiting dots. */
  private makeMagnetOrb(): Phaser.GameObjects.Container {
    const r = OBJECTS.radius;
    const halo = this.add.circle(0, 0, r * GLOW.outerScale, PALETTE.magnet, GLOW.outerAlpha);
    const ring = this.add
      .circle(0, 0, r + 4, PALETTE.magnetRing, 0)
      .setStrokeStyle(2, PALETTE.magnetRing, 0.85);
    const core = this.add.circle(0, 0, r * 0.7, PALETTE.magnet, 1);
    core.setStrokeStyle(2, PALETTE.white, 0.9);
    const dotA = this.add.circle(r * 0.9, 0, 2.4, PALETTE.magnetRing, 1);
    const dotB = this.add.circle(-r * 0.9, 0, 2.4, PALETTE.magnetRing, 1);
    return this.add.container(0, 0, [halo, ring, core, dotA, dotB]);
  }

  // ---- Main loop -----------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.finished) return;
    if (this.runState === "finishing") {
      this.updateFinishing(delta);
      return;
    }

    // Track Drift (Survival only, visual) + animate the track — cosmetic only.
    const driftX = this.survivalLike()
      ? this.drift.update(this.elapsedMs, delta, this.driftAmplitudePx)
      : 0;
    this.track.update(delta, driftX);
    // Survival zone checkpoint gate + decorative zone pattern (visual only).
    this.zoneGate?.update(delta);
    this.zoneDecor?.update(delta);

    this.elapsedMs += delta;

    // Visual phase + deterministic power-up spawns + dynamic events.
    this.updatePhase();
    this.updateStage();
    this.spawnDuePowerups();
    this.updateEvents();
    this.spawnDueEnergyExtras();
    this.spawnDueLifeOrb();
    const now = this.time.now;
    const shieldActive = this.shieldCharges > 0 && now < this.shieldUntilMs;
    const magnetActive = now < this.magnetUntilMs;

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
    const invulnerable = now < this.invulnerableUntilMs;
    const radii = PLAYER.radius + OBJECTS.radius;

    for (const obj of this.objects) {
      if (!obj.alive) continue;
      obj.container.y += dy;

      const proj = this.track.project(obj.lane, obj.container.y);
      const laneDiff = Math.abs(obj.lane - this.currentLane);

      // Magnet (cosmetic bend): nearby energies curve toward the player as they
      // approach. Does not move obstacles. Collision reach is widened below.
      if (
        magnetActive &&
        obj.type === "energy" &&
        laneDiff <= POWERUPS.magnet.laneReach &&
        obj.container.y > this.player.y - POWERUPS.magnet.rangePx
      ) {
        const pf = Phaser.Math.Clamp(
          (obj.container.y - (this.player.y - POWERUPS.magnet.rangePx)) /
            POWERUPS.magnet.rangePx,
          0,
          1,
        );
        obj.container.x = Phaser.Math.Linear(proj.x, this.player.x, pf * 0.92);
      } else {
        obj.container.x = proj.x;
      }
      // Per-stage obstacle heft (visual only; hitbox uses fixed radii).
      const visualScale =
        this.survivalLike() && obj.type === "obstacle"
          ? proj.scale * this.stageObstacleScale
          : proj.scale;
      obj.container.setScale(visualScale);

      // Off-screen cleanup.
      if (obj.container.y > GAME_HEIGHT + OBJECTS.radius * 2) {
        obj.alive = false;
        obj.container.destroy();
        continue;
      }

      // ---- Collision. Base rule (unchanged): same lane + within radii. ----
      const dyAbs = Math.abs(obj.container.y - this.player.y);
      const sameLane = obj.lane === this.currentLane;

      if (obj.type === "energy") {
        const magnetReachable = magnetActive && laneDiff <= POWERUPS.magnet.laneReach;
        if (
          (sameLane && dyAbs <= radii) ||
          (magnetReachable && dyAbs <= radii + POWERUPS.magnet.collectReachPx)
        ) {
          this.collectEnergy(obj);
        }
      } else if (obj.type === "obstacle") {
        if (sameLane && dyAbs <= radii) {
          if (shieldActive) {
            this.absorbWithShield(obj);
          } else if (
            this.survivalLike() &&
            this.chargeLevel >= SURVIVAL.chargeMaxLevel
          ) {
            this.chargeAbsorb(obj); // max charge tanks the hit (Survival/Campaign)
          } else if (!invulnerable) {
            this.hitObstacle(obj);
          }
        }
      } else if (obj.type === "life") {
        if (sameLane && dyAbs <= radii) this.collectLife(obj);
      } else if (sameLane && dyAbs <= radii) {
        this.collectPowerup(obj); // shield / magnet pickup
      }
    }

    // Player ring states + trail intensity (handles power-up expiry).
    this.updatePlayerStates();

    // Prune dead objects from the array periodically (cheap).
    if (this.objects.length > 0 && this.objects.length % 8 === 0) {
      this.objects = this.objects.filter((o) => o.alive);
    }

    // End of run per mode: Survival = 0 lives or safety cap; Campaign = 0 lives
    // (fail) or target duration reached (finish); others = 60s.
    if (this.mode === "survival") {
      if (this.lives <= 0 || this.elapsedMs >= SURVIVAL.maxRunMs) {
        this.endRun();
        return;
      }
    } else if (this.mode === "campaign") {
      if (this.lives <= 0 || this.elapsedMs >= this.campaignTargetMs) {
        this.endRun();
        return;
      }
    } else if (this.elapsedMs >= RUN_DURATION_SECONDS * 1000) {
      // Daily gets the arcade finish sequence; Training keeps the instant end.
      if (this.mode === "daily") this.startFinishSequence();
      else this.endRun();
      return;
    }

    this.emitHud();
  }

  // ---- Daily finish sequence (Phase 10B-P2) --------------------------------

  /**
   * Freeze the run exactly at 60s (score, spawns, collisions, lane changes) and
   * play a ~1.3s FINISH-gate flythrough before emitting GameOver. Visual only:
   * the ranked score is byte-identical to the value at 0s remaining.
   */
  private startFinishSequence(): void {
    if (this.runState !== "running" || this.finished) return;
    this.runState = "finishing";
    this.elapsedMs = RUN_DURATION_SECONDS * 1000; // exact freeze point
    this.emitHud(true); // HUD shows 0s + the final frozen score
    this.finishGate = new TrackGate(this, this.track, {
      color: PALETTE.gold,
      label: "FINISH",
      durationMs: 1300,
      onCross: () => {
        this.cameras.main.flash(160, 255, 209, 102);
        this.showBanner("FINISH!");
        this.time.delayedCall(500, () => this.endRun());
      },
    });
  }

  /** Finishing-phase frame: coast visuals only — no score, no collisions. */
  private updateFinishing(delta: number): void {
    this.track.update(delta, 0);
    // Ease the visual speed down while the gate approaches.
    this.finishSpeedFactor = Math.max(0.2, this.finishSpeedFactor - delta / 900);
    const dy = this.currentFallSpeed() * this.finishSpeedFactor * (delta / 1000);
    for (const obj of this.objects) {
      if (!obj.alive) continue;
      obj.container.y += dy;
      const proj = this.track.project(obj.lane, obj.container.y);
      obj.container.x = proj.x;
      obj.container.setScale(proj.scale);
      if (obj.container.y > GAME_HEIGHT + OBJECTS.radius * 2) {
        obj.alive = false;
        obj.container.destroy();
      }
    }
    this.finishGate?.update(delta);
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

    // Survival/Campaign: charge the Pi orb and fill the life-recovery gauge.
    if (this.survivalLike()) {
      this.energyForChargeCount += 1;
      if (this.energyForChargeCount >= SURVIVAL.energyPerChargeLevel) {
        this.energyForChargeCount = 0;
        if (this.chargeLevel < SURVIVAL.chargeMaxLevel) {
          this.chargeLevel += 1;
          this.highestChargeLevel = Math.max(this.highestChargeLevel, this.chargeLevel);
        }
      }
      if (this.lives < SURVIVAL.maxLives) {
        this.energyForLifeGauge += 1;
        if (this.energyForLifeGauge >= SURVIVAL.energyForLife) {
          this.energyForLifeGauge = 0;
          this.lives += 1;
          this.livesRecovered += 1;
          this.floatText("+1 Life", 0x34d399);
        }
      } else {
        this.energyForLifeGauge = 0; // never bank lives above the cap
      }
    }

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

    this.obstaclesHit += 1;
    this.combo = 0;
    if (this.survivalLike()) {
      // Survival/Campaign: a hit costs a life (game over at 0, handled in update()).
      this.lives -= 1;
      this.livesLost += 1;
    } else {
      // Time Attack/Training: score penalty, but the player never dies.
      this.scoreValue = Math.max(0, this.scoreValue - SCORING.obstaclePenalty);
    }

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

  // ---- Phases / power-ups --------------------------------------------------

  /** Cosmetic visual phase (0..count-1). Drives background liveliness only. */
  private updatePhase(): void {
    const phase = Math.min(
      PHASES.count - 1,
      Math.floor(this.elapsedMs / PHASES.durationMs),
    );
    if (phase === this.currentPhase) return;
    this.currentPhase = phase;
    this.bg.setPhase(phase, PHASES.count - 1);
  }

  // ---- Survival stages (Phase 9D) -----------------------------------------

  /**
   * Advance the Survival zone by survived time. Zone 1 applies instantly with a
   * short intro; later zones spawn a checkpoint gate that travels down the
   * track — the new theme and the "ZONE COMPLETE" banners land when the player
   * crosses it. Thresholds, score, lives and controls are untouched; gameplay
   * never pauses.
   */
  private updateStage(): void {
    if (this.mode !== "survival") return;
    const idx = stageIndexForTime(this.elapsedMs);
    if (idx === this.currentStageIndex) return;
    const prev = this.currentStageIndex;
    this.currentStageIndex = idx;
    const stage = STAGES[idx];

    if (prev < 0) {
      // Run start: no "complete" banner, just the Zone 1 intro.
      this.applyZoneVisuals(stage);
      this.showBanner(`ZONE ${stage.id} — ${stage.name.toUpperCase()}`, 20);
      return;
    }

    const prevStage = STAGES[prev];
    this.zoneGate?.destroy();
    this.zoneGate = new TrackGate(this, this.track, {
      color: stage.visual.gateColor,
      durationMs: 1300,
      onCross: () => {
        this.zoneGate = null;
        this.applyZoneVisuals(stage);
        this.showBanner(`ZONE ${prevStage.id} COMPLETE`, 20);
        this.time.delayedCall(1000, () => {
          if (!this.finished) {
            this.showBanner(`ZONE ${stage.id} — ${stage.name.toUpperCase()}`, 20);
          }
        });
      },
    });
  }

  /** Apply a zone's full look: ambiance + Phase 10D-A identity. Visual only. */
  private applyZoneVisuals(stage: Stage): void {
    this.stageTint.setFillStyle(stage.tint, 1);
    this.tweens.add({ targets: this.stageTint, alpha: stage.tintAlpha, duration: 500 });
    this.track.setStageMultiplier(stage.chevronMultiplier);
    this.driftAmplitudePx = stage.driftMaxX * GAME_WIDTH;
    this.stageObstacleScale = stage.obstacleVisualScale;
    this.bg.setIntensityScale(stage.bgBoost);
    this.track.applyZoneVisuals(stage.visual);
    this.bg.setPalette(stage.visual.particleColors);
    this.zoneDecor?.apply(stage.visual);
  }

  /** Brief, non-blocking "Stage N — Name" banner. */
  private showBanner(text: string, fontSize = 24): void {
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, text, {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: `${fontSize}px`,
        fontStyle: "bold",
        color: "#ffd166",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(13)
      .setAlpha(0)
      .setScale(0.8);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 900,
      onComplete: () => banner.destroy(),
    });
  }

  private spawnDuePowerups(): void {
    for (const slot of this.powerupSchedule) {
      if (!slot.spawned && this.elapsedMs >= slot.timeMs) {
        slot.spawned = true;
        this.spawnPowerup(slot.kind, slot.lane);
      }
    }
  }

  // ---- Dynamic events (Phase 8B) ------------------------------------------

  private updateEvents(): void {
    const slot = this.eventSchedule.find(
      (s) => this.elapsedMs >= s.startMs && this.elapsedMs < s.endMs,
    );
    const kind = slot ? slot.kind : null;
    if (kind !== this.activeEventKind) {
      this.onEventChange(this.activeEventKind, kind);
      this.activeEventKind = kind;
    }
  }

  private onEventChange(prev: GameEventKind | null, next: GameEventKind | null): void {
    // Clear the previous event's effects.
    if (prev === "speed") {
      this.track.setSpeedBoost(false);
      this.eventSpeedActive = false;
    } else if (prev === "tunnel") {
      this.track.stopTunnel(this);
    }

    // Apply the next event's effects (all cosmetic except Energy's bonus orbs).
    switch (next) {
      case "speed":
        this.track.setSpeedBoost(true);
        this.eventSpeedActive = true;
        this.setVignette(EVENTS.kinds.speed.color);
        break;
      case "energy":
        this.setVignette(EVENTS.kinds.energy.color);
        break;
      case "danger":
        this.setVignette(EVENTS.kinds.danger.color);
        break;
      case "tunnel":
        this.track.startTunnel(this);
        this.setVignette(EVENTS.kinds.tunnel.color);
        break;
      case null:
        this.setVignette(null);
        break;
    }
  }

  private setVignette(color: number | null): void {
    if (color === null) {
      this.tweens.add({ targets: this.vignette, alpha: 0, duration: 400 });
      return;
    }
    this.vignette.setFillStyle(color, 1);
    this.tweens.add({
      targets: this.vignette,
      alpha: EVENTS.vignetteAlpha,
      duration: 400,
    });
  }

  /** Deterministic BONUS energies during an Energy Zone (separate from base spawns). */
  private spawnDueEnergyExtras(): void {
    for (const e of this.energyExtras) {
      if (!e.spawned && this.elapsedMs >= e.timeMs) {
        e.spawned = true;
        this.spawnEnergyExtra(e.lane);
      }
    }
  }

  private spawnEnergyExtra(lane: number): void {
    const c = this.makeOrb(PALETTE.energy, OBJECTS.radius);
    c.setPosition(this.laneX[lane], -OBJECTS.radius * 2);
    c.setDepth(5);
    this.objects.push({ container: c, type: "energy", lane, alive: true });
  }

  /** Toggle the player's rings and tune the trail (phase + high combo). */
  private updatePlayerStates(): void {
    const now = this.time.now;
    this.shieldRing.setVisible(this.shieldCharges > 0 && now < this.shieldUntilMs);
    this.magnetAura.setVisible(now < this.magnetUntilMs);

    const t = this.currentPhase / (PHASES.count - 1);
    let freq = Phaser.Math.Linear(TRACK.trailFrequencyMs, TRACK.trailFrequencyMs * 0.55, t);
    if (this.combo >= 10) freq *= 0.7; // denser trail at high combo
    if (this.eventSpeedActive) freq *= 0.7; // and during a Speed Zone

    // Survival/Campaign charge visuals (Phase 9C): aura + denser trail with charge.
    if (this.survivalLike()) {
      const lvl = this.chargeLevel; // 1..6
      // Aura appears from level 3, brighter/wider with charge; strong at level 6.
      if (lvl >= 3) {
        const k = (lvl - 3) / (SURVIVAL.chargeMaxLevel - 3); // 0..1 over lvls 3..6
        this.chargeAura.setVisible(true);
        this.chargeAura.setStrokeStyle(3, PALETTE.gold, 0.4 + 0.5 * k);
        this.chargeAura.setScale(1 + 0.35 * k);
      } else {
        this.chargeAura.setVisible(false);
      }
      // Trail intensifies with charge (levels 1..6 → up to ~0.65x interval).
      freq *= 1 - (lvl - 1) * 0.07;
    } else {
      this.chargeAura.setVisible(false);
    }

    this.trailEmitter.frequency = freq;
  }

  private collectPowerup(obj: FallingObject): void {
    obj.alive = false;
    const now = this.time.now;
    if (obj.type === "shield") {
      this.shieldCharges = 1;
      this.shieldUntilMs = now + POWERUPS.shield.durationMs;
    } else {
      this.magnetUntilMs = now + POWERUPS.magnet.durationMs;
    }
    // No score change — power-ups grant no points (fair for the Daily).
    this.tweens.add({
      targets: obj.container,
      scale: 1.7,
      alpha: 0,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => obj.container.destroy(),
    });
  }

  /** Shield absorbs one obstacle: no penalty, combo preserved, ring breaks. */
  private absorbWithShield(obj: FallingObject): void {
    obj.alive = false;
    obj.container.destroy();
    this.shieldCharges = 0;
    this.shieldUntilMs = 0;
    // Brief i-frames so the same frame can't double-trigger.
    this.invulnerableUntilMs = this.time.now + HIT.invulnerabilityMs;

    // Break feedback: cyan flash + expanding ring burst (no red, no shake).
    this.cameras.main.flash(110, 56, 189, 248);
    const burst = this.add
      .circle(this.player.x, this.player.y, PLAYER.radius + 9, PALETTE.shieldRing, 0)
      .setStrokeStyle(3, PALETTE.shield, 0.9)
      .setDepth(11);
    this.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  // ---- Survival: life orb + charge absorb (Phase 9C) ----------------------

  /** Rare Life Orb spawns (Survival only): first at minTime, then on a cooldown. */
  private spawnDueLifeOrb(): void {
    if (!this.survivalLike() || this.elapsedMs < this.nextLifeOrbMs) return;
    this.nextLifeOrbMs = this.elapsedMs + SURVIVAL.lifeOrbCooldownMs;
    const lane = Math.floor(Math.random() * LANE_COUNT); // Survival isn't seeded
    const container = this.makeLifeOrb();
    container.setPosition(this.laneX[lane], -OBJECTS.radius * 2);
    container.setDepth(6);
    this.objects.push({ container, type: "life", lane, alive: true });
  }

  /** Green life orb with a white "+" — distinct from energy/shield/magnet. */
  private makeLifeOrb(): Phaser.GameObjects.Container {
    const r = OBJECTS.radius;
    const halo = this.add.circle(0, 0, r * GLOW.outerScale, PALETTE.life, GLOW.outerAlpha);
    const core = this.add.circle(0, 0, r * 0.75, PALETTE.life, 1);
    core.setStrokeStyle(2, PALETTE.white, 0.9);
    const barV = this.add.rectangle(0, 0, 4, r * 0.9, PALETTE.white, 0.95);
    const barH = this.add.rectangle(0, 0, r * 0.9, 4, PALETTE.white, 0.95);
    return this.add.container(0, 0, [halo, core, barV, barH]);
  }

  private collectLife(obj: FallingObject): void {
    obj.alive = false;
    this.lifeOrbsCollected += 1;
    if (this.lives < SURVIVAL.maxLives) {
      this.lives += 1;
      this.livesRecovered += 1;
      this.floatText("+1 Life", PALETTE.life);
    } else if (this.chargeLevel < SURVIVAL.chargeMaxLevel) {
      // Already full lives → small bonus: +1 charge level.
      this.chargeLevel += 1;
      this.highestChargeLevel = Math.max(this.highestChargeLevel, this.chargeLevel);
      this.floatText("+Charge", PALETTE.gold);
    } else {
      this.floatText("+", PALETTE.life);
    }
    this.tweens.add({
      targets: obj.container,
      scale: 1.7,
      alpha: 0,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => obj.container.destroy(),
    });
  }

  /** Max-charge orb tanks a hit (Survival): no life lost, charge drops, combo kept. */
  private chargeAbsorb(obj: FallingObject): void {
    obj.alive = false;
    obj.container.destroy();
    this.chargeLevel = SURVIVAL.chargeAbsorbDropToLevel;
    this.chargeAbsorbs += 1;
    this.invulnerableUntilMs = this.time.now + HIT.invulnerabilityMs;

    // Discharge feedback: gold burst + message (no red, no life lost).
    this.cameras.main.flash(110, 255, 209, 102);
    const burst = this.add
      .circle(this.player.x, this.player.y, PLAYER.radius + 8, PALETTE.gold, 0)
      .setStrokeStyle(3, PALETTE.gold, 0.9)
      .setDepth(11);
    this.tweens.add({
      targets: burst,
      scale: 2.4,
      alpha: 0,
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy(),
    });
    this.floatText("Charge absorbed hit", PALETTE.gold);
  }

  /** Short floating status text above the player. */
  private floatText(message: string, color: number): void {
    const label = this.add
      .text(this.player.x, this.player.y - PLAYER.radius - 8, message, {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: `#${color.toString(16).padStart(6, "0")}`,
      })
      .setOrigin(0.5)
      .setDepth(12);
    this.tweens.add({
      targets: label,
      y: label.y - 42,
      alpha: 0,
      duration: 900,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  // ---- HUD / end -----------------------------------------------------------

  private emitHud(force = false): void {
    const score = Math.floor(this.scoreValue);
    // Time Attack/Training: seconds remaining (countdown). Survival: seconds
    // survived (count up) — the HUD relabels it and there is no 60s target.
    const timeLeft =
      this.mode === "survival"
        ? Math.floor(this.elapsedMs / 1000)
        : Math.max(0, Math.ceil(RUN_DURATION_SECONDS - this.elapsedMs / 1000));
    const now = this.time.now;
    const shieldSecs =
      this.shieldCharges > 0 && now < this.shieldUntilMs
        ? Math.ceil((this.shieldUntilMs - now) / 1000)
        : 0;
    const magnetSecs =
      now < this.magnetUntilMs ? Math.ceil((this.magnetUntilMs - now) / 1000) : 0;
    const lives = this.survivalLike() ? Math.max(0, this.lives) : 0;
    const charge = this.survivalLike() ? this.chargeLevel : 0;
    const stage =
      this.mode === "survival" && this.currentStageIndex >= 0
        ? STAGES[this.currentStageIndex].name
        : this.mode === "campaign" && this.campaignLevel
          ? this.campaignLevel.name
          : "";
    const progress =
      this.mode === "campaign" && this.campaignTargetMs > 0
        ? Phaser.Math.Clamp(this.elapsedMs / this.campaignTargetMs, 0, 1)
        : 0;
    if (
      force ||
      score !== this.lastHud.score ||
      timeLeft !== this.lastHud.timeLeft ||
      this.combo !== this.lastHud.combo ||
      shieldSecs !== this.lastHud.shieldSecs ||
      magnetSecs !== this.lastHud.magnetSecs ||
      this.activeEventKind !== this.lastHud.event ||
      lives !== this.lastHud.lives ||
      charge !== this.lastHud.charge ||
      stage !== this.lastHud.stage ||
      Math.abs(progress - this.lastHud.progress) >= 0.01
    ) {
      this.lastHud = {
        score,
        timeLeft,
        combo: this.combo,
        shieldSecs,
        magnetSecs,
        event: this.activeEventKind,
        lives,
        charge,
        stage,
        progress,
      };
      this.game.events.emit(GameEvents.HudUpdate, { ...this.lastHud });
    }
  }

  private endRun(): void {
    if (this.finished) return;
    this.finished = true;

    const survival = this.mode === "survival";
    const isCampaign = this.mode === "campaign";
    const survivalLike = this.survivalLike();
    const timeSurvivedSecs = Math.floor(this.elapsedMs / 1000);
    const livesRemaining = survivalLike ? Math.max(0, this.lives) : 0;

    // Only Time Attack/Training get the clean-run bonus.
    const endBonus =
      survivalLike || this.obstaclesHit > SCORING.cleanRunMaxHits
        ? 0
        : SCORING.cleanRunBonus;
    const finalScore = Math.floor(this.scoreValue) + endBonus;

    // Campaign outcome: reached the finish (didn't die) = 1★ = completed.
    // Stars (0..3) grade the run for replay value.
    const reachedFinish =
      isCampaign && this.lives > 0 && this.elapsedMs >= this.campaignTargetMs;
    const campaignStars =
      isCampaign && this.campaignLevel
        ? computeStars(
            this.campaignLevel,
            {
              livesRemaining,
              energiesCollected: this.energiesCollected,
              maxCombo: this.maxCombo,
              maxChargeLevel: this.highestChargeLevel,
            },
            reachedFinish,
          )
        : 0;
    const campaignSuccess = reachedFinish;

    // The scene only reports the raw run; persistence/progression is handled by
    // React via storage.recordRun() (keeps gameplay decoupled from storage).
    const result: GameResult = {
      mode: this.mode,
      score: finalScore,
      energiesCollected: this.energiesCollected,
      maxCombo: this.maxCombo,
      obstaclesHit: this.obstaclesHit,
      endBonus,
      timeSurvivedSecs,
      livesRemaining,
      livesRecovered: survivalLike ? this.livesRecovered : 0,
      chargeAbsorbs: survivalLike ? this.chargeAbsorbs : 0,
      lifeOrbsCollected: survivalLike ? this.lifeOrbsCollected : 0,
      highestChargeLevel: survivalLike ? this.highestChargeLevel : 0,
      stageReached: survival ? STAGES[Math.max(0, this.currentStageIndex)].id : 0,
      stageName: survival ? STAGES[Math.max(0, this.currentStageIndex)].name : "",
      campaignLevelId: isCampaign ? this.campaignLevelId : 0,
      reachedFinish,
      campaignSuccess,
      campaignStars,
    };

    // Final HUD push (so the on-canvas score matches the result) then notify React.
    this.lastHud = {
      score: finalScore,
      timeLeft: survival ? timeSurvivedSecs : 0,
      combo: this.combo,
      shieldSecs: 0,
      magnetSecs: 0,
      event: null,
      lives: livesRemaining,
      charge: survivalLike ? this.chargeLevel : 0,
      stage: survival && this.currentStageIndex >= 0 ? STAGES[this.currentStageIndex].name : "",
      progress: isCampaign && this.campaignTargetMs > 0
        ? Phaser.Math.Clamp(this.elapsedMs / this.campaignTargetMs, 0, 1)
        : 0,
    };
    this.game.events.emit(GameEvents.HudUpdate, { ...this.lastHud });
    this.game.events.emit(GameEvents.GameOver, result);
  }
}
