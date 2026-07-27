/**
 * Phase 12C-1B2C-2D2B — Daily logo RENDER SWITCH tests.
 *
 * Two isolated, browser-independent concerns (Phaser is never loaded — the
 * render itself is a thin draw over these decisions in dailyTokens.ts):
 *   1. shouldRenderDailyTokenLogo / logoDisplayScale — the pure "project logo vs
 *      the exact existing procedural collectible" decision and the aspect-ratio-
 *      preserving fit used by makeTokenCollectible;
 *   2. resolveDailyTokenLogoTextureKey — the Daily-only, canonical, no-fetch /
 *      no-symbol texture-key resolver fed by the preload plan.
 *
 * Gameplay (collision, x/y, scoring, schedule, RNG, ranked payloads) lives in
 * MainScene and is never reached here; the render switch only adds a decorative,
 * body-less child when a logo texture is present, so those stay invariant.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  shouldRenderDailyTokenLogo,
  logoDisplayScale,
  tokenIdFromLogoTextureKey,
  resolveTokenLogoLayout,
  type TextureExistenceCheck,
} from "./dailyTokenLogoRender.ts";
import {
  preloadDailyTokenLogos,
  resolveDailyTokenLogoTextureKey,
  resolveDailyLogoPreloadPlan,
  __resetDailyLogoPreloadCacheForTests,
  type PreloadImageLike,
  type DailyLogoPreloadDeps,
} from "./dailyLogoPreload.ts";
import { parseTokenLogoManifest } from "../logos/manifestParser.ts";
import { buildManifestIndex, type TokenLogoManifestIndex } from "../logos/manifestIndex.ts";
import type { TokenLogoManifestFetchResult } from "../logos/index.ts";
import type { DailyTokenSpec } from "../market/dailyTokenTypes.ts";

// ── Fixtures ────────────────────────────────────────────────────────────────

const MANIFEST_JSON = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../public/data/token-logos/release-manifest.json", import.meta.url)),
    "utf8",
  ),
) as unknown;

function realIndex(): TokenLogoManifestIndex {
  const parsed = parseTokenLogoManifest(MANIFEST_JSON);
  assert.ok(parsed.ok, "fixture manifest must parse");
  return buildManifestIndex(parsed.manifest);
}

function okFetch(): () => Promise<TokenLogoManifestFetchResult> {
  const parsed = parseTokenLogoManifest(MANIFEST_JSON);
  assert.ok(parsed.ok);
  const index = buildManifestIndex(parsed.manifest);
  return async () => ({ ok: true, manifest: parsed.manifest, index });
}

let order = 0;
function spec(coingeckoId: string, symbol = coingeckoId.slice(0, 4)): DailyTokenSpec {
  order += 1;
  return {
    order,
    id: coingeckoId,
    symbol,
    name: coingeckoId,
    imageUrl: `https://example.test/${coingeckoId}.png`,
    referencePriceUsd: 1,
    marketCapRank: order,
    points: 100,
    spawnTimeMs: order * 1000,
    lane: 0,
  };
}

const BTC = "bitcoin"; // → rpt-0001, in the manifest
const ETH = "ethereum"; // → rpt-0002, in the manifest
const RIPPLE = "ripple"; // → rpt-0003, NOT in the manifest
const UNKNOWN = "totally-unknown-token-xyz"; // no tokenId mapping at all
const BTC_KEY = "token-logo:rpt-0001:v1";

/** A texture manager stub that "has" exactly the given keys. */
function textures(...keys: string[]): TextureExistenceCheck {
  const set = new Set(keys);
  return { exists: (k) => set.has(k) };
}

// ── Render decision: project logo vs procedural ───────────────────────────────

test("cached logo texture + resolved key → renders the logo presentation", () => {
  assert.equal(shouldRenderDailyTokenLogo(textures(BTC_KEY), BTC_KEY), true);
});

test("resolved key but texture not registered (load failed/timeout) → procedural", () => {
  assert.equal(shouldRenderDailyTokenLogo(textures(), BTC_KEY), false);
});

test("absent key (unknown tokenId / missing logoVersion) → procedural", () => {
  assert.equal(shouldRenderDailyTokenLogo(textures(BTC_KEY), null), false);
  assert.equal(shouldRenderDailyTokenLogo(textures(BTC_KEY), ""), false);
});

test("non-Daily caller passes no key (undefined) → procedural", () => {
  // makeTokenCollectible's third arg defaults to null; a missing key never draws
  // a logo, which is how Training/Survival/Campaign stay on the procedural path.
  assert.equal(shouldRenderDailyTokenLogo(textures(BTC_KEY), undefined), false);
});

test("exact texture-key match is required — a different version is not reused", () => {
  assert.equal(
    shouldRenderDailyTokenLogo(textures("token-logo:rpt-0001:v2"), "token-logo:rpt-0001:v1"),
    false,
  );
});

