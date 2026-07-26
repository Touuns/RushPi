/**
 * Phase 12C-1B2C-2D2A — Daily token-logo PRELOAD (no render switch).
 *
 * Bridges the browser-safe logo manifest client layer (src/logos/*) to the
 * Daily startup pipeline. Its ONLY job is to make the correct verified logo
 * PNGs available inside Phaser's TextureManager BEFORE a Daily run begins.
 *
 * Explicitly NOT this phase:
 *  - it renders nothing (nothing reads the `token-logo:*` keys yet);
 *  - it never replaces the CoinGecko logo cache (src/market/tokenAssetCache.ts),
 *    which keeps driving the current token art;
 *  - the procedural/CoinGecko token rendering in src/game/dailyTokens.ts and
 *    MainScene stays byte-identical.
 *
 * Shape mirrors the proven two-stage flow of src/game/productionAssets.ts:
 *   1. preload HTMLImageElements into a module cache during DailyPreparationScreen;
 *   2. register them into the Phaser TextureManager at game boot.
 * Always resolves — a logo failure (manifest, mapping, missing entry, PNG load,
 * or timeout) NEVER blocks the claim, the run, or gameplay.
 *
 * Phaser is imported as a TYPE only, so this module has zero Phaser runtime
 * dependency and stays importable/unit-testable outside the browser.
 */
import type Phaser from "phaser";
import type { DailyTokenSpec } from "../market/dailyTokenTypes";
import {
  fetchTokenLogoManifest,
  resolveTokenIdFromCoinGeckoId,
  lookupManifestEntry,
  resolvePreferredLogoAsset,
  type TokenLogoManifestFetchResult,
  type TokenLogoManifestIndex,
  type LogoDensityPreference,
} from "../logos/index.ts";

/** Group timeout for the whole preload — mirrors tokenAssetCache/productionAssets. */
const PRELOAD_TIMEOUT_MS = 5000;

// 1×1 transparent PNG assigned to a cancelled Image to abort its in-flight
// same-origin request WITHOUT triggering a request to the current document
// (which `img.src = ""` would). Local decode only, no network.
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const DEV = import.meta.env?.DEV === true;

/**
 * Deterministic Phaser texture key for a preloaded token logo. Derived ONLY
 * from the canonical tokenId + logoVersion — never from the filename/hash — so
 * the key is stable across manifest re-hashes as long as the logo content
 * version is unchanged. Example: token-logo:rpt-0001:v1.
 */
export function dailyTokenLogoTextureKey(tokenId: string, logoVersion: number): string {
  return `token-logo:${tokenId}:v${logoVersion}`;
}

/** One resolved logo the preloader intends to fetch and cache. */
export interface LogoPreloadPlanEntry {
  readonly coingeckoId: string;
  readonly tokenId: string;
  readonly logoVersion: number;
  readonly browserPath: string;
  readonly textureKey: string;
}

/** Pure resolution result: what to load, plus what was skipped (and why). */
export interface LogoPreloadPlan {
  readonly plan: readonly LogoPreloadPlanEntry[];
  readonly selectedTokenIds: readonly string[];
  readonly unknownCoinGeckoIds: readonly string[];
  readonly missingManifestTokenIds: readonly string[];
}

/**
 * Resolve the Daily challenge tokens to a concrete preload plan — PURE, no I/O.
 *
 *   CoinGecko id  →  tokenId (map)  →  manifest entry  →  preferred asset.
 *
 * Selects only the challenge's tokens (never all 11), de-duplicates by texture
 * key, and records every skip so the caller can report it:
 *  - unknown CoinGecko id  → no tokenId mapping  → skipped silently;
 *  - resolved tokenId with no manifest entry     → skipped silently.
 */
export function resolveDailyLogoPreloadPlan(
  tokens: readonly DailyTokenSpec[],
  index: TokenLogoManifestIndex,
  density: LogoDensityPreference,
): LogoPreloadPlan {
  const plan: LogoPreloadPlanEntry[] = [];
  const selectedTokenIds: string[] = [];
  const unknownCoinGeckoIds: string[] = [];
  const missingManifestTokenIds: string[] = [];
  const seenKeys = new Set<string>();

  for (const token of tokens) {
    const tokenId = resolveTokenIdFromCoinGeckoId(token.id);
    if (!tokenId) {
      unknownCoinGeckoIds.push(token.id);
      continue;
    }
    selectedTokenIds.push(tokenId);

    const entry = lookupManifestEntry(index, tokenId);
    if (!entry) {
      missingManifestTokenIds.push(tokenId);
      continue;
    }

    const asset = resolvePreferredLogoAsset(entry, density);
    const textureKey = dailyTokenLogoTextureKey(entry.tokenId, entry.logoVersion);
    if (seenKeys.has(textureKey)) continue; // never queue the same key twice
    seenKeys.add(textureKey);
    plan.push({
      coingeckoId: token.id,
      tokenId: entry.tokenId,
      logoVersion: entry.logoVersion,
      browserPath: asset.browserPath,
      textureKey,
    });
  }

  return { plan, selectedTokenIds, unknownCoinGeckoIds, missingManifestTokenIds };
}

