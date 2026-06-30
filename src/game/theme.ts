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

  white: 0xffffff,
} as const;

/** Glow alpha/blur tuning shared by the procedural draw helpers. */
export const GLOW = {
  outerAlpha: 0.18,
  outerScale: 1.9,
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
