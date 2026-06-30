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
