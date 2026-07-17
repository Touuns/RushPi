import Phaser from "phaser";

/**
 * Phase 12A-2 — Daily production visual assets (background, Chain Block, Finish
 * Portal). Loads the selected raster BEFORE Phaser starts and registers it into
 * each scene's TextureManager under a stable, resolution-independent key.
 *
 * Rules (mirrors src/market/tokenAssetCache.ts, kept separate — the logo cache
 * is untouched):
 *  - purely VISUAL: never consumes an RNG draw, never changes position/scale/
 *    collision, never added to `this.objects`;
 *  - never fetches during a run (only via the Daily preparation preload);
 *  - always resolves — any failed image simply falls back to the procedural art;
 *  - the module-level cache keeps the selected HTMLImageElement across runs; the
 *    Phaser TextureManager (recreated per game) is re-populated each scene.
 *
 * Resolution is chosen ONCE per device from stable signals (DPR + a coarse
 * low-end heuristic), never from randomness. Only the ACTIVE variant of each
 * logical asset is fetched/registered — we never keep two Daily backgrounds in
 * the TextureManager.
 */

/** Stable texture keys used by the scene, independent of the chosen resolution. */
export const PROD_TEXTURE_KEYS = {
  dailyBackground: "prod:daily-bg",
  chainBlock: "prod:chain-block",
  finishPortal: "prod:finish-portal",
} as const;
export type ProdTextureKey = (typeof PROD_TEXTURE_KEYS)[keyof typeof PROD_TEXTURE_KEYS];

const BASE = "/assets/rushpi/production";

/**
 * All seven runtime paths are referenced here. `activePaths()` selects exactly
 * one variant per logical asset for the current device.
 */
const PATHS = {
  dailyBackground: {
    normal: `${BASE}/backgrounds/daily-market-tunnel-production-414w.webp`,
    high: `${BASE}/backgrounds/daily-market-tunnel-production-828w.webp`,
  },
  finishPortal: {
    normal: `${BASE}/portals/finish-portal-production-256w.png`,
    high: `${BASE}/portals/finish-portal-production-512w.png`,
  },
  chainBlock: {
    low: `${BASE}/collectibles/chain-block-production-32w.png`,
    normal: `${BASE}/collectibles/chain-block-production-64w.png`,
    high: `${BASE}/collectibles/chain-block-production-128w.png`,
  },
} as const;

type Tier = "low" | "normal" | "high";
let deviceTier: Tier | null = null;

/**
 * Device resolution tier, computed once and cached (deterministic, no Math.random):
 *  - high   : hi-DPI screen (devicePixelRatio >= 2) → 828 / 512 / 128;
 *  - low    : coarse low-end heuristic (deviceMemory <= 2 GB or <= 2 cores) → 32
 *             chain block (background/portal have no "low" file → they use normal);
 *  - normal : everything else → 414 / 256 / 64.
 */
export function resolveDeviceTier(): Tier {
  if (deviceTier) return deviceTier;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const mem = (nav as { deviceMemory?: number } | undefined)?.deviceMemory;
  const cores = nav?.hardwareConcurrency ?? 4;
  const lowEnd = (typeof mem === "number" && mem <= 2) || cores <= 2;
  deviceTier = dpr >= 2 ? "high" : lowEnd ? "low" : "normal";
  return deviceTier;
}

/** The single active path per logical asset for the current device. */
function activePaths(): Record<ProdTextureKey, string> {
  const t = resolveDeviceTier();
  return {
    [PROD_TEXTURE_KEYS.dailyBackground]:
      t === "high" ? PATHS.dailyBackground.high : PATHS.dailyBackground.normal,
    [PROD_TEXTURE_KEYS.finishPortal]:
      t === "high" ? PATHS.finishPortal.high : PATHS.finishPortal.normal,
    [PROD_TEXTURE_KEYS.chainBlock]:
      t === "high"
        ? PATHS.chainBlock.high
        : t === "low"
          ? PATHS.chainBlock.low
          : PATHS.chainBlock.normal,
  };
}

/** Flat list of every declared runtime path (all seven), for tooling/tests. */
export function allProductionPaths(): string[] {
  return [
    PATHS.dailyBackground.normal,
    PATHS.dailyBackground.high,
    PATHS.finishPortal.normal,
    PATHS.finishPortal.high,
    PATHS.chainBlock.low,
    PATHS.chainBlock.normal,
    PATHS.chainBlock.high,
  ];
}

const GROUP_TIMEOUT_MS = 5000;
// Cache of decoded images, keyed by resolved path — survives across Phaser runs.
const images = new Map<string, HTMLImageElement>();

function loadOne(path: string): Promise<void> {
  return new Promise((resolve) => {
    if (images.has(path)) {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (img.naturalWidth > 0) images.set(path, img);
      resolve();
    };
    img.onerror = () => resolve(); // failure → procedural fallback later
    img.src = path; // same-origin: no CORS needed
  });
}

/**
 * Preload the active production images (one per logical asset). Runs in the Daily
 * preparation screen, in parallel with the token logos. Always resolves within
 * the group timeout; a failed asset just stays absent (procedural fallback).
 */
export async function preloadDailyProductionAssets(): Promise<void> {
  const pending = Object.values(activePaths()).filter((p) => !images.has(p));
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(pending.map(loadOne)).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, GROUP_TIMEOUT_MS)),
  ]);
}

/** Loaded image for a logical key at the active resolution, or null if absent. */
export function getProductionImage(key: ProdTextureKey): HTMLImageElement | null {
  return images.get(activePaths()[key]) ?? null;
}

/**
 * Register the loaded production images into a scene's TextureManager under the
 * stable keys. Called in MainScene.create() every run (the TextureManager is
 * recreated per Phaser game). Missing images are skipped, so the scene keeps its
 * procedural art. Never uses the Phaser loader; never fetches over the network.
 */
export function registerDailyProductionTextures(scene: Phaser.Scene): void {
  for (const key of Object.values(PROD_TEXTURE_KEYS)) {
    if (scene.textures.exists(key)) continue;
    const img = getProductionImage(key);
    if (img) scene.textures.addImage(key, img);
  }
}
