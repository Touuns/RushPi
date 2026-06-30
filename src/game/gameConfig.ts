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

/** Run length, per the design docs. */
export const GAME_DURATION_SECONDS = 60;

/** Player config. */
export const PLAYER = {
  /** Vertical position of the player, as a fraction of game height (0=top). */
  yRatio: 0.82,
  radius: 22,
  /** Lane-change tween duration in ms (snappy but smooth). */
  laneTweenMs: 110,
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

/** Anti-frustration: after a hit, the player briefly can't be hit again. */
export const HIT = {
  /** Invulnerability window after a collision (ms). */
  invulnerabilityMs: 800,
  /** Short slow-down factor applied to object speed right after a hit. */
  slowFactor: 0.55,
  slowDurationMs: 600,
};
