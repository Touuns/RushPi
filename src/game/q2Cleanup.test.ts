import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13-Q2 — pre-13A cleanup.
 *
 * Four independent, focused corrections, pinned here so none can silently
 * regress: (A) the dead CoinGecko runtime-logo path is gone, (B) Profile shows
 * the active v3 Daily best, (C) a same-origin favicon is declared, (D) the
 * fetchPriority warning path is removed. Source-based assertions read real
 * files rather than hardcoding line numbers, so they stay meaningful as the
 * surrounding code changes.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");
const exists = (p: string) => existsSync(resolve(REPO, p));

/** Strip comments so an assertion about CODE is never satisfied by prose that
 *  merely mentions the thing being removed (several files documented the
 *  legacy path by name while explaining why it no longer applies). */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---- FIX A: the dead CoinGecko runtime-logo path is gone ------------------

test("tokenAssetCache.ts no longer exists", () => {
  assert.equal(exists("src/market/tokenAssetCache.ts"), false);
});

test("Daily preparation no longer imports or calls preloadTokenLogos", () => {
  const src = codeOnly(read("src/components/DailyPreparationScreen.tsx"));
  assert.doesNotMatch(src, /preloadTokenLogos/);
  assert.doesNotMatch(src, /tokenAssetCache/);
});

test("no runtime source registers token:<providerId> legacy textures", () => {
  const roots = ["src/game/dailyTokens.ts", "src/game/scenes/MainScene.ts"];
  for (const p of roots) {
    const src = codeOnly(read(p));
    assert.doesNotMatch(src, /registerTokenTextures/, `${p} must not reference registerTokenTextures`);
    assert.doesNotMatch(src, /tokenTextureKey/, `${p} must not reference the legacy token:<id> key`);
  }
});

test("no source file anywhere imports the deleted tokenAssetCache module", () => {
  // Comments MAY still name it historically (checked above per-file where it
  // matters); no import specifier may reference it anywhere.
  for (const p of [
    "src/components/DailyPreparationScreen.tsx",
    "src/game/dailyTokens.ts",
    "src/game/scenes/MainScene.ts",
    "src/game/dailyLogoPreload.ts",
    "src/game/productionAssets.ts",
  ]) {
    assert.doesNotMatch(read(p), /from\s+["'][^"']*tokenAssetCache["']/, p);
  }
});