test("no symbol-based lookup — only the exact resolved key is probed", () => {
  // Textures named like the symbol / coingecko id / legacy cache exist, but with
  // no resolved key the decision is procedural — nothing is inferred from them.
  const tex = textures("BTC", "bitcoin", "token:bitcoin");
  assert.equal(shouldRenderDailyTokenLogo(tex, null), false);
  // And a resolved key is matched verbatim, not by any symbol heuristic.
  assert.equal(shouldRenderDailyTokenLogo(textures(BTC_KEY), BTC_KEY), true);
});

test("the decision performs no network/fetch call", () => {
  const g = globalThis as unknown as { fetch?: unknown };
  const original = g.fetch;
  let calls = 0;
  g.fetch = () => {
    calls += 1;
    throw new Error("no fetch during rendering");
  };
  try {
    shouldRenderDailyTokenLogo(textures(BTC_KEY), BTC_KEY);
    shouldRenderDailyTokenLogo(textures(), BTC_KEY);
  } finally {
    g.fetch = original;
  }
  assert.equal(calls, 0);
});

// ── Logo sizing: fit inside the coin face, aspect ratio preserved ─────────────

test("square logo is scaled to exactly fill the box", () => {
  assert.equal(logoDisplayScale(64, 64, 30), 30 / 64);
});

test("non-square logo scales by its larger side (aspect preserved, no overflow)", () => {
  const box = 30;
  const s = logoDisplayScale(128, 64, box);
  assert.equal(s, box / 128);
  assert.ok(128 * s <= box + 1e-9, "width fits the box");
  assert.ok(64 * s <= box + 1e-9, "height fits within the box, uniform scale");
});

test("degenerate/unknown source dimensions yield a safe scale (never NaN/Infinity)", () => {
  assert.equal(logoDisplayScale(0, 0, 30), 1);
  assert.equal(logoDisplayScale(64, 64, 0), 1);
  assert.ok(Number.isFinite(logoDisplayScale(NaN, NaN, 30)));
});

// ── Presentation rules (Phase 12C-1B2C-2D2C-A): tokenId parsing + shared layout ──

const TAO_KEY = "token-logo:rpt-0041:v1";
const ETH_KEY = "token-logo:rpt-0002:v1";
const FACE_DIAMETER = 40; // 2 * TOKEN_RADIUS in dailyTokens.ts

test("tokenIdFromLogoTextureKey extracts the canonical tokenId from a resolved key", () => {
  assert.equal(tokenIdFromLogoTextureKey(BTC_KEY), "rpt-0001");
  assert.equal(tokenIdFromLogoTextureKey(TAO_KEY), "rpt-0041");
});

test("tokenIdFromLogoTextureKey returns null for malformed/foreign keys — no symbol matching", () => {
  assert.equal(tokenIdFromLogoTextureKey(null), null);
  assert.equal(tokenIdFromLogoTextureKey(undefined), null);
  assert.equal(tokenIdFromLogoTextureKey(""), null);
  assert.equal(tokenIdFromLogoTextureKey("TAO"), null);
  assert.equal(tokenIdFromLogoTextureKey("token:rpt-0041"), null);
  assert.equal(tokenIdFromLogoTextureKey("rpt-0041"), null);
});

test("resolveTokenLogoLayout: a token with no rule reproduces the exact 2D2B scale and no plate", () => {
  const layout = resolveTokenLogoLayout(BTC_KEY, 64, 64, 30, FACE_DIAMETER);
  assert.equal(layout.scale, logoDisplayScale(64, 64, 30));
  assert.equal(layout.backingPlate, null);
});

test("resolveTokenLogoLayout: an unresolved/foreign key falls back to the default layout", () => {
  const layout = resolveTokenLogoLayout("token-logo:rpt-9999:v1", 64, 64, 30, FACE_DIAMETER);
  assert.equal(layout.scale, logoDisplayScale(64, 64, 30));
  assert.equal(layout.backingPlate, null);
});

test("resolveTokenLogoLayout: ETH applies its scale multiplier on top of the fit-to-box scale", () => {
  const layout = resolveTokenLogoLayout(ETH_KEY, 64, 64, 30, FACE_DIAMETER);
  const base = logoDisplayScale(64, 64, 30);
  assert.ok(layout.scale > base, "ETH scale is increased over the base fit");
  assert.ok(layout.scale <= base * 1.1);
});

test("resolveTokenLogoLayout: TAO gets a scaled-up logo and a warm-neutral backing plate", () => {
  const layout = resolveTokenLogoLayout(TAO_KEY, 64, 64, 30, FACE_DIAMETER);
  const base = logoDisplayScale(64, 64, 30);
  assert.ok(layout.scale > base);
  assert.ok(layout.backingPlate);
  assert.equal(layout.backingPlate?.tone, "warm-neutral");
  assert.ok(layout.backingPlate!.diameter >= 32 && layout.backingPlate!.diameter <= 34);
});

