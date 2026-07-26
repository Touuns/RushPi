import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  dailyTokenLogoTextureKey,
  resolveDailyLogoPreloadPlan,
  preloadDailyTokenLogos,
  registerDailyTokenLogoTextures,
  getLastDailyLogoPreloadResult,
  __resetDailyLogoPreloadCacheForTests,
  type PreloadImageLike,
  type DailyLogoPreloadDeps,
} from "./dailyLogoPreload.ts";
import { parseTokenLogoManifest } from "../logos/manifestParser.ts";
import { buildManifestIndex, type TokenLogoManifestIndex } from "../logos/manifestIndex.ts";
import type { TokenLogoManifestFetchResult } from "../logos/index.ts";
import type { DailyTokenSpec } from "../market/dailyTokenTypes.ts";

// ── Fixtures ────────────────────────────────────────────────────────────────

// Real, verified release manifest — grounds the tests in production data so the
// asset paths actually survive the strict parser (toBrowserAssetPath).
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
function spec(coingeckoId: string): DailyTokenSpec {
  order += 1;
  return {
    order,
    id: coingeckoId,
    symbol: coingeckoId.slice(0, 4),
    name: coingeckoId,
    imageUrl: `https://example.test/${coingeckoId}.png`,
    referencePriceUsd: 1,
    marketCapRank: order,
    points: 100,
    spawnTimeMs: order * 1000,
    lane: 0,
  };
}

// coingecko ids: bitcoin→rpt-0001 (in manifest), ethereum→rpt-0002 (in),
// ripple→rpt-0003 (NOT in manifest), and an unmapped id.
const BTC = "bitcoin";
const ETH = "ethereum";
const RIPPLE = "ripple";
const UNKNOWN = "totally-unknown-token-xyz";

/** Fake Image whose behaviour (onload / onerror / never-settle) is scripted. */
function fakeImageFactory(behaviour: "load" | "error" | "hang") {
  const created: FakeImage[] = [];
  const create = (): PreloadImageLike => {
    const img = new FakeImage(behaviour);
    created.push(img);
    return img;
  };
  return { create, created };
}

class FakeImage implements PreloadImageLike {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding?: "async" | "sync" | "auto";
  naturalWidth = 0;
  private _src = "";
  srcHistory: string[] = [];
  private behaviour: "load" | "error" | "hang";
  constructor(behaviour: "load" | "error" | "hang") {
    this.behaviour = behaviour;
  }
  get src(): string {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    this.srcHistory.push(value);
    if (this.behaviour === "hang") return; // never settles → drives the timeout
    // settle asynchronously, like a real image decode
    setTimeout(() => {
      if (this.behaviour === "load") {
        this.naturalWidth = 64;
        this.onload?.();
      } else {
        this.onerror?.();
      }
    }, 0);
  }
}

function fakeTextureManager() {
  const keys = new Set<string>();
  return {
    keys,
    exists: (key: string) => keys.has(key),
    addImage: (key: string, _img: HTMLImageElement) => {
      keys.add(key);
    },
  } as unknown as import("phaser").Textures.TextureManager & { keys: Set<string> };
}

function baseDeps(overrides: Partial<DailyLogoPreloadDeps> = {}): DailyLogoPreloadDeps {
  return { fetchManifest: okFetch(), density: "standard", timeoutMs: 200, ...overrides };
}

// Each test uses a distinct challengeDate so the module cache never bleeds; the
// explicit reset guards the shared lastResult too.
test.beforeEach(() => __resetDailyLogoPreloadCacheForTests());

// ── Texture keys ──────────────────────────────────────────────────────────

test("stable texture keys derive from tokenId + version, never the filename", () => {
  assert.equal(dailyTokenLogoTextureKey("rpt-0001", 1), "token-logo:rpt-0001:v1");
  assert.equal(dailyTokenLogoTextureKey("rpt-0037", 1), "token-logo:rpt-0037:v1");
  // Plan-produced keys match the format for the real manifest entries.
  const { plan } = resolveDailyLogoPreloadPlan([spec(BTC), spec(ETH)], realIndex(), "standard");
  assert.deepEqual(
    plan.map((p) => p.textureKey),
    ["token-logo:rpt-0001:v1", "token-logo:rpt-0002:v1"],
  );
});

// ── Pure plan resolution ────────────────────────────────────────────────────

test("selected subset only — never the full manifest", () => {
  const { plan, selectedTokenIds } = resolveDailyLogoPreloadPlan(
    [spec(BTC), spec(ETH)],
    realIndex(),
    "standard",
  );
  assert.equal(plan.length, 2);
  assert.deepEqual([...selectedTokenIds], ["rpt-0001", "rpt-0002"]);
});

test("unknown CoinGecko id is skipped and reported", () => {
  const { plan, unknownCoinGeckoIds } = resolveDailyLogoPreloadPlan(
    [spec(BTC), spec(UNKNOWN)],
    realIndex(),
    "standard",
  );
  assert.equal(plan.length, 1);
  assert.deepEqual([...unknownCoinGeckoIds], [UNKNOWN]);
});

