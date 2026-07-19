/**
 * Visual theme for the procedural (code-drawn) game art.
 *
 * Phase 1 draws everything with Phaser Graphics — no image assets. All colors and
 * sizes funnel through here so that swapping to real sprites later is a localized
 * change (replace the draw* helpers, keep the palette), not a rewrite.
 */

/** Hex numbers for Phaser (0x...) and matching CSS strings for the React HUD. */
export const PALETTE = {
  bg: 0x0c0717,
  bgCss: "#0c0717",

  // Brand-ish arcade palette: violet / orange / gold (no official Pi logo).
  violet: 0x8b5cf6,
  violetCss: "#8b5cf6",
  orange: 0xff7a3d,
  orangeCss: "#ff7a3d",
  gold: 0xffd166,
  goldCss: "#ffd166",

  energy: 0xffd166, // collectables = gold energy
  obstacle: 0xff4d6d, // obstacles = warning red/pink
  player: 0x8b5cf6, // player orb = violet
  laneLine: 0x2a2140,

  shield: 0x38bdf8, // power-up: cyan shield (distinct from gold/red)
  shieldRing: 0x7dd3fc,
  magnet: 0xff7a3d, // power-up: orange magnet core
  magnetRing: 0xa78bfa, // violet ring
  life: 0x34d399, // Survival life orb: green (distinct from all others)

  white: 0xffffff,
} as const;

/** Glow alpha/blur tuning shared by the procedural draw helpers. */
export const GLOW = {
  outerAlpha: 0.18,
  outerScale: 1.9,
};

/**
 * Track Drift (Phase 9E, Survival only): the vanishing point eases left/right to
 * fake a turning track. VISUAL ONLY — collisions still use lane + y. Amplitude is
 * per-stage (stages.driftMaxX); these control the timing/feel.
 */
export const DRIFT = {
  firstDriftMs: 15000, // no drift before 15s of survival
  holdMs: 5000, // time held at a side before returning to centre
  pauseMs: 4000, // rest at centre between drifts
  easeMs: 1400, // how quickly the actual drift approaches its target
};

/**
 * Perspective track ("race feeling") tuning. Purely visual — the gameplay lanes,
 * spawns and collisions are unchanged. Centralized so future skins / track themes
 * are a localized edit.
 */
export const TRACK = {
  /** Horizon (far end of the road) as a fraction of game height (0=top). */
  horizonRatio: 0.16,
  /** Road keeps a real width at the horizon (trapezoid, not a triangle). */
  topWidthRatio: 0.32,
  /** Object scale at the horizon (far) and at the player line (near). */
  vanishingScale: 0.5,
  nearScale: 1.1,
  /** Road surface fill + lane line alphas. */
  roadFillAlpha: 0.2,
  edgeAlpha: 0.85,
  laneAlpha: 0.3,
  /** Horizon glow radii (subtle). */
  haloRadius: 48,
  haloCoreRadius: 16,
  /** Scrolling chevrons (speed cue). */
  chevronCount: 5,
  chevronSpeed: 0.34, // progress units per second (horizon -> bottom)
  chevronColor: 0xff7a3d,
  /** Player light trail (particles). */
  trailFrequencyMs: 80,
  trailLifespanMs: 360,
} as const;

/**
 * Visual phases across the 60s run (cosmetic only — does not change difficulty,
 * which already ramps via gameConfig). 4 phases of 15s.
 */
export const PHASES = {
  count: 4,
  durationMs: 15000,
} as const;

/** Light living background (space/energy feel). Phase-driven intensity. */
export const BG = {
  /** Spawn interval (ms) at phase 0 (calm) and at the final phase (lively). */
  baseFrequencyMs: 240,
  finalFrequencyMs: 95,
  driftSpeedMin: 24,
  driftSpeedMax: 64,
  lifespanMs: 4200,
} as const;

/**
 * Two deterministic power-ups (seeded). Shield absorbs one obstacle (or expires);
 * Magnet briefly pulls nearby energies. No bonus points — fair for the Daily.
 */
export const POWERUPS = {
  maxTimeMs: 55000, // never spawn power-ups after this (avoid end-of-run)
  shield: {
    durationMs: 5000,
    minTimeMs: 20000,
  },
  magnet: {
    durationMs: 4000,
    minTimeMs: 25000,
    /** Energies within this many lanes of the player are pulled. */
    laneReach: 1,
    /** Vertical pull window above the player (px). */
    rangePx: 230,
    /** Extra collection reach (px) while the magnet is active. */
    collectReachPx: 26,
  },
} as const;

