/**
 * Phase 12C-1B2C-2D2B — pure decision + sizing helpers for the Daily logo render
 * switch. Extracted from dailyTokens.ts so the choice "project logo vs the exact
 * existing procedural collectible" is unit-testable WITHOUT a Phaser runtime
 * (dailyTokens.ts imports Phaser for real; these helpers do not import Phaser at
 * all). makeTokenCollectible does nothing more than draw whatever these decide.
 *
 * The rules encode the phase contract literally:
 *  - a logo is used ONLY when a canonical texture key was resolved AND that exact
 *    key is present in the Phaser TextureManager — no fetch, no manifest parse,
 *    no symbol inference happens here or upstream of here;
 *  - the logo is scaled to fit a bounding box while preserving aspect ratio, so
 *    it never distorts and never overflows the coin face.
 */

/** Minimal view of Phaser's TextureManager — just the existence probe we need. */
export interface TextureExistenceCheck {
  exists(key: string): boolean;
}

/**
 * True when the collectible should render the preloaded project logo. Requires a
 * concrete resolved key (unknown tokenId / missing logoVersion → null → false)
 * AND that the exact texture is registered (a PNG that failed to load or timed
 * out is absent → false). Any false result routes to the procedural fallback.
 */
export function shouldRenderDailyTokenLogo(
  textures: TextureExistenceCheck,
  logoTextureKey: string | null | undefined,
): boolean {
  return typeof logoTextureKey === "string" && logoTextureKey.length > 0
    ? textures.exists(logoTextureKey)
    : false;
}

/**
 * Uniform scale that fits a source image inside a square `box` (diameter) while
 * preserving its aspect ratio: divide the box by the LARGER source dimension.
 * Degenerate/unknown source dimensions fall back to scale 1 (the box itself),
 * never NaN/Infinity, so the draw call is always safe.
 */
export function logoDisplayScale(
  sourceWidth: number,
  sourceHeight: number,
  box: number,
): number {
  const largest = Math.max(sourceWidth || 0, sourceHeight || 0);
  if (!(largest > 0) || !(box > 0)) return 1;
  return box / largest;
}
