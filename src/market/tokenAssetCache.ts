import type { DailyTokenSpec } from "./dailyTokenTypes";

/**
 * Token logo preloader/cache (Phase 11B). Loads at most the 15 selected logos
 * BEFORE a run starts (never during one), keyed by CoinGecko ID and scoped to a
 * challenge date so replays of the same day reuse the loaded images. A broken
 * logo never blocks the game — the scene falls back to a procedural disc.
 *
 * Images are loaded with crossOrigin="anonymous" so Phaser can safely use them
 * as canvas textures (CoinGecko's asset CDN sends CORS headers).
 */
const PRELOAD_TIMEOUT_MS = 5000;

let cacheDate: string | null = null;
const images = new Map<string, HTMLImageElement>();

/** Stable Phaser texture key for a token. */
export function tokenTextureKey(id: string): string {
  return `token:${id}`;
}

/** Loaded (and canvas-safe) image for a token, if preloading succeeded. */
export function getTokenImage(id: string): HTMLImageElement | null {
  return images.get(id) ?? null;
}

function resetFor(date: string): void {
  if (cacheDate !== date) {
    images.clear();
    cacheDate = date;
  }
}

function loadOne(spec: DailyTokenSpec): Promise<void> {
  return new Promise((resolve) => {
    if (images.has(spec.id) || !spec.imageUrl.startsWith("https://")) {
      resolve();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth > 0) images.set(spec.id, img);
      resolve();
    };
    img.onerror = () => resolve(); // broken logo → procedural fallback later
    img.src = spec.imageUrl;
  });
}

/**
 * Preload the challenge's logos with a global timeout. Always resolves — the
 * run must be able to start even if some (or all) logos failed.
 */
export async function preloadTokenLogos(
  challengeDate: string,
  tokens: DailyTokenSpec[],
): Promise<void> {
  resetFor(challengeDate);
  const pending = tokens.filter((t) => !images.has(t.id));
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(pending.map(loadOne)).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
  ]);
}