/** Outcome of a preload pass — everything the DEBUG report needs. */
export interface DailyLogoPreloadResult {
  readonly manifestOk: boolean;
  readonly timedOut: boolean;
  readonly selectedTokenIds: readonly string[];
  readonly resolvedLogoCount: number;
  readonly loadedTextureKeys: readonly string[];
  readonly failedTextureKeys: readonly string[];
  readonly unknownCoinGeckoIds: readonly string[];
  readonly missingManifestTokenIds: readonly string[];
}

/** Minimal image contract — real `Image` in the browser, faked in tests. */
export interface PreloadImageLike {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  decoding?: "async" | "sync" | "auto";
  naturalWidth: number;
  src: string;
}

/** Injection seams (all defaulted) so the pipeline is fully unit-testable. */
export interface DailyLogoPreloadDeps {
  readonly fetchManifest?: () => Promise<TokenLogoManifestFetchResult>;
  readonly createImage?: () => PreloadImageLike;
  readonly density?: LogoDensityPreference;
  readonly timeoutMs?: number;
  readonly debug?: (event: string, data?: Record<string, unknown>) => void;
}

/** DPR-based density signal, guarded for non-browser (SSR/test) contexts. */
function defaultDensityPreference(): LogoDensityPreference {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return dpr >= 2 ? "high-density" : "standard";
}

function defaultCreateImage(): PreloadImageLike {
  return new Image() as unknown as PreloadImageLike;
}

function defaultDebug(event: string, data?: Record<string, unknown>): void {
  if (DEV) console.debug(`[daily-logo-preload] ${event}`, data ?? {});
}

// Decoded logo images, keyed by deterministic texture key. Scoped to a
// challengeDate so a replay of the same day reuses images (no duplicate load),
// and a new day clears the cache. Survives across Phaser runs, like the
// production-asset and CoinGecko caches.
const cache = new Map<string, PreloadImageLike>();
let cacheDate: string | null = null;
let lastResult: DailyLogoPreloadResult | null = null;

// Presentation-only lookup for the render switch (Phase 12C-1B2C-2D2B): maps a
// Daily token's CoinGecko id to its canonical logo texture key
// (token-logo:<tokenId>:v<logoVersion>) as ALREADY resolved by the preload plan.
// The renderer reads this instead of re-parsing the manifest or inferring by
// symbol; the key is only a candidate — the renderer still confirms the texture
// exists in Phaser before using it. Never leaves the client, never enters a
// score digest or ranked payload.
const logoTextureKeyByCoinGeckoId = new Map<string, string>();

function resetForChallenge(date: string): void {
  if (cacheDate !== date) {
    cache.clear();
    logoTextureKeyByCoinGeckoId.clear();
    cacheDate = date;
  }
}

interface CancelableLoad {
  cancel: () => void;
}

/**
 * Load the plan's PNGs into the module cache with a TERMINAL group timeout.
 * Each load settles exactly once; on timeout every still-active load is
 * cancelled (request aborted via a local data URI, no late cache write, no new
 * request) so nothing keeps loading once startup continues.
 */
async function loadPlanImages(
  entries: readonly LogoPreloadPlanEntry[],
  createImage: () => PreloadImageLike,
  timeoutMs: number,
): Promise<{ loaded: string[]; failed: string[]; timedOut: boolean }> {
  const loaded: string[] = [];
  const failed: string[] = [];
  if (entries.length === 0) return { loaded, failed, timedOut: false };

  const active = new Set<CancelableLoad>();
  let timedOut = false;

  const loadOne = (entry: LogoPreloadPlanEntry): Promise<void> =>
    new Promise<void>((resolve) => {
      const img = createImage();
      let settled = false;
      const handle: CancelableLoad = { cancel: () => {} };

      const settle = (ok: boolean): void => {
        if (settled) return;
        settled = true;
        img.onload = null;
        img.onerror = null;
        active.delete(handle);
        if (ok && img.naturalWidth > 0) {
          cache.set(entry.textureKey, img);
          loaded.push(entry.textureKey);
        } else {
          failed.push(entry.textureKey);
        }
        resolve();
      };

      handle.cancel = (): void => {
        if (settled) return;
        img.onload = null;
        img.onerror = null;
        settled = true;
        active.delete(handle);
        failed.push(entry.textureKey);
        img.src = TRANSPARENT_PIXEL; // aborts the in-flight request, no new fetch
        resolve(); // resolves without caching → no late write
      };

      img.onload = () => settle(true);
      img.onerror = () => settle(false); // broken logo → skipped silently
      active.add(handle);
      img.decoding = "async";
      img.src = entry.browserPath; // same-origin public asset, no CORS needed
    });

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      for (const h of [...active]) h.cancel();
      finish();
    }, timeoutMs);
    void Promise.all(entries.map(loadOne)).then(finish);
  });

  return { loaded, failed, timedOut };
}