test("resolveTokenLogoLayout: final TAO dimensions stay within the coin face bounds", () => {
  const box = 30; // TOKEN_LOGO_DIAMETER in dailyTokens.ts
  const sourceSize = 64;
  const layout = resolveTokenLogoLayout(TAO_KEY, sourceSize, sourceSize, box, FACE_DIAMETER);
  const renderedLogoSize = sourceSize * layout.scale;
  assert.ok(renderedLogoSize <= FACE_DIAMETER, "scaled logo stays within the face diameter");
  assert.ok(layout.backingPlate!.diameter <= FACE_DIAMETER, "plate stays within the face diameter");
});

test("resolveTokenLogoLayout performs no network/fetch call", () => {
  const g = globalThis as unknown as { fetch?: unknown };
  const original = g.fetch;
  let calls = 0;
  g.fetch = () => {
    calls += 1;
    throw new Error("no fetch from layout resolution");
  };
  try {
    resolveTokenLogoLayout(TAO_KEY, 64, 64, 30, FACE_DIAMETER);
    resolveTokenLogoLayout(BTC_KEY, 64, 64, 30, FACE_DIAMETER);
  } finally {
    g.fetch = original;
  }
  assert.equal(calls, 0);
});

// ── Daily-only, canonical resolver (no fetch, no symbol) ──────────────────────

function baseDeps(overrides: Partial<DailyLogoPreloadDeps> = {}): DailyLogoPreloadDeps {
  return {
    fetchManifest: okFetch(),
    createImage: () => loadingImage(),
    density: "standard",
    timeoutMs: 200,
    ...overrides,
  };
}

function loadingImage(): PreloadImageLike {
  const img: PreloadImageLike = { onload: null, onerror: null, naturalWidth: 0, src: "" };
  let stored = "";
  Object.defineProperty(img, "src", {
    get: () => stored,
    set: (v: string) => {
      stored = v;
      setTimeout(() => {
        img.naturalWidth = 64;
        img.onload?.();
      }, 0);
    },
  });
  return img;
}

test.beforeEach(() => __resetDailyLogoPreloadCacheForTests());

test("resolver returns the canonical key the preload plan produced", async () => {
  await preloadDailyTokenLogos("2026-07-27", [spec(BTC), spec(ETH)], baseDeps());
  const expected = resolveDailyLogoPreloadPlan([spec(BTC)], realIndex(), "standard").plan[0]
    .textureKey;
  assert.equal(resolveDailyTokenLogoTextureKey(BTC), expected);
  assert.equal(resolveDailyTokenLogoTextureKey(BTC), BTC_KEY);
  assert.equal(resolveDailyTokenLogoTextureKey(ETH), "token-logo:rpt-0002:v1");
});

test("resolver is keyed by CoinGecko id, never by symbol", async () => {
  await preloadDailyTokenLogos("2026-07-27", [spec(BTC, "BTC")], baseDeps());
  assert.equal(resolveDailyTokenLogoTextureKey("bitcoin"), BTC_KEY);
  assert.equal(resolveDailyTokenLogoTextureKey("BTC"), null);
  assert.equal(resolveDailyTokenLogoTextureKey("btc"), null);
});

test("resolver returns null for a token mapped but absent from the manifest", async () => {
  await preloadDailyTokenLogos("2026-07-27", [spec(BTC), spec(RIPPLE)], baseDeps());
  assert.equal(resolveDailyTokenLogoTextureKey(RIPPLE), null);
});

test("resolver returns null for an unmapped CoinGecko id", async () => {
  await preloadDailyTokenLogos("2026-07-27", [spec(BTC), spec(UNKNOWN)], baseDeps());
  assert.equal(resolveDailyTokenLogoTextureKey(UNKNOWN), null);
});

test("resolver is empty before any preload and after a reset", () => {
  __resetDailyLogoPreloadCacheForTests();
  assert.equal(resolveDailyTokenLogoTextureKey(BTC), null);
});

test("a manifest fetch failure leaves the resolver empty (no stale keys)", async () => {
  await preloadDailyTokenLogos("2026-07-27", [spec(BTC), spec(ETH)], baseDeps());
  assert.equal(resolveDailyTokenLogoTextureKey(BTC), BTC_KEY);
  await preloadDailyTokenLogos("2026-07-28", [spec(BTC)], {
    ...baseDeps(),
    fetchManifest: async () => ({ ok: false, reason: "timeout" }),
  });
  assert.equal(resolveDailyTokenLogoTextureKey(BTC), null);
});
