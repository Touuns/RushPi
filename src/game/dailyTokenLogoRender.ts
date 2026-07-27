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
 *
 * Phase 12C-1B2C-2D2C-A adds `resolveTokenLogoLayout`: the single shared size
 * calculation that folds a token's presentation rule (dailyTokenLogoPresentation.ts)
 * on top of the fit-to-box scale, plus an optional backing-plate diameter. It
 * stays in this Phaser-free file for the same testability reason as everything
 * else here — dailyTokens.ts only calls it and draws whatever it returns.
 */
import {
  resolveTokenLogoPresentationRule,
  type TokenLogoPresentationRule,
} from "./dailyTokenLogoPresentation.ts";

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

const LOGO_TEXTURE_KEY_PATTERN = /^token-logo:([a-z0-9-]+):v\d+$/;

/**
 * Extract the canonical tokenId embedded in a resolved Daily logo texture key
 * (`token-logo:<tokenId>:v<logoVersion>` — the exact shape produced only by
 * `dailyTokenLogoTextureKey` in dailyLogoPreload.ts). A key that doesn't match
 * that shape returns null, so a foreign/malformed key safely falls back to the
 * default presentation rule instead of guessing a tokenId from it.
 */
export function tokenIdFromLogoTextureKey(key: string | null | undefined): string | null {
  if (typeof key !== "string") return null;
  const match = LOGO_TEXTURE_KEY_PATTERN.exec(key);
  return match ? match[1] : null;
}

/** Resolved on-screen sizing for a Daily logo image plus its optional backing plate. */
export interface TokenLogoLayout {
  /** Uniform image scale: fit-to-box (aspect preserved) times the rule's scaleMultiplier. */
  readonly scale: number;
  readonly backingPlate: { readonly diameter: number; readonly tone: "warm-neutral" } | null;
}

/**
 * The single shared size calculation for the render switch (Phase 12C-1B2C-2D2C-A):
 * the existing aspect-ratio-preserving fit-to-box scale, adjusted by the token's
 * presentation rule (resolved from the tokenId embedded in `logoTextureKey`), plus
 * the optional backing-plate diameter (as a fraction of `faceDiameter`). No rule for
 * the tokenId reproduces the exact Phase 2D2B scale and a null backing plate.
 */
export function resolveTokenLogoLayout(
  logoTextureKey: string | null | undefined,
  sourceWidth: number,
  sourceHeight: number,
  box: number,
  faceDiameter: number,
): TokenLogoLayout {
  const tokenId = tokenIdFromLogoTextureKey(logoTextureKey);
  const rule: TokenLogoPresentationRule = resolveTokenLogoPresentationRule(tokenId);
  const scale = logoDisplayScale(sourceWidth, sourceHeight, box) * rule.scaleMultiplier;
  const backingPlate = rule.backingPlate
    ? { diameter: faceDiameter * rule.backingPlate.relativeDiameter, tone: rule.backingPlate.tone }
    : null;
  return { scale, backingPlate };
}