/**
 * Preload the selected Daily token logos. Runs in DailyPreparationScreen, in
 * parallel with the existing CoinGecko-logo and production-asset preloads.
 * Always resolves; every failure mode degrades to "no logo cached".
 */
export async function preloadDailyTokenLogos(
  challengeDate: string,
  tokens: readonly DailyTokenSpec[],
  deps: DailyLogoPreloadDeps = {},
): Promise<DailyLogoPreloadResult> {
  const fetchManifest = deps.fetchManifest ?? fetchTokenLogoManifest;
  const createImage = deps.createImage ?? defaultCreateImage;
  const density = deps.density ?? defaultDensityPreference();
  const timeoutMs = deps.timeoutMs ?? PRELOAD_TIMEOUT_MS;
  const debug = deps.debug ?? defaultDebug;

  resetForChallenge(challengeDate);

  logoTextureKeyByCoinGeckoId.clear();

  const fetchResult = await fetchManifest();
  if (!fetchResult.ok) {
    debug("manifest-failed", { reason: fetchResult.reason });
    const result: DailyLogoPreloadResult = {
      manifestOk: false,
      timedOut: false,
      selectedTokenIds: [],
      resolvedLogoCount: 0,
      loadedTextureKeys: [],
      failedTextureKeys: [],
      unknownCoinGeckoIds: tokens.map((t) => t.id),
      missingManifestTokenIds: [],
    };
    lastResult = result;
    return result;
  }

  const { plan, selectedTokenIds, unknownCoinGeckoIds, missingManifestTokenIds } =
    resolveDailyLogoPreloadPlan(tokens, fetchResult.index, density);

  // Record the canonical CoinGecko-id → texture-key mapping for the renderer.
  // Same-key de-dup already happened in the plan; a token id may map to only one
  // texture key, so a plain overwrite is safe here.
  for (const entry of plan) {
    logoTextureKeyByCoinGeckoId.set(entry.coingeckoId, entry.textureKey);
  }

  debug("manifest-loaded", {
    catalogVersion: fetchResult.manifest.catalogVersion,
    logoReleaseVersion: fetchResult.manifest.logoReleaseVersion,
    entryCount: fetchResult.manifest.entryCount,
  });
  debug("plan", {
    selectedTokenIds,
    resolvedLogoCount: plan.length,
    textureKeys: plan.map((p) => p.textureKey),
    unknownCoinGeckoIds,
    missingManifestTokenIds,
  });

  // Only load keys not already cached (replay of the same day reuses images).
  const pending = plan.filter((p) => !cache.has(p.textureKey));
  const { failed, timedOut } = await loadPlanImages(pending, createImage, timeoutMs);

  const loadedTextureKeys = plan.map((p) => p.textureKey).filter((k) => cache.has(k));

  debug("loaded", {
    loadedTextureKeys,
    failedTextureKeys: failed,
    timedOut,
  });

  const result: DailyLogoPreloadResult = {
    manifestOk: true,
    timedOut,
    selectedTokenIds,
    resolvedLogoCount: plan.length,
    loadedTextureKeys,
    failedTextureKeys: failed,
    unknownCoinGeckoIds,
    missingManifestTokenIds,
  };
  lastResult = result;
  return result;
}

/** The most recent preload outcome (for the game-boot DEBUG report). */
export function getLastDailyLogoPreloadResult(): DailyLogoPreloadResult | null {
  return lastResult;
}

/**
 * Presentation-only resolver for the Daily render switch (Phase 12C-1B2C-2D2B).
 *
 * Returns the canonical logo texture key (token-logo:<tokenId>:v<logoVersion>)
 * that the last preload resolved for a Daily token's CoinGecko id, or null when
 * the token has no mapped/manifested logo. This is a pure map read over data the
 * preload already computed: it never fetches, never re-parses the manifest and
 * never infers from the token symbol. A returned key is only a CANDIDATE — the
 * renderer must still confirm scene.textures.exists(key) before drawing it, so a
 * logo whose PNG failed to load still degrades to the procedural collectible.
 */
export function resolveDailyTokenLogoTextureKey(coingeckoId: string): string | null {
  return logoTextureKeyByCoinGeckoId.get(coingeckoId) ?? null;
}

/**
 * Register the preloaded logo images into a Phaser TextureManager under their
 * deterministic keys, returning how many were newly added. Purely additive: it
 * NEVER renders and nothing reads these keys yet (that is the next phase).
 * Missing/failed logos are simply absent. Uses no Phaser loader and starts no
 * network request.
 */
export function registerDailyTokenLogoTextures(
  textures: Phaser.Textures.TextureManager,
): number {
  let registered = 0;
  for (const [key, img] of cache) {
    if (textures.exists(key)) continue;
    textures.addImage(key, img as unknown as HTMLImageElement);
    registered += 1;
  }
  return registered;
}

/** Test-only cache reset. Not used by production code. */
export function __resetDailyLogoPreloadCacheForTests(): void {
  cache.clear();
  logoTextureKeyByCoinGeckoId.clear();
  cacheDate = null;
  lastResult = null;
}