/**
 * Dynamic events (Phase 8B). Seeded on a SEPARATE stream so the obstacle/energy
 * course and power-ups are unaffected. Mostly visual; only Energy Zone adds a few
 * deterministic BONUS energies (never touches the base spawn sequence).
 * Each kind can be disabled or re-weighted here.
 */
export const EVENTS = {
  enabled: true,
  maxPerRun: 3,
  minStartMs: 12000, // no events in the first ~12s
  endMarginMs: 3000, // don't let an event run past ~57s
  durationMinMs: 4000,
  durationMaxMs: 7000,
  vignetteAlpha: 0.13, // additive tint strength (kept subtle for readability)
  speedChevronMultiplier: 2.3, // Speed Zone: chevrons only (no real speed change)
  energySpawnIntervalMs: 540, // Energy Zone: bonus energy cadence
  kinds: {
    // weight = relative frequency. Per the recommended tuning:
    // Speed frequent, Danger moderate, Energy & Tunnel rare.
    speed: { enabled: true, weight: 4, color: 0xffd166 },
    danger: { enabled: true, weight: 2, color: 0xff4d6d },
    energy: { enabled: true, weight: 1, color: 0xffd166 },
    tunnel: { enabled: true, weight: 1, color: 0xa78bfa },
  },
} as const;

/**
 * Daily game-feel polish (Phase 12B-1). PURELY VISUAL tuning for the Daily-only
 * collection/impact feedback and the RUSH! intro. No gameplay parameter lives
 * here — scoring/penalty/combo values stay in gameConfig.SCORING and HIT.
 */
export const DAILY_FEEL = {
  /**
   * Separated feedback channels (Phase 12B-1.1). Each family owns its own
   * vertical band so no two ever overlap; nothing may enter the HUD safe area.
   * `safeTopY` is the lowest logical Y a Phaser feedback object may reach — it
   * clears the React HUD row + the Tokens X/N chip + the status channel below.
   */
  safeTopY: 150,

  /**
   * Chain Block "+N": TWO dedicated persistent labels below the player, used
   * alternately (left/right) — never summed. Slightly smaller than the token
   * toast; gold with a dark outline.
   */
  collectFontPx: 16,
  collectTextDurationMs: 620,
  collectTextRisePx: 20,
  collectSideOffsetPx: 48, // horizontal offset each side of the player
  collectBelowPlayerPx: 26, // gap below the player radius (label sits under it)

  /** Micro-burst at the REAL collect point (single persistent emitter). */
  burstParticleCount: 5,
  burstLifespanMs: 300,

  /**
   * Impact "−N" / HIT / "COMBO ×N LOST" — VALIDATED look, do not retune. Its own
   * dedicated persistent label; sits above the player, below the token band.
   */
  hitTextDurationMs: 800,
  hitTextRisePx: 26,

  /** Token toast dedicated band above the player (never crosses impact/HUD). */
  tokenToastAbovePlayerPx: 72,
  tokenToastRisePx: 30,

  /** RUSH! intro: total on-screen time (in + hold + out), non-blocking. */
  introDurationMs: 650,
  /** RUSH! vertical position as a fraction of game height. */
  introYRatio: 0.38,

  /**
   * Combo milestones (Phase 12B-2). PURELY COSMETIC thresholds — they only pick
   * which combo values play a flourish; the combo value and points are unchanged.
   * The band sits below the HUD/status safe area and above the token-toast band,
   * so it never overlaps RUSH!, the toast, impact or the Chain Block "+N".
   */
  comboMilestoneValues: [5, 10, 15],
  comboMilestoneY: 370,
  comboMilestoneFontPx: 28,
  comboMilestoneDurationMs: 650,

  /** Player combo pulse: a persistent ring expanding outward + a π-glyph pop. */
  comboRingExpandScale: 2.6,
  comboRingDurationMs: 420,
  comboPiPulseScale: 1.35,

  /** Power-up pickup activation ring (reused for Shield & Magnet). */
  powerupActivationScale: 2.4,
  powerupActivationDurationMs: 300,

  /** Final-second expiry warning: subtle pulses of the EXISTING ring/aura. */
  expiryWarnWindowMs: 1000,
  expiryPulseDurationMs: 250,
} as const;
