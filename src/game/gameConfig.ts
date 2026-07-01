/**
 * Central gameplay tuning for Rush Pi.
 *
 * Everything that affects "feel" lives here so balancing the game never means
 * hunting through scene code. Values are intentionally conservative for a calm
 * start that ramps up — see DIFFICULTY below.
 */

/** Logical game resolution. The canvas is scaled to fit the device (portrait). */
export const GAME_WIDTH = 414; // iPhone-ish portrait width
export const GAME_HEIGHT = 736;

/** Number of lanes the player can move between. */
export const LANE_COUNT = 3;

/**
 * Run length, per the design docs.
 * TESTING TIP: temporarily set this to 15 to iterate faster, then restore to 60.
 */
export const RUN_DURATION_SECONDS = 60;

/** Player config. */
export const PLAYER = {
  /** Vertical position of the player, as a fraction of game height (0=top). */
  yRatio: 0.8,
  radius: 22,
  /** Lane-change tween duration in ms (snappy but smooth). */
  laneTweenMs: 110,
};

/** Touch/drag control tuning (Phase 9A). All in logical game px. */
export const CONTROLS = {
  /** Horizontal drag distance for one lane change while the finger is held. */
  dragLaneThresholdPx: 40,
  /** A pointerup with |dx| >= this (but no drag step fired) counts as a swipe. */
  swipeThresholdPx: 24,
};

/** Falling-object config. */
export const OBJECTS = {
  radius: 18,
  /** Base fall speed in px/sec at t=0. */
  baseSpeed: 220,
  /** Extra fall speed added linearly over the whole run (px/sec at the end). */
  speedRampPerRun: 260,
  /** Spawn interval (ms) at the start of the run. */
  baseSpawnIntervalMs: 820,
  /** Spawn interval (ms) at the end of the run (faster = harder). */
  minSpawnIntervalMs: 420,
  /** Probability a given spawn is an obstacle (vs an energy). */
  obstacleChance: 0.42,
};

/** Scoring rules, mirroring the cadrage doc. */
export const SCORING = {
  energyPoints: 10,
  /** Passive survival points awarded per second alive. */
  survivalPerSecond: 5,
  /** Combo adds (combo * comboStep)% to each energy, capped at comboMaxMultiplier. */
  comboStep: 0.1,
  comboMaxMultiplier: 3,
  /** Penalty applied when hitting an obstacle. */
  obstaclePenalty: 50,
  /** End-of-run bonus if the player finished with few hits. */
  cleanRunBonus: 500,
  /** "Few hits" threshold for the clean-run bonus (<= this many hits). */
  cleanRunMaxHits: 3,
};

/** Survival Mode (Phase 9B). Local-only; no 60s timer. */
export const SURVIVAL = {
  startLives: 3,
  /** Hard safety cap so a run can't be truly infinite (not shown as a goal). */
  maxRunMs: 600000, // 10 minutes
  /**
   * Difficulty ramps to full over this long (vs 60s for Time Attack), so the
   * early game is gentler: 0-60s easy→normal, 60-120s normal→hard, 120s+ intense.
   */
  rampToHardMs: 120000,
};

/** Anti-frustration: after a hit, the player briefly can't be hit again. */
export const HIT = {
  /** Invulnerability window after a collision (ms). */
  invulnerabilityMs: 800,
  /** Short slow-down factor applied to object speed right after a hit. */
  slowFactor: 0.55,
  slowDurationMs: 600,
};
