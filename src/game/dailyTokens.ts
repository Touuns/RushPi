import Phaser from "phaser";
import { PALETTE, GLOW } from "./theme";
import { OBJECTS } from "./gameConfig";
import type { DailyTokenSpec } from "../market/dailyTokenTypes";
import { getTokenImage, tokenTextureKey } from "../market/tokenAssetCache";

/**
 * Daily Token Rush gameplay helpers (Phase 11B). MainScene orchestrates the run;
 * this module owns the token/Chain Block visuals and the deterministic obstacle
 * safety window so the scene's update() stays lean.
 *
 * Tokens are one-shot collectibles from the server manifest: fixed points, never
 * magnet-attracted, never combo-multiplied. Chain Blocks are the Daily-only
 * VISUAL skin of the ordinary energy orbs (their type stays "energy" internally,
 * so combo/magnet/energiesCollected behave exactly as before).
 */

/** Token disc radius — readable, but no bigger than an obstacle's silhouette. */
export const TOKEN_RADIUS = 20;

/**
 * Obstacle safety window around each token spawn (Bloc 4): an obstacle drawn in
 * the token's lane within [-800ms, +1200ms] of the token's spawn time is shifted
 * one lane over, deterministically, WITHOUT consuming extra RNG draws.
 */
const SAFETY_BEFORE_MS = 800;
const SAFETY_AFTER_MS = 1200;

/**
 * True if spawning an obstacle in `lane` at `elapsedMs` would sit inside a
 * token's safety window. Token spawn gaps (≥2200ms) are wider than the window
 * (2000ms), so at most one token can conflict — a single +1 lane shift resolves it.
 */
export function laneBlockedByToken(
  tokens: DailyTokenSpec[],
  elapsedMs: number,
  lane: number,
): boolean {
  return tokens.some(
    (t) =>
      t.lane === lane &&
      elapsedMs >= t.spawnTimeMs - SAFETY_BEFORE_MS &&
      elapsedMs <= t.spawnTimeMs + SAFETY_AFTER_MS,
  );
}

/**
 * Register the preloaded logo images as Phaser textures (one per token, stable
 * `token:<id>` keys). Missing/failed logos are simply skipped — the collectible
 * falls back to a procedural disc.
 */
export function registerTokenTextures(scene: Phaser.Scene, tokens: DailyTokenSpec[]): void {
  for (const spec of tokens) {
    const key = tokenTextureKey(spec.id);
    if (scene.textures.exists(key)) continue;
    const img = getTokenImage(spec.id);
    if (img) scene.textures.addImage(key, img);
  }
}

/**
 * Circular token collectible: glowing ring + dark coin face + centered logo
 * (or a procedural disc with the symbol when the texture is missing) + short
 * symbol label. A gentle pulse animates the ring only — the container's scale
 * is owned by the track projection, so we never tween it.
 */
export function makeTokenCollectible(
  scene: Phaser.Scene,
  spec: DailyTokenSpec,
): Phaser.GameObjects.Container {
  const r = TOKEN_RADIUS;
  const halo = scene.add.circle(0, 0, r * GLOW.outerScale, PALETTE.gold, GLOW.outerAlpha);
  const face = scene.add.circle(0, 0, r, 0x1b1230, 1);
  const ring = scene.add
    .circle(0, 0, r + 2, PALETTE.gold, 0)
    .setStrokeStyle(3, PALETTE.gold, 0.95);

  const parts: Phaser.GameObjects.GameObject[] = [halo, face, ring];

  const key = tokenTextureKey(spec.id);
  if (scene.textures.exists(key)) {
    const logo = scene.add.image(0, 0, key);
    const d = r * 1.55; // logo diameter inside the coin face
    logo.setDisplaySize(d, d);
    parts.push(logo);
  } else {
    // Procedural fallback: colored disc + ≤4-char symbol, no broken image ever.
    const disc = scene.add.circle(0, 0, r * 0.78, PALETTE.violet, 1);
    disc.setStrokeStyle(2, PALETTE.white, 0.85);
    const sym = scene.add
      .text(0, 0, spec.symbol.toUpperCase().slice(0, 4), {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    parts.push(disc, sym);
  }

  // Short symbol tag under the coin so tokens read as "market tokens" at a glance.
  const tag = scene.add
    .text(0, r + 9, spec.symbol.toUpperCase().slice(0, 4), {
      fontFamily: "Segoe UI, system-ui, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      color: PALETTE.goldCss,
    })
    .setOrigin(0.5)
    .setAlpha(0.9);
  parts.push(tag);

  const container = scene.add.container(0, 0, parts);

  // Subtle life: the ring pulses; scale stays untouched (projection owns it).
  scene.tweens.add({
    targets: [ring, halo],
    alpha: { from: 1, to: 0.55 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  return container;
}

/**
 * Chain Block — Daily-only visual replacement of the energy orb (Bloc 9):
 * a gold/violet rounded square with an inner chain-link stroke. Same size class
 * as the old orb; clearly distinct from round logo tokens and red diamonds.
 */
export function makeChainBlock(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const r = OBJECTS.radius;
  const halo = scene.add.circle(0, 0, r * GLOW.outerScale, PALETTE.gold, GLOW.outerAlpha);
  const size = r * 1.6;
  const body = scene.add.rectangle(0, 0, size, size, PALETTE.gold, 1);
  body.setStrokeStyle(2, PALETTE.violet, 0.95);
  // Inner "link": two small interlocking outline squares evoking a chain block.
  const linkA = scene.add
    .rectangle(-r * 0.28, 0, r * 0.62, r * 0.62, PALETTE.gold, 0)
    .setStrokeStyle(2.5, 0x2a1c4d, 0.95);
  const linkB = scene.add
    .rectangle(r * 0.28, 0, r * 0.62, r * 0.62, PALETTE.gold, 0)
    .setStrokeStyle(2.5, 0x2a1c4d, 0.95);
  return scene.add.container(0, 0, [halo, body, linkA, linkB]);
}

/** Compact price line for the collect toast / result rows. */
export function formatTokenPrice(priceUsd: number): string {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return "Price unavailable";
  if (priceUsd >= 1) {
    return `$${priceUsd.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${priceUsd.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}
