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
import { PALETTE, GLOW, TRACK, PHASES, POWERUPS, EVENTS, DAILY_FEEL } from "../theme";
import { TrackVisuals } from "../track";
import { BackgroundFX } from "../background";
import { buildEventSchedule, type EventSlot } from "../events";
import { STAGES, stageIndexForTime, type Stage } from "../stages";
import { getCampaignLevel, computeStars, type CampaignLevel } from "../campaign";
import type { DailyTokenChallenge, DailyTokenSpec } from "../../market/dailyTokenTypes";
import {
  formatTokenPrice,
  pickObstacleLane,
  type LaneSpawn,
  makeChainBlock,
  makeTokenCollectible,
  registerTokenTextures,
  TOKEN_RADIUS,
} from "../dailyTokens";
import { TrackDrift } from "../trackDrift";
import { TrackGate } from "../zoneTransition";
import { ZoneDecor } from "../zoneDecor";
import {
  PROD_TEXTURE_KEYS,
  registerDailyProductionTextures,
} from "../productionAssets";
import { createSeededRandom, getDailySeed } from "../seededRandom";
import { resolveReducedMotion } from "../motion";
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

type FallingType = "energy" | "token" | "obstacle" | "life" | PowerupKind;

interface FallingObject {
  container: Phaser.GameObjects.Container;
  type: FallingType;
  lane: number;
  alive: boolean;
  /** Daily Token Rush spec (Phase 11B); only set when type === "token". */
  token?: DailyTokenSpec;
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
    tokensCollected: -1,
    tokensTotal: -1,
  };

  // Input. `pointerDownX` = where the press started (for tap/swipe on release).
  // `dragRefX` = moving reference for continuous drag/slide; `dragMoved` marks
  // that the drag already changed lane(s) so release doesn't double-fire.
  private pointerDownX: number | null = null;
  private dragRefX: number | null = null;
  private dragMoved = false;

  // RNG: seeded (identical course for everyone) in Daily mode, random in Training.
  private rng: () => number = Math.random;

  // Daily Token Rush (Phase 11B); manifest is null outside Daily. Public so the
  // dev harness can inspect it. Tokens spawn from the manifest schedule (already
  // sorted by spawnTimeMs), are never magnet-attracted and never touch the combo.
  dailyChallenge: DailyTokenChallenge | null = null;
  private tokenSpawnIndex = 0;
  private tokenIdsCollected: string[] = [];
  private tokenPointsEarned = 0;
  private tokenMarketValueUsd = 0;
  private tokensMissed = 0;
  private blockPointsEarned = 0;
  // One collect notification at a time — a new one replaces the previous.
  private tokenToast: Phaser.GameObjects.Container | null = null;

  // Daily feel (Phase 12B-1 / 12B-1.1, PURELY VISUAL, Daily-only): strictly
  // SEPARATED feedback channels, each with its own persistent label(s) so no two
  // families ever overlap and nothing is ever summed. Two Chain Block "+N" labels
  // (alternated below the player), one dedicated impact label (above the player),
  // and one persistent collect-burst emitter (emitting:false, fired via explode()).
  // Never allocates per collect, never consumes gameplay RNG, never touches
  // score/combo/collisions. The token toast keeps its own single-at-a-time object.
  private collectFeedbackLeft: Phaser.GameObjects.Text | null = null;
  private collectFeedbackRight: Phaser.GameObjects.Text | null = null;
  private collectSideRight = false;
  private impactFeedback: Phaser.GameObjects.Text | null = null;
  private collectBurst: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Daily power-up + combo polish (Phase 12B-2, PURELY VISUAL, Daily-only): one
  // reusable milestone Text, one persistent combo ring (player child) + the
  // stored π-glyph, one reusable power-up activation ring, and once-per-activation
  // expiry-warning flags. Created only in Daily; never touch timers/score/combo.
  private comboMilestoneText: Phaser.GameObjects.Text | null = null;
  private comboRing: Phaser.GameObjects.Arc | null = null;
  private powerupActivationRing: Phaser.GameObjects.Arc | null = null;
  private piGlyph: Phaser.GameObjects.Text | null = null;
  private shieldExpiryWarned = false;
  private magnetExpiryWarned = false;

  // Campaign (Phase 9F): fixed-finish level. 0/null outside campaign.
  private campaignLevelId = 0;
  private campaignLevel: CampaignLevel | null = null;
  private campaignTargetMs = 0;

  // Reduced motion (Phase 12B-3B): resolved once per run in init(), never
  // re-read mid-run (no live listener). Gates camera shake/flash and the
  // purely-cosmetic infinite/expanding tweens listed in motion.ts's contract.
  private reducedMotion = false;

  constructor() {
    super({ key: "MainScene" });
  }

  /** Survival + Campaign share the same engine (lives, charge, Life Orbs, absorb). */
  private survivalLike(): boolean {
    return this.mode === "survival" || this.mode === "campaign";
  }

  init(data: {
    mode?: GameMode;
    campaignLevelId?: number;
    dailyChallenge?: DailyTokenChallenge | null;
  }): void {
    this.mode = data.mode ?? "daily";
    // Resolved once per run start (Phase 12B-3B) — a replay recreates the
    // scene, so this stays fresh without needing a live matchMedia listener.
    this.reducedMotion = resolveReducedMotion();
    this.dailyChallenge = this.mode === "daily" ? (data.dailyChallenge ?? null) : null;
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
    this.shieldExpiryWarned = false;
    this.magnetExpiryWarned = false;
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
    this.tokenSpawnIndex = 0;
    this.tokenIdsCollected = [];
    this.tokenPointsEarned = 0;
    this.tokenMarketValueUsd = 0;
    this.tokensMissed = 0;
    this.blockPointsEarned = 0;
    this.tokenToast = null;
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
      tokensCollected: -1,
      tokensTotal: -1,
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
    // Daily Token Rush: register the preloaded logo textures BEFORE the run —
    // no image request ever starts mid-run (missing logos fall back procedurally).
    if (this.dailyChallenge) {
      registerTokenTextures(this, this.dailyChallenge.tokens);
    }
    // Daily production visuals (Phase 12A-2, hardened): BOTH the texture
    // registration and the background image are strictly Daily-only, so
    // Training/Survival/Campaign never get any prod:* key in their (freshly
    // recreated) TextureManager. Purely visual; missing textures fall back to
    // the procedural art.
    if (this.mode === "daily") {
      registerDailyProductionTextures(this);
      // Daily production background: sits BELOW BackgroundFX/track/particles
      // (depth -20). Only when a valid texture was registered — otherwise the
      // procedural background is kept exactly as-is.
      if (this.textures.exists(PROD_TEXTURE_KEYS.dailyBackground)) {
        this.add
          .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, PROD_TEXTURE_KEYS.dailyBackground)
          .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
          .setDepth(-20);
      }
    }
    this.bg = new BackgroundFX(this);
    this.bg.create();
    this.track = new TrackVisuals(this, this.laneX, this.reducedMotion);
    this.track.drawStatic();
    if (this.mode === "survival") this.zoneDecor = new ZoneDecor(this, this.reducedMotion);
    this.createPlayer();
    this.createPlayerTrail();
    this.setupInput();

    // Daily feel (Phase 12B-1): feedback text pool + collect-burst emitter,
    // built ONCE per scene, Daily-only. A replay recreates the scene, so these
    // are always fresh (no accumulation across runs).
    this.collectFeedbackLeft = null;
    this.collectFeedbackRight = null;
    this.collectSideRight = false;
    this.impactFeedback = null;
    this.collectBurst = null;
    this.comboMilestoneText = null;
    this.comboRing = null;
    this.powerupActivationRing = null;
    if (this.mode === "daily") this.createDailyFeedbackFx();

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

    // Daily-only RUSH! intro (Phase 12B-1): purely visual overlay while the
    // course already runs — no pause, no timer/spawn shift, input untouched.
    if (this.mode === "daily") this.showDailyRushIntro();
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
    // Danger read (Phase 12A-2.1): hot additive glow + a warning-border diamond
    // + a solid core with a bright rim + a crossed "✕" mark. Angular + red reads
    // as "avoid" in a glance — clearly distinct from the round logo tokens and
    // the gold/violet Chain Blocks. Collisions still use OBJECTS.radius only, so
    // the hitbox is unchanged despite the stronger visual presence.
    const halo = this.add
      .circle(0, 0, radius * GLOW.outerScale * 1.15, color, 0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    const d = radius * 1.7;
    // Warning border: an outlined diamond slightly larger than the core.
    const border = this.add.rectangle(0, 0, d * 1.22, d * 1.22, color, 0);
    border.setStrokeStyle(2.5, color, 0.55);
    border.setAngle(45);
    // Solid core diamond with a bright rim.
    const core = this.add.rectangle(0, 0, d, d, color, 1);
    core.setStrokeStyle(3, PALETTE.white, 0.95);
    core.setAngle(45);
    // Bright crossed bars (✕) — an unmistakable "hazard" glyph.
    const barA = this.add.rectangle(0, 0, d * 0.6, 3.5, PALETTE.white, 0.95).setAngle(45);
    const barB = this.add.rectangle(0, 0, d * 0.6, 3.5, PALETTE.white, 0.95).setAngle(-45);
    return this.add.container(0, 0, [halo, border, core, barA, barB]);
  }

  private createPlayer(): void {
    this.player = this.makeOrb(PALETTE.player, PLAYER.radius);
    this.player.setPosition(this.laneX[this.currentLane], GAME_HEIGHT * PLAYER.yRatio);
    this.player.setDepth(10);

    // Pi identity (Phase 11B): original typographic "π" glyph centered on the
    // orb, in the Rush Pi style — purely cosmetic, hitbox/collisions unchanged.
    // Stored as a property (Phase 12B-2) so the Daily combo pulse can pop it
    // without ever tweening the player container (which owns movement/scale).
    this.piGlyph = this.add
      .text(0, -1, "π", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${Math.round(PLAYER.radius * 1.15)}px`,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0.95);
    this.player.add(this.piGlyph);

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
    let lane = Math.floor(this.rng() * LANE_COUNT);
    const type: FallingType =
      this.rng() < OBJECTS.obstacleChance ? "obstacle" : "energy";

    // Anti-overlap lane pick (Phase 11B token guard, generalised in 12A-2.1),
    // scoped to Daily ONLY (12A-2.1 hardening): an obstacle must not fall
    // superimposed on a token, a scheduled power-up, or an Energy-Zone extra —
    // each spawns from its OWN seeded schedule, independently of this obstacle
    // stream, which is what let a magnet/Chain Block land under an obstacle and
    // inflict an unfair penalty on collect. pickObstacleLane runs AFTER both RNG
    // draws above and reads only the seeded schedules + elapsedMs (no extra RNG
    // draw, RNG order untouched) → the Daily course stays byte-identical for
    // every client. Training/Survival/Campaign keep the raw RNG lane exactly as
    // before (guard is Daily-only). Collision still uses lane + y + radius.
    if (type === "obstacle" && this.mode === "daily") {
      const collectibles: LaneSpawn[] = [
        ...this.powerupSchedule,
        ...this.energyExtras,
      ];
      if (this.dailyChallenge) {
        for (const t of this.dailyChallenge.tokens) {
          collectibles.push({ timeMs: t.spawnTimeMs, lane: t.lane });
        }
      }
      lane = pickObstacleLane(lane, LANE_COUNT, collectibles, this.elapsedMs);
    }

    // Daily-only visual: energies render as Chain Blocks (type stays "energy",
    // so combo/magnet/anti-cheat behave exactly as before).
    const container =
      type === "obstacle"
        ? this.makeHazard(PALETTE.obstacle, OBJECTS.radius)
        : this.mode === "daily"
          ? makeChainBlock(this)
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
    this.spawnDueDailyTokens();
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

      // Off-screen cleanup. A token leaving the screen is missed: marked once,
      // destroyed cleanly, no points, no combo change.
      if (obj.container.y > GAME_HEIGHT + OBJECTS.radius * 2) {
        if (obj.type === "token") this.tokensMissed += 1;
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
      } else if (obj.type === "token") {
        // Tokens use the SAME lane + vertical-distance rule and are NEVER
        // magnet-attracted (the magnet branch above only touches "energy").
        if (sameLane && dyAbs <= radii) this.collectToken(obj);
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

    // End of run per mode — each exit goes through its own visual end sequence
    // (Training keeps its instant end for this phase).
    if (this.mode === "survival") {
      if (this.lives <= 0) {
        this.startEndSequence("survival-gameover");
        return;
      }
      if (this.elapsedMs >= SURVIVAL.maxRunMs) {
        this.startEndSequence("survival-timeup");
        return;
      }
    } else if (this.mode === "campaign") {
      if (this.lives <= 0) {
        this.startEndSequence("campaign-failure");
        return;
      }
      if (this.elapsedMs >= this.campaignTargetMs) {
        this.startEndSequence("campaign-success");
        return;
      }
    } else if (this.elapsedMs >= RUN_DURATION_SECONDS * 1000) {
      if (this.mode === "daily") this.startEndSequence("daily-finish");
      else this.endRun();
      return;
    }

    this.emitHud();
  }

  // ---- End sequences (Phase 10B-P2/P3) -------------------------------------

  /**
   * Freeze the run and play the mode's visual exit before finalizeRun().
   * From this point: score, stats, elapsed, lives and charge are frozen; no
   * spawns, no collisions, no gains, no lane changes. GameOver is emitted
   * exactly once (finalizeRun/endRun guard), driven by the Phaser clock.
   *
   * Kinds: daily-finish (gold FINISH gate — behavior/timing identical to
   * 10B-P2), campaign-success (level-colored gate + LEVEL COMPLETE!),
   * campaign-failure (fade-out + LEVEL FAILED), survival-gameover (fade-out +
   * dispersal + RUN ENDED), survival-timeup (same, SURVIVAL COMPLETE).
   */
  private startEndSequence(
    kind:
      | "daily-finish"
      | "campaign-success"
      | "campaign-failure"
      | "survival-gameover"
      | "survival-timeup",
  ): void {
    if (this.runState !== "running" || this.finished) return;
    this.runState = "finishing";

    // Freeze elapsed at the exact end instant per kind.
    if (kind === "daily-finish") this.elapsedMs = RUN_DURATION_SECONDS * 1000;
    else if (kind === "campaign-success") this.elapsedMs = this.campaignTargetMs;
    else if (kind === "survival-timeup") {
      this.elapsedMs = Math.min(this.elapsedMs, SURVIVAL.maxRunMs);
    }
    this.lives = Math.max(0, this.lives); // never negative
    // A zone gate mid-travel would be stale now.
    this.zoneGate?.destroy();
    this.zoneGate = null;
    this.emitHud(true); // frozen HUD (final score / time / lives)

    switch (kind) {
      case "daily-finish":
        this.finishGate = new TrackGate(this, this.track, {
          color: PALETTE.gold,
          label: "FINISH",
          durationMs: 1300,
          // Phase 12A-2: production Finish Portal — daily-finish ONLY (TrackGate
          // falls back to the procedural gate if the texture is absent). Timing,
          // onCross, flash, FINISH text and banner are unchanged.
          textureKey: PROD_TEXTURE_KEYS.finishPortal,
          textureOriginY: 0.88,
          onCross: () => {
            // Reduced motion (Phase 12B-3B): no camera flash; text/timing unchanged.
            if (!this.reducedMotion) this.cameras.main.flash(160, 255, 209, 102);
            this.showBanner("FINISH!");
            this.time.delayedCall(500, () => this.endRun());
          },
        });
        break;

      case "campaign-success": {
        const tint = this.campaignLevel?.tint ?? PALETTE.gold;
        const rgb = Phaser.Display.Color.IntegerToColor(tint);
        this.finishGate = new TrackGate(this, this.track, {
          color: tint,
          label: "FINISH",
          durationMs: 1300,
          onCross: () => {
            // Reduced motion (Phase 12B-3B): no camera flash / celebratory ring
            // burst; text and GameOver timing unchanged.
            if (!this.reducedMotion) {
              this.cameras.main.flash(150, rgb.red, rgb.green, rgb.blue);
              this.burstAtPlayer(tint);
            }
            this.showBanner("LEVEL COMPLETE!");
            this.time.delayedCall(500, () => this.endRun());
          },
        });
        break;
      }

      case "campaign-failure":
        this.fadePlayerForEnd();
        this.showEndVeil(0x1a0510, 0.22);
        this.time.delayedCall(350, () => this.showBanner("LEVEL FAILED"));
        this.time.delayedCall(1000, () => this.endRun());
        break;

      case "survival-gameover":
      case "survival-timeup":
        this.fadePlayerForEnd();
        this.disperseAtPlayer();
        this.showEndVeil(0x08040f, 0.25);
        this.time.delayedCall(300, () =>
          this.showBanner(kind === "survival-timeup" ? "SURVIVAL COMPLETE" : "RUN ENDED"),
        );
        this.time.delayedCall(1200, () => this.endRun());
        break;
    }
  }

  /** Gently power the orb down: shrink/sink, kill trail, hide auras. */
  private fadePlayerForEnd(): void {
    this.trailEmitter.stop();
    this.tweens.add({
      targets: [this.chargeAura, this.shieldRing, this.magnetAura],
      alpha: 0,
      duration: 500,
    });
    this.tweens.add({
      targets: this.player,
      scale: 0.82,
      y: this.player.y + 14,
      alpha: 0.7,
      duration: 900,
      ease: "Sine.easeOut",
    });
  }

  /** Soft dark overlay for failure/game-over exits (below the React HUD). */
  private showEndVeil(color: number, alpha: number): void {
    const veil = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, 1)
      .setDepth(12)
      .setAlpha(0);
    this.tweens.add({ targets: veil, alpha, duration: 700 });
  }

  /** Small celebratory ring burst around the orb (campaign success). */
  private burstAtPlayer(color: number): void {
    const burst = this.add
      .circle(this.player.x, this.player.y, PLAYER.radius + 8, color, 0)
      .setStrokeStyle(3, color, 0.9)
      .setDepth(11);
    this.tweens.add({
      targets: burst,
      scale: 2.6,
      alpha: 0,
      duration: 340,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  /** One-shot particle dispersal at the orb (survival run ended). */
  private disperseAtPlayer(): void {
    const e = this.add.particles(this.player.x, this.player.y, "spark", {
      speed: { min: 60, max: 160 },
      lifespan: 700,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: PALETTE.violet,
      blendMode: "ADD",
      emitting: false,
    });
    e.setDepth(11);
    e.explode(18);
  }

  /** Ending-phase frame: coast visuals only — no score, no collisions. */
  private updateFinishing(delta: number): void {
    this.track.update(delta, 0);
    this.zoneDecor?.update(delta);
    // Ease the visual speed down while the exit plays.
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
    const gained = SCORING.energyPoints * this.comboMultiplier();
    this.scoreValue += gained;
    // Daily result detail (Phase 11B): Chain Block points before bonus/penalty.
    if (this.mode === "daily") this.blockPointsEarned += gained;

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

    // Daily feel (Phase 12B-1): show the EXACT points gained (+N, rounded for
    // display only — scoreValue/blockPointsEarned keep the raw value above) +
    // a small pooled burst at the collect point. Visual only, Daily only.
    if (this.mode === "daily") {
      this.showCollectFeedback(obj.container.x, obj.container.y, gained);
      // Combo milestones (Phase 12B-2): cosmetic flourish at the EXACT thresholds
      // only. Uses the combo already incremented above; never changes it. Tokens
      // never reach here (collectToken doesn't touch the combo), so they can't
      // trigger a milestone.
      if ((DAILY_FEEL.comboMilestoneValues as readonly number[]).includes(this.combo)) {
        this.showComboMilestone(this.combo);
      }
    }
  }

  private hitObstacle(obj: FallingObject): void {
    obj.alive = false;
    obj.container.destroy();

    // Daily feel (Phase 12B-1): snapshot BEFORE the (unchanged) penalty logic,
    // purely to display the real loss afterwards. Never alters the mutation.
    const comboBeforeHit = this.combo;
    const scoreBeforeHit = this.scoreValue;

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

    // Daily feel (Phase 12B-1): show the REAL points lost (−N from the actual
    // score delta, "HIT" when nothing was left) + combo-lost line for 5+.
    if (this.mode === "daily") {
      const actualPenalty = scoreBeforeHit - this.scoreValue;
      this.showHitFeedback(Math.round(actualPenalty), comboBeforeHit);
    }

    // Grant brief invulnerability + a short slow-down so a mistake is recoverable.
    this.invulnerableUntilMs = this.time.now + HIT.invulnerabilityMs;
    this.slowUntilMs = this.time.now + HIT.slowDurationMs;

    // Visual feedback: camera shake + red flash + player blink during i-frames.
    // Reduced motion (Phase 12B-3B): no shake, no flash, and the repeated
    // blink becomes at most one short opacity cue — penalty/invulnerability/
    // slowdown above are untouched either way.
    if (!this.reducedMotion) {
      this.cameras.main.shake(140, 0.008);
      this.cameras.main.flash(120, 255, 77, 109);
    }
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: this.reducedMotion ? 0 : Math.floor(HIT.invulnerabilityMs / 240),
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

  // ---- Daily Token Rush (Phase 11B) ----------------------------------------

  /**
   * Spawn manifest tokens when their time comes. The manifest is already sorted
   * by spawnTimeMs, so a single advancing index is enough — each token spawns
   * exactly once per run (replays re-init the index).
   */
  private spawnDueDailyTokens(): void {
    const challenge = this.dailyChallenge;
    if (!challenge) return;
    while (
      this.tokenSpawnIndex < challenge.tokens.length &&
      this.elapsedMs >= challenge.tokens[this.tokenSpawnIndex].spawnTimeMs
    ) {
      this.spawnToken(challenge.tokens[this.tokenSpawnIndex]);
      this.tokenSpawnIndex += 1;
    }
  }

  private spawnToken(spec: DailyTokenSpec): void {
    const container = makeTokenCollectible(this, spec);
    container.setPosition(this.laneX[spec.lane], -TOKEN_RADIUS * 2);
    container.setDepth(6); // above energies/obstacles, below the player
    this.objects.push({ container, type: "token", lane: spec.lane, alive: true, token: spec });
  }

  /**
   * Collect a token: FIXED manifest points (never combo-multiplied, combo is
   * untouched either way), the ID is recorded exactly once, and the feedback is
   * a local grow-and-fade + light burst + a single compact toast.
   */
  private collectToken(obj: FallingObject): void {
    const spec = obj.token;
    if (!spec || !obj.alive) return; // double-collision protection
    obj.alive = false;

    if (!this.tokenIdsCollected.includes(spec.id)) {
      this.tokenIdsCollected.push(spec.id);
      this.tokenPointsEarned += spec.points;
      this.tokenMarketValueUsd += spec.referencePriceUsd;
      this.scoreValue += spec.points;
    }

    // Grow-and-fade + soft Rush Pi burst (no aggressive full-screen effect).
    this.tweens.add({
      targets: obj.container,
      scale: obj.container.scale * 1.8,
      alpha: 0,
      duration: 200,
      ease: "Quad.easeOut",
      onComplete: () => obj.container.destroy(),
    });
    const burst = this.add
      .circle(obj.container.x, obj.container.y, TOKEN_RADIUS + 6, PALETTE.gold, 0)
      .setStrokeStyle(3, PALETTE.gold, 0.9)
      .setDepth(11);
    this.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy(),
    });

    this.showTokenToast(spec);
  }

  /** One compact two-line collect toast at a time (new replaces previous). */
  private showTokenToast(spec: DailyTokenSpec): void {
    this.tokenToast?.destroy();
    const title = this.add
      .text(0, 0, `${spec.symbol.toUpperCase()} +${spec.points}`, {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: PALETTE.goldCss,
      })
      .setOrigin(0.5);
    const price = this.add
      .text(0, 18, formatTokenPrice(spec.referencePriceUsd), {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "12px",
        color: "#cbb8ff",
      })
      .setOrigin(0.5);
    // Dedicated token band ABOVE the player (Phase 12B-1.1): sits between the
    // player and the HUD, well clear of the impact channel below it and the +N
    // Chain Block labels under the player — trajectories never cross.
    const toastY = Math.max(
      DAILY_FEEL.safeTopY,
      this.player.y - PLAYER.radius - DAILY_FEEL.tokenToastAbovePlayerPx,
    );
    const toast = this.add
      .container(this.player.x, toastY, [title, price])
      .setDepth(12);
    this.tokenToast = toast;
    this.tweens.add({
      targets: toast,
      y: toast.y - DAILY_FEEL.tokenToastRisePx,
      alpha: 0,
      duration: 1000,
      ease: "Quad.easeOut",
      onComplete: () => {
        toast.destroy();
        if (this.tokenToast === toast) this.tokenToast = null;
      },
    });
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
    // Energy Zone bonuses use the same Daily Chain Block visual (Phase 11B).
    const c =
      this.mode === "daily" ? makeChainBlock(this) : this.makeOrb(PALETTE.energy, OBJECTS.radius);
    c.setPosition(this.laneX[lane], -OBJECTS.radius * 2);
    c.setDepth(5);
    this.objects.push({ container: c, type: "energy", lane, alive: true });
  }

  /** Toggle the player's rings and tune the trail (phase + high combo). */
  private updatePlayerStates(): void {
    const now = this.time.now;
    const shieldActive = this.shieldCharges > 0 && now < this.shieldUntilMs;
    const magnetActive = now < this.magnetUntilMs;
    this.shieldRing.setVisible(shieldActive);
    this.magnetAura.setVisible(magnetActive);

    // Final-second expiry warning (Phase 12B-2, Daily only): pulse the EXISTING
    // ring/aura once per activation as it nears expiry. When the effect has ended
    // we make sure no warning tween lingers and the ring is back to normal, so a
    // later re-activation shows cleanly. Never touches the timers.
    if (this.mode === "daily") {
      if (shieldActive) {
        if (!this.shieldExpiryWarned && now >= this.shieldUntilMs - DAILY_FEEL.expiryWarnWindowMs) {
          this.shieldExpiryWarned = true;
          this.pulseExpiry(this.shieldRing);
        }
      } else if (this.shieldExpiryWarned) {
        this.tweens.killTweensOf(this.shieldRing);
        this.shieldRing.setAlpha(1).setScale(1);
        this.shieldExpiryWarned = false; // clean up once, not every frame
      }
      if (magnetActive) {
        if (!this.magnetExpiryWarned && now >= this.magnetUntilMs - DAILY_FEEL.expiryWarnWindowMs) {
          this.magnetExpiryWarned = true;
          this.pulseExpiry(this.magnetAura);
        }
      } else if (this.magnetExpiryWarned) {
        this.tweens.killTweensOf(this.magnetAura);
        this.magnetAura.setAlpha(1).setScale(1);
        this.magnetExpiryWarned = false; // clean up once, not every frame
      }
    }

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
      // Phase 12B-2: a fresh activation re-arms the (once-per-activation) expiry
      // warning and clears any leftover pulse on the ring, so it starts clean.
      this.shieldExpiryWarned = false;
      this.tweens.killTweensOf(this.shieldRing);
      this.shieldRing.setAlpha(1).setScale(1);
    } else {
      this.magnetUntilMs = now + POWERUPS.magnet.durationMs;
      this.magnetExpiryWarned = false;
      this.tweens.killTweensOf(this.magnetAura);
      this.magnetAura.setAlpha(1).setScale(1);
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
    // Daily pickup activation ring (visual only; timer/charge above unchanged).
    if (this.mode === "daily") {
      this.playPowerupActivation(obj.type === "shield" ? "shield" : "magnet");
    }
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
    // Reduced motion (Phase 12B-3B): no camera flash.
    if (!this.reducedMotion) this.cameras.main.flash(110, 56, 189, 248);
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
    // Reduced motion (Phase 12B-3B): no camera flash.
    if (!this.reducedMotion) this.cameras.main.flash(110, 255, 209, 102);
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

  // ---- Daily feel FX (Phase 12B-1, purely visual, Daily-only) --------------

  /**
   * Build the dedicated feedback labels + the single persistent collect-burst
   * emitter. Called once from create() (Daily only). All labels are created
   * up-front and reused — no Phaser.Text is ever allocated during the run:
   *   - collectFeedbackLeft / collectFeedbackRight: the two "+N" Chain Block
   *     labels (alternated, never summed, at most two visible), gold;
   *   - impactFeedback: the "−N / COMBO ×N LOST" label (its own channel), red.
   * The emitter reuses the procedural "spark" texture already generated for the
   * player trail (no new texture key) and only emits via explode().
   */
  private createDailyFeedbackFx(): void {
    const makeLabel = (colorCss: string, fontPx: number): Phaser.GameObjects.Text =>
      this.add
        .text(0, 0, "", {
          fontFamily: "Segoe UI, system-ui, sans-serif",
          fontSize: `${fontPx}px`,
          fontStyle: "bold",
          color: colorCss,
          align: "center",
          stroke: "#140a26",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(12)
        .setVisible(false);

    this.collectFeedbackLeft = makeLabel(PALETTE.goldCss, DAILY_FEEL.collectFontPx);
    this.collectFeedbackRight = makeLabel(PALETTE.goldCss, DAILY_FEEL.collectFontPx);
    // Impact label keeps the VALIDATED look (18px bold, red, stroke) — its own
    // dedicated channel, never a recycled Chain Block / token / status object.
    this.impactFeedback = makeLabel("#ff4d6d", 18);

    // Particle randomness here is Phaser's internal cosmetic jitter only — it
    // never touches this.rng()/this.powerupRng() or any gameplay decision.
    this.collectBurst = this.add.particles(0, 0, "spark", {
      speed: { min: 50, max: 120 },
      lifespan: DAILY_FEEL.burstLifespanMs,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [PALETTE.gold, PALETTE.violet],
      blendMode: "ADD",
      emitting: false,
    });
    this.collectBurst.setDepth(11);

    // Phase 12B-2 (Daily only). One reusable combo-milestone label in its own
    // band (below the HUD/status safe area, above the token toast).
    this.comboMilestoneText = this.add
      .text(GAME_WIDTH / 2, DAILY_FEEL.comboMilestoneY, "", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: `${DAILY_FEEL.comboMilestoneFontPx}px`,
        fontStyle: "bold",
        color: PALETTE.goldCss,
        align: "center",
        stroke: "#140a26",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setVisible(false);

    // One persistent combo ring as a PLAYER CHILD (auto-follows). It starts just
    // OUTSIDE the shield/magnet rings and only expands outward, so a milestone
    // flourish never hides those rings. Hidden when inactive.
    this.comboRing = this.add
      .circle(0, 0, PLAYER.radius + 10, PALETTE.gold, 0)
      .setStrokeStyle(3, PALETTE.gold, 0.9)
      .setVisible(false);
    this.player.add(this.comboRing);

    // One reusable power-up activation ring (Shield/Magnet), recoloured per kind
    // on pickup. Parented to the player at local (0,0) so it follows the orb for
    // the whole animation; expands + fades. Above the player, hidden when idle.
    this.powerupActivationRing = this.add
      .circle(0, 0, PLAYER.radius + 6, PALETTE.white, 0)
      .setStrokeStyle(3, PALETTE.white, 0.9)
      .setDepth(11)
      .setVisible(false);
    this.player.add(this.powerupActivationRing);
  }

  /**
   * Combo milestone flourish (Phase 12B-2, Daily only) at exactly x5/x10/x15.
   * PURELY COSMETIC: called AFTER collectEnergy() has already updated the combo
   * and score — it reads the combo, never changes it. Reuses the single
   * persistent label (scale-in → hold → fade) + the player pulse. No flash,
   * no shake, no pause.
   */
  private showComboMilestone(combo: number): void {
    const text = this.comboMilestoneText;
    // x5 → violet ring/gold text; x10 → full gold; x15 → gold/orange.
    const style =
      combo >= 15
        ? { textCss: PALETTE.orangeCss, ring: PALETTE.orange }
        : combo >= 10
          ? { textCss: PALETTE.goldCss, ring: PALETTE.gold }
          : { textCss: PALETTE.goldCss, ring: PALETTE.violet };
    if (text) {
      this.tweens.killTweensOf(text);
      if (this.reducedMotion) {
        // Reduced motion (Phase 12B-3B): text stays, opacity fade only — no
        // scale pop, no π pulse, no expanding ring.
        text
          .setText(`COMBO ×${combo}`)
          .setColor(style.textCss)
          .setScale(1)
          .setAlpha(0)
          .setVisible(true);
        this.tweens.add({
          targets: text,
          alpha: 1,
          duration: 150,
          onComplete: () => {
            this.tweens.add({
              targets: text,
              alpha: 0,
              delay: Math.max(0, DAILY_FEEL.comboMilestoneDurationMs - 150 - 200),
              duration: 200,
              onComplete: () => text.setVisible(false),
            });
          },
        });
      } else {
        text
          .setText(`COMBO ×${combo}`)
          .setColor(style.textCss)
          .setScale(0.5)
          .setAlpha(1)
          .setVisible(true);
        this.tweens.add({
          targets: text,
          scale: 1,
          duration: 170,
          ease: "Back.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: text,
              alpha: 0,
              scale: 1.1,
              delay: Math.max(0, DAILY_FEEL.comboMilestoneDurationMs - 170 - 200),
              duration: 200,
              ease: "Quad.easeIn",
              onComplete: () => text.setVisible(false),
            });
          },
        });
      }
    }
    // Reduced motion: skip the π scale pulse and expanding combo ring entirely.
    if (!this.reducedMotion) this.pulsePlayerCombo(style.ring);
  }

  /**
   * Player-centred combo celebration (Phase 12B-2): a quick π-glyph pop + a combo
   * ring expanding outward and fading. Both reuse persistent objects, never touch
   * the player container's scale/position (movement) or the hitbox, and never
   * hide the Shield/Magnet rings (the combo ring starts outside them).
   */
  private pulsePlayerCombo(ringColor: number): void {
    if (this.piGlyph) {
      this.tweens.killTweensOf(this.piGlyph);
      this.piGlyph.setScale(1);
      this.tweens.add({
        targets: this.piGlyph,
        scale: DAILY_FEEL.comboPiPulseScale,
        duration: 160,
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => this.piGlyph?.setScale(1),
      });
    }
    if (this.comboRing) {
      this.tweens.killTweensOf(this.comboRing);
      this.comboRing
        .setStrokeStyle(3, ringColor, 0.9)
        .setScale(1)
        .setAlpha(0.9)
        .setVisible(true);
      this.tweens.add({
        targets: this.comboRing,
        scale: DAILY_FEEL.comboRingExpandScale,
        alpha: 0,
        duration: DAILY_FEEL.comboRingDurationMs,
        ease: "Quad.easeOut",
        onComplete: () => this.comboRing?.setVisible(false),
      });
    }
  }

  /**
   * Power-up pickup activation ring (Phase 12B-2, Daily only): one short expanding
   * ring at the player — cyan for Shield, violet for Magnet. Reuses the single
   * persistent ring. No text (the React status channel already shows the timer),
   * no flash, no shake. Never alters the timer/charge set in collectPowerup().
   */
  private playPowerupActivation(kind: PowerupKind): void {
    // Reduced motion (Phase 12B-3B): skip the expanding pickup ring. Static
    // Shield/Magnet rings + React status timers already convey activation.
    if (this.reducedMotion) return;
    const ring = this.powerupActivationRing;
    if (!ring) return;
    const color = kind === "shield" ? PALETTE.shield : PALETTE.magnetRing;
    this.tweens.killTweensOf(ring);
    // Parented to the player at local (0,0): it follows the orb for the whole
    // animation, so no per-frame world repositioning is needed.
    ring
      .setStrokeStyle(3, color, 0.9)
      .setScale(1)
      .setAlpha(0.9)
      .setVisible(true);
    this.tweens.add({
      targets: ring,
      scale: DAILY_FEEL.powerupActivationScale,
      alpha: 0,
      duration: DAILY_FEEL.powerupActivationDurationMs,
      ease: "Quad.easeOut",
      onComplete: () => ring.setVisible(false),
    });
  }

  /**
   * Final-second expiry warning (Phase 12B-2, Daily only): 2 subtle alpha/scale
   * pulses of the EXISTING ring/aura (never a new object/text/flash/shake). The
   * onComplete restores the ring to its normal alpha/scale so a later show is
   * clean; the timer itself is never touched.
   */
  private pulseExpiry(ring: Phaser.GameObjects.Arc): void {
    // Reduced motion (Phase 12B-3B): skip the repeated expiry pulse. The
    // static ring/aura and React countdown already show time remaining.
    if (this.reducedMotion) return;
    this.tweens.killTweensOf(ring);
    ring.setAlpha(1).setScale(1);
    this.tweens.add({
      targets: ring,
      alpha: 0.4,
      scale: 1.12,
      duration: DAILY_FEEL.expiryPulseDurationMs,
      yoyo: true,
      repeat: 1, // 2 full pulses ≈ 1000 ms
      ease: "Sine.easeInOut",
      onComplete: () => ring.setAlpha(1).setScale(1),
    });
  }

  /**
   * Rise-and-fade a persistent feedback label. Kills any in-flight tween on that
   * exact label first (clean recycle, no orphan tween), clamps X inside the
   * canvas and Y below the HUD safe area, then plays the animation.
   */
  private animateFeedbackLabel(
    label: Phaser.GameObjects.Text,
    x: number,
    y: number,
    message: string,
    durationMs: number,
    risePx: number,
  ): void {
    this.tweens.killTweensOf(label);
    label
      .setText(message)
      .setPosition(
        Phaser.Math.Clamp(x, 44, GAME_WIDTH - 44),
        Math.max(DAILY_FEEL.safeTopY, y),
      )
      .setAlpha(1)
      .setScale(1)
      .setVisible(true);
    this.tweens.add({
      targets: label,
      y: label.y - risePx,
      alpha: 0,
      duration: durationMs,
      ease: "Quad.easeOut",
      onComplete: () => label.setVisible(false),
    });
  }

  /**
   * Chain Block collect (Daily only): the EXACT points gained, shown as a
   * standalone "+N" in its own channel BELOW the player, alternating between the
   * left and right label so consecutive collects never sum and at most two are
   * visible. A third collect while both are active reuses the older side (its
   * tween is killed first). The 5-particle burst stays at the REAL collect point.
   */
  private showCollectFeedback(collectX: number, collectY: number, gained: number): void {
    this.collectSideRight = !this.collectSideRight;
    const label = this.collectSideRight ? this.collectFeedbackRight : this.collectFeedbackLeft;
    if (label) {
      const dir = this.collectSideRight ? 1 : -1;
      this.animateFeedbackLabel(
        label,
        this.player.x + dir * DAILY_FEEL.collectSideOffsetPx,
        this.player.y + PLAYER.radius + DAILY_FEEL.collectBelowPlayerPx,
        `+${Math.round(gained)}`,
        DAILY_FEEL.collectTextDurationMs,
        DAILY_FEEL.collectTextRisePx,
      );
    }
    this.collectBurst?.explode(DAILY_FEEL.burstParticleCount, collectX, collectY);
  }

  /**
   * Impact readability (Daily only): the REAL points lost ("−N", never a
   * hardcoded −50) or "HIT" when there was nothing left to lose, plus a
   * "COMBO ×N LOST" line when a combo of 5+ was broken. Its own dedicated label
   * (validated placement above the player). Purely display — the penalty/combo
   * logic in hitObstacle() is untouched.
   */
  private showHitFeedback(penaltyRounded: number, comboBeforeHit: number): void {
    if (!this.impactFeedback) return;
    const first = penaltyRounded > 0 ? `−${penaltyRounded}` : "HIT";
    const message =
      comboBeforeHit >= 5 ? `${first}\nCOMBO ×${comboBeforeHit} LOST` : first;
    // Validated placement: player.x, player.y − OBJECTS.radius − 6 (unchanged).
    this.animateFeedbackLabel(
      this.impactFeedback,
      this.player.x,
      this.player.y - OBJECTS.radius - 6,
      message,
      DAILY_FEEL.hitTextDurationMs,
      DAILY_FEEL.hitTextRisePx,
    );
    this.impactFeedback.setDepth(13); // impact takes visual priority on a hit
  }

  /**
   * RUSH! intro (Daily only, once per run — a replay recreates the scene and
   * shows it again). Non-blocking overlay: no pause, no camera change, no veil,
   * no flash; the timer, spawns and input run normally underneath.
   */
  private showDailyRushIntro(): void {
    const intro = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * DAILY_FEEL.introYRatio, "RUSH!", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "46px",
        fontStyle: "bold",
        color: PALETTE.goldCss,
        stroke: "#140a26",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(13)
      .setAlpha(0)
      .setScale(this.reducedMotion ? 1 : 0.6);
    if (this.reducedMotion) {
      // Reduced motion (Phase 12B-3B): simple short fade, no scale pop / movement.
      const inMs = 150;
      this.tweens.add({
        targets: intro,
        alpha: 1,
        duration: inMs,
        onComplete: () => {
          this.tweens.add({
            targets: intro,
            alpha: 0,
            delay: Math.max(0, DAILY_FEEL.introDurationMs - inMs - 200),
            duration: 200,
            onComplete: () => intro.destroy(),
          });
        },
      });
      return;
    }
    const inMs = 180;
    this.tweens.add({
      targets: intro,
      alpha: 1,
      scale: 1,
      duration: inMs,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: intro,
          alpha: 0,
          scale: 1.15,
          delay: Math.max(0, DAILY_FEEL.introDurationMs - inMs - 200),
          duration: 200,
          ease: "Quad.easeIn",
          onComplete: () => intro.destroy(),
        });
      },
    });
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
    const tokensCollected = this.tokenIdsCollected.length;
    const tokensTotal = this.dailyChallenge?.tokens.length ?? 0;
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
      Math.abs(progress - this.lastHud.progress) >= 0.01 ||
      tokensCollected !== this.lastHud.tokensCollected ||
      tokensTotal !== this.lastHud.tokensTotal
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
        tokensCollected,
        tokensTotal,
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

    // Daily Token Rush (Phase 11B): any token still on screen at the finish is
    // simply missed. Neutral values outside Daily (or when no manifest loaded).
    const challenge = this.dailyChallenge;
    const tokensTotal = challenge?.tokens.length ?? 0;

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
      rulesVersion: challenge ? challenge.rulesVersion : 1,
      dailyChallengeId: challenge ? challenge.challengeId : "",
      dailyTokenChallengeVersion: challenge ? challenge.tokenChallengeVersion : 0,
      dailyTokensTotal: tokensTotal,
      dailyTokenIdsCollected: [...this.tokenIdsCollected],
      dailyTokenPoints: this.tokenPointsEarned,
      dailyTokenMarketValueUsd: this.tokenMarketValueUsd,
      dailyBlockPoints: Math.floor(this.blockPointsEarned),
      // Ranked reservation is owned by React (App fills these for ranked runs).
      dailySubmissionId: "",
      serverRankedAttemptNumber: 0,
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
      tokensCollected: this.tokenIdsCollected.length,
      tokensTotal,
    };
    this.game.events.emit(GameEvents.HudUpdate, { ...this.lastHud });
    this.game.events.emit(GameEvents.GameOver, result);
  }
}