test("known token with no manifest entry is skipped and reported", () => {
  const { plan, missingManifestTokenIds } = resolveDailyLogoPreloadPlan(
    [spec(BTC), spec(RIPPLE)],
    realIndex(),
    "standard",
  );
  assert.equal(plan.length, 1);
  assert.deepEqual([...missingManifestTokenIds], ["rpt-0003"]);
});

test("duplicate CoinGecko ids never queue the same key twice", () => {
  const { plan } = resolveDailyLogoPreloadPlan([spec(BTC), spec(BTC)], realIndex(), "standard");
  assert.equal(plan.length, 1);
});

test("high-density selects the 128px asset path", () => {
  const { plan } = resolveDailyLogoPreloadPlan([spec(BTC)], realIndex(), "high-density");
  assert.match(plan[0].browserPath, /\/128\//);
  assert.doesNotMatch(plan[0].browserPath, /^public\//);
});

// ── Full preload orchestration ──────────────────────────────────────────────

test("successful preload caches the selected logos", async () => {
  const { create, created } = fakeImageFactory("load");
  const result = await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: create }));

  assert.equal(result.manifestOk, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.resolvedLogoCount, 2);
  assert.deepEqual([...result.loadedTextureKeys], ["token-logo:rpt-0001:v1", "token-logo:rpt-0002:v1"]);
  assert.equal(result.failedTextureKeys.length, 0);
  // Exactly one request per selected logo — never the full manifest.
  assert.equal(created.length, 2);
});

test("manifest failure skips silently — no images requested", async () => {
  const { create, created } = fakeImageFactory("load");
  const result = await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], {
    fetchManifest: async (): Promise<TokenLogoManifestFetchResult> => ({ ok: false, reason: "http-error", status: 503 }),
    createImage: create,
    timeoutMs: 200,
  });

  assert.equal(result.manifestOk, false);
  assert.equal(result.loadedTextureKeys.length, 0);
  assert.deepEqual([...result.unknownCoinGeckoIds], [BTC, ETH]);
  assert.equal(created.length, 0);
});

test("a broken PNG is skipped, the rest still load", async () => {
  // First image errors, second loads — proves one failure never blocks others.
  let n = 0;
  const created: FakeImage[] = [];
  const create = (): PreloadImageLike => {
    const img = new FakeImage(n === 0 ? "error" : "load");
    n += 1;
    created.push(img);
    return img;
  };
  const result = await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: create }));

  assert.equal(result.loadedTextureKeys.length, 1);
  assert.equal(result.failedTextureKeys.length, 1);
  assert.equal(result.timedOut, false);
});

test("timeout continues — hanging loads are cancelled, gameplay proceeds", async () => {
  const { create, created } = fakeImageFactory("hang");
  const result = await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: create, timeoutMs: 30 }));

  assert.equal(result.timedOut, true);
  assert.equal(result.loadedTextureKeys.length, 0);
  assert.equal(result.failedTextureKeys.length, 2);
  // Cancellation aborts the request via the transparent pixel (no new fetch).
  for (const img of created) {
    assert.equal(img.srcHistory.at(-1)?.startsWith("data:image/png"), true);
  }
});

test("replaying the same day reuses the cache — no duplicate preload", async () => {
  const first = fakeImageFactory("load");
  await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: first.create }));
  assert.equal(first.created.length, 2);

  const second = fakeImageFactory("load");
  const result = await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: second.create }));
  // Same day → nothing re-requested, but the result still reports the cached keys.
  assert.equal(second.created.length, 0);
  assert.deepEqual([...result.loadedTextureKeys], ["token-logo:rpt-0001:v1", "token-logo:rpt-0002:v1"]);
});

test("no image requests happen after the preload resolves", async () => {
  const { create, created } = fakeImageFactory("load");
  await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: create }));
  const countAfterPreload = created.length;
  // Registration must not create images or start requests.
  const textures = fakeTextureManager();
  const registered = registerDailyTokenLogoTextures(textures);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(created.length, countAfterPreload);
  assert.equal(registered, 2);
  assert.equal(textures.keys.has("token-logo:rpt-0001:v1"), true);
});

test("registration is idempotent — existing keys are not re-added", async () => {
  const { create } = fakeImageFactory("load");
  await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH)], baseDeps({ createImage: create }));
  const textures = fakeTextureManager();
  assert.equal(registerDailyTokenLogoTextures(textures), 2);
  assert.equal(registerDailyTokenLogoTextures(textures), 0); // already present
});

test("DEBUG hook reports the pipeline stages", async () => {
  const events: string[] = [];
  const { create } = fakeImageFactory("load");
  await preloadDailyTokenLogos("2026-07-26", [spec(BTC), spec(ETH), spec(UNKNOWN)], baseDeps({
    createImage: create,
    debug: (event) => events.push(event),
  }));
  assert.deepEqual(events, ["manifest-loaded", "plan", "loaded"]);
  const last = getLastDailyLogoPreloadResult();
  assert.equal(last?.resolvedLogoCount, 2);
  assert.deepEqual([...(last?.unknownCoinGeckoIds ?? [])], [UNKNOWN]);
});