test("the verified local logo preload remains wired into Daily preparation", () => {
  const src = codeOnly(read("src/components/DailyPreparationScreen.tsx"));
  assert.match(src, /preloadDailyTokenLogos\(/);
  assert.match(src, /from\s+["']\.\.\/game\/dailyLogoPreload["']/);
});

test("MainScene still resolves the local logo texture key for every spawned token", () => {
  const src = codeOnly(read("src/game/scenes/MainScene.ts"));
  assert.match(src, /resolveDailyTokenLogoTextureKey\(spec\.id\)/);
  assert.match(src, /makeTokenCollectible\(this, spec, logoTextureKey\)/);
});

test("uncovered tokens retain the unchanged procedural fallback", () => {
  const src = read("src/game/dailyTokens.ts");
  assert.match(src, /shouldRenderDailyTokenLogo/);
  assert.match(src, /Procedural fallback/i);
});

test("ResultScreen's legitimate direct imageUrl usage is untouched", () => {
  // Phase 13-Q2 removes the Phaser-side hotlink cache only; the result
  // screen's plain <img src={t.imageUrl}> token list is a different,
  // still-active consumer and must not be affected.
  const src = read("src/components/ResultScreen.tsx");
  assert.match(src, /imageUrl=\{t\.imageUrl\}/);
});

// ---- FIX B: Profile shows the active (v3) Daily best -----------------------

test("Profile's Best Daily stat reads bestDailyRulesV3Score", () => {
  const src = read("src/components/ProfileScreen.tsx");
  assert.match(src, /label="Best Daily"\s+value=\{profile\.bestDailyRulesV3Score\.toLocaleString\(\)\}/);
});

test("Profile's active Best Daily display never reads the legacy v1/v2 fields", () => {
  // Scoped to the Stat block: other legitimate mentions of these fields
  // elsewhere in the file (e.g. normalization/back-compat code) are out of
  // scope for this check, but there must be none in ProfileScreen at all,
  // since the v1/v2 bests have no separate display surface on this screen.
  const src = codeOnly(read("src/components/ProfileScreen.tsx"));
  assert.doesNotMatch(src, /profile\.bestDailyScore\b/, "must not read the legacy v1 field");
  assert.doesNotMatch(src, /profile\.bestDailyTokenRushScore\b/, "must not read the legacy v2 field");
});

test("Home and Profile agree on the same active best-score field", () => {
  assert.match(read("src/components/HomeScreen.tsx"), /profile\.bestDailyRulesV3Score/);
  assert.match(read("src/components/ProfileScreen.tsx"), /profile\.bestDailyRulesV3Score/);
});

test("no ProfileStats field was deleted by this phase", () => {
  const types = read("src/types.ts");
  for (const field of ["bestDailyScore", "bestDailyTokenRushScore", "bestDailyRulesV3Score"]) {
    assert.match(types, new RegExp(`\\b${field}\\b`), `${field} must remain a stored field`);
  }
});

// ---- FIX C: a same-origin favicon is declared ------------------------------

test("index.html declares an explicit same-origin favicon", () => {
  const html = read("index.html");
  const m = html.match(/<link\s+rel="icon"[^>]*href="([^"]+)"/);
  assert.ok(m, "index.html must declare <link rel=\"icon\">");
  const href = m![1];
  assert.doesNotMatch(href, /^https?:\/\//, "favicon must be same-origin, not a remote URL");
  assert.match(href, /^\//, "favicon href must be a root-relative same-origin path");
});

test("the declared favicon file exists locally and is a small, valid SVG", () => {
  const html = read("index.html");
  const href = html.match(/<link\s+rel="icon"[^>]*href="([^"]+)"/)![1];
  const localPath = "public" + href;
  assert.ok(exists(localPath), `${localPath} must exist`);
  const svg = read(localPath);
  assert.match(svg, /^<svg[\s>]/, "favicon must be a raw SVG document");
  assert.match(svg, /<\/svg>\s*$/);
  const bytes = Buffer.byteLength(svg, "utf8");
  assert.ok(bytes < 4096, `favicon should be small; got ${bytes} bytes`);
});

test("the favicon reproduces the established Rush Pi orb colours, no new identity", () => {
  const svg = read("public/favicon.svg");
  // Same three brand colours as .home__logo's radial-gradient (global.css).
  for (const hex of ["#ffd166", "#ff7a3d", "#8b5cf6"]) {
    assert.ok(svg.toLowerCase().includes(hex), `expected established brand colour ${hex}`);
  }
});

// ---- FIX D: the fetchPriority warning path is removed ---------------------

test("the obsolete fetchPriority JSX attribute is absent from App.tsx", () => {
  const src = codeOnly(read("src/App.tsx"));
  assert.doesNotMatch(src, /fetchPriority=/);
  assert.doesNotMatch(src, /fetchpriority=/);
});

test("the Home background image keeps eager loading without the removed hint", () => {
  const src = read("src/App.tsx");
  assert.match(src, /home-bg__img[\s\S]{0,2000}loading="eager"/);
});

// ---- Forbidden-scope guards -------------------------------------------------

test("rulesVersion remains 3", () => {
  assert.match(read("src/game/dailyRulesVersion.ts"), /export const DAILY_RULES_VERSION = 3/);
  assert.match(read("api/_lib/dailyRulesPolicy.ts"), /DAILY_RULES_VERSION_V3 = 3/);
});

test("Daily challenge generation and scoring constants are untouched", () => {
  const cfg = read("src/game/gameConfig.ts");
  assert.match(cfg, /RUN_DURATION_SECONDS = 60/);
  assert.match(cfg, /energyPoints:\s*10/);
  assert.match(cfg, /comboMaxMultiplier:\s*3/);
  assert.match(read("api/_lib/dailyTokenChallenge.ts"), /DAILY_TOKEN_COUNT = 15/);
});

test("the public logo release manifest is untouched by this phase", () => {
  const m = JSON.parse(read("public/data/token-logos/release-manifest.json"));
  assert.equal(m.entryCount, 64);
  assert.equal(m.logoReleaseVersion, "logo-release-v1-8235284b59f49250");
});
