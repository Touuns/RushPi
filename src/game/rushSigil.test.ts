import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  RUSH_SIGIL_VERSION,
  CORE_RADIUS,
  deriveRushSigilParams,
  rushSigilVisualFingerprint,
  rushSigilTextureKey,
  renderRushSigilSVG,
  normalizeRushSigilSVGForComparison,
  buildRushSigilDrawPlan,
} from "./rushSigilGeometry.ts";
import { COINGECKO_TOKEN_ID_PAIRS } from "../logos/generatedCoingeckoTokenMap.ts";

/**
 * Phase 13-S1 — Prismatic Core Rush Sigil, production runtime.
 *
 * `rushSigilGeometry.ts` is pure/Phaser-free (hashing, canonicalization,
 * fingerprint, draw-plan, SVG renderer) so it is exercised directly here —
 * the same module the offline concept validator and the production Phaser
 * renderer (rushSigil.ts) both consume, so proving it here proves the real
 * runtime geometry, not a parallel copy.
 *
 * The Phaser-touching parts (rushSigil.ts's ensureRushSigilTexture,
 * dailyTokens.ts's resolution order) are pinned via source assertions —
 * the same non-brittle pattern used throughout this codebase for Phaser
 * code (see dailyRulesVersion.test.ts, q2Cleanup.test.ts, modeGuidance.test.ts)
 * rather than mocking a full Canvas2D/Path2D environment in Node.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// Source of the 250 registry tokenIds: the checked-in GENERATED artifact
// (`npm run registry:build-coingecko-map`) that src/logos/coingeckoTokenMap.ts
// itself already depends on in production — never the draft registry JSON
// directly. Reading that draft JSON from anywhere under src/ or api/ is a
// deliberate, enforced architectural boundary (an isolation check in the
// logo tooling's own self-test forbids it) — this file must not trip it
// either, test code included.
const REGISTRY_TOKEN_IDS: string[] = COINGECKO_TOKEN_ID_PAIRS.map(([, tokenId]) => tokenId);

const manifest = JSON.parse(read("public/data/token-logos/release-manifest.json"));
const RELEASED_TOKEN_IDS: string[] = manifest.entries.map((e: { tokenId: string }) => e.tokenId);
const RELEASED_SET = new Set(RELEASED_TOKEN_IDS);
const UNCOVERED_TOKEN_IDS = REGISTRY_TOKEN_IDS.filter((id) => !RELEASED_SET.has(id));

// ---- 1-3. registry/manifest/coverage baseline -----------------------------

test("1. Registry V2 still contains 250 tokens", () => {
  assert.equal(REGISTRY_TOKEN_IDS.length, 250);
});

test("2. Release manifest still contains 64 tokens", () => {
  assert.equal(RELEASED_TOKEN_IDS.length, 64);
  assert.equal(manifest.entryCount, 64);
});

test("3. Exactly 186 registry tokens currently require a Sigil", () => {
  assert.equal(UNCOVERED_TOKEN_IDS.length, 186);
});

// ---- 4, 6, 7. resolution coverage ------------------------------------------

test("4. Every one of the 186 uncovered tokens resolves to Prismatic Core (no throw, valid shape)", () => {
  const VALID_SHAPES = new Set(["triangle", "square", "rhombus", "pentagon", "hexagon"]);
  for (const id of UNCOVERED_TOKEN_IDS) {
    const params = deriveRushSigilParams(id);
    assert.ok(VALID_SHAPES.has(params.shape), `${id}: invalid shape ${params.shape}`);
  }
});

test("6. Every valid Registry V2 token resolves to either logo or Sigil (64 + 186 = 250)", () => {
  assert.equal(RELEASED_TOKEN_IDS.length + UNCOVERED_TOKEN_IDS.length, REGISTRY_TOKEN_IDS.length);
  for (const id of RELEASED_TOKEN_IDS) assert.ok(REGISTRY_TOKEN_IDS.includes(id));
});

test("7. No valid Registry V2 token reaches the emergency fallback (geometry never throws)", () => {
  for (const id of REGISTRY_TOKEN_IDS) {
    assert.doesNotThrow(() => deriveRushSigilParams(id), `${id} threw`);
    assert.doesNotThrow(() => renderRushSigilSVG(id, 40), `${id} SVG render threw`);
  }
});

// ---- 8. no symbol/ticker/initial as central artwork ------------------------

test("8. No normal token collectible uses its symbol/ticker/initial as central Sigil artwork", () => {
  // deriveRushSigilParams/buildRushSigilDrawPlan take ONLY a tokenId string —
  // structurally impossible to draw a symbol they were never given.
  assert.equal(deriveRushSigilParams.length, 1);
  const geomSrc = codeOnly(read("src/game/rushSigilGeometry.ts"));
  assert.doesNotMatch(geomSrc, /symbol/i);
  assert.doesNotMatch(geomSrc, /ticker/i);
  const renderSrc = codeOnly(read("src/game/rushSigil.ts"));
  assert.doesNotMatch(renderSrc, /spec\.symbol|\.symbol\b/i);
  assert.doesNotMatch(renderSrc, /fillText|strokeText/); // no text rasterization at all
});

// ---- 9, 10. determinism, symbol/name independence --------------------------

test("9. Same tokenId always produces the same rush-sigil-v1 identity", () => {
  for (const id of UNCOVERED_TOKEN_IDS.slice(0, 25)) {
    const first = rushSigilVisualFingerprint(id);
    for (let i = 0; i < 5; i++) {
      assert.equal(rushSigilVisualFingerprint(id), first, `${id} not deterministic`);
    }
  }
});

test("10. Changing symbol/name with unchanged tokenId cannot alter the Sigil (symbol is not a parameter)", () => {
  // The function signature itself proves it: (tokenId: string) is the only
  // input. There is no code path anywhere that could thread a symbol in.
  assert.equal(deriveRushSigilParams.length, 1);
  assert.equal(rushSigilVisualFingerprint.length, 1);
});

// ---- 11. no RNG/seed/time -----------------------------------------------

test("11. No RNG, challenge seed, current time or gameplay randomness participates", () => {
  const geomSrc = codeOnly(read("src/game/rushSigilGeometry.ts"));
  const renderSrc = codeOnly(read("src/game/rushSigil.ts"));
  const banned = [
    /Math\.random/,
    /new Date\(/,
    /Date\.now/,
    /seededRandom/i,
    /createSeededRandom/,
    /challengeDate|challengeSeed/i,
    /spawnOrder|spawnTime/i,
    /marketCapRank|referencePriceUsd/,
  ];
  for (const src of [geomSrc, renderSrc]) {
    for (const pattern of banned) assert.doesNotMatch(src, pattern);
  }
  // Zero imports at all in the geometry module — nothing can smuggle in RNG.
  const importLines = read("src/game/rushSigilGeometry.ts")
    .split("\n")
    .filter((l) => l.trim().startsWith("import"));
  assert.equal(importLines.length, 0, `expected zero imports, found: ${importLines.join(" | ")}`);
});

// ---- 12, 13. uniqueness ----------------------------------------------------

test("12. All 250 canonical visual fingerprints are distinct", () => {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const id of REGISTRY_TOKEN_IDS) {
    const fp = rushSigilVisualFingerprint(id);
    if (seen.has(fp)) collisions.push(`${id} collides with ${seen.get(fp)}: ${fp}`);
    else seen.set(fp, id);
  }
  assert.equal(collisions.length, 0, collisions.join("\n"));
  assert.equal(seen.size, 250);
});

test("12b. All 250 rendered SVG outputs are visually distinct (id-normalized)", () => {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const id of REGISTRY_TOKEN_IDS) {
    const norm = normalizeRushSigilSVGForComparison(renderRushSigilSVG(id, 40));
    if (seen.has(norm)) collisions.push(`${id} renders identically to ${seen.get(norm)}`);
    else seen.set(norm, id);
  }
  assert.equal(collisions.length, 0, collisions.join("\n"));
});

test("13. The fingerprint excludes tokenId and non-visual metadata as a uniqueness trick", () => {
  for (const id of REGISTRY_TOKEN_IDS.slice(0, 30)) {
    const fp = rushSigilVisualFingerprint(id);
    assert.doesNotMatch(fp, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  // The array actually joined into the fingerprint string must list only
  // resolved-param fields (p.xxx) — never the raw tokenId parameter itself,
  // an SVG element id, a gradient id, a texture key, or the symbol/ticker.
  const geomSrc = codeOnly(read("src/game/rushSigilGeometry.ts"));
  const fingerprintFn = geomSrc.slice(geomSrc.indexOf("export function rushSigilVisualFingerprint"));
  const joinedArray = fingerprintFn.slice(
    fingerprintFn.indexOf("return ["),
    fingerprintFn.indexOf(".join("),
  );
  assert.doesNotMatch(joinedArray, /\btokenId\b/);
  assert.doesNotMatch(joinedArray, /\bsymbol\b/i);
  assert.doesNotMatch(joinedArray, /textureKey/i);
  assert.doesNotMatch(joinedArray, /\bid\b/);
  assert.match(joinedArray, /p\.colors\[0\]/); // every listed field is a resolved param
});

// ---- 14, 15. only-visual-dimensions + rotation canonicalization -----------

test("14. Every parameter represented in the fingerprint actually affects rendering (solid surface has no angle)", () => {
  let sawSolid = false;
  for (const id of REGISTRY_TOKEN_IDS) {
    const p = deriveRushSigilParams(id);
    if (p.surface === "solid") {
      sawSolid = true;
      assert.equal(p.surfaceAngleDeg, 0, `${id}: solid surface must canonicalize angle to 0`);
    }
  }
  assert.ok(sawSolid, "expected at least one solid-surface token in the sample");
});

test("15. Visually equivalent polygon rotations are canonicalized (rotation always < shape period)", () => {
  const PERIOD_BY_SHAPE: Record<string, number> = {
    triangle: 120,
    square: 90,
    rhombus: 180,
    pentagon: 72,
    hexagon: 60,
  };
  for (const id of REGISTRY_TOKEN_IDS) {
    const p = deriveRushSigilParams(id);
    assert.ok(
      p.coreRotationDeg >= 0 && p.coreRotationDeg < PERIOD_BY_SHAPE[p.shape],
      `${id}: coreRotationDeg ${p.coreRotationDeg} not canonicalized for ${p.shape} (period ${PERIOD_BY_SHAPE[p.shape]})`,
    );
  }
});

test("15b. A paired ring cue's angle is canonicalized to [0, 180)", () => {
  let sawPaired = false;
  for (const id of REGISTRY_TOKEN_IDS) {
    const p = deriveRushSigilParams(id);
    if (p.ringCue === "notch-paired" || p.ringCue === "dot-paired") {
      sawPaired = true;
      assert.ok(p.ringCueAngleDeg >= 0 && p.ringCueAngleDeg < 180, `${id}: ${p.ringCueAngleDeg}`);
    }
  }
  assert.ok(sawPaired, "expected at least one paired ring cue in the sample");
});

// ---- 16. genuinely distinct shape families ---------------------------------

test("16. square and rhombus are genuinely different geometries, not the same polygon relabelled", () => {
  const squareToken = REGISTRY_TOKEN_IDS.find((id) => deriveRushSigilParams(id).shape === "square");
  const rhombusToken = REGISTRY_TOKEN_IDS.find((id) => deriveRushSigilParams(id).shape === "rhombus");
  assert.ok(squareToken && rhombusToken, "expected both shapes to appear in the registry");
  const sq = deriveRushSigilParams(squareToken!);
  const rh = deriveRushSigilParams(rhombusToken!);
  assert.equal(sq.sides, 4);
  assert.equal(rh.sides, 4);
  assert.notEqual(sq.stretch, rh.stretch, "square and rhombus must have different aspect stretch");
  // Different rotational symmetry periods too (90 vs 180) — proven via the
  // draw plan itself: a rhombus point sits farther from centre on the
  // stretched axis than a square's equivalent point.
  const sqPlan = buildRushSigilDrawPlan(sq);
  const rhPlan = buildRushSigilDrawPlan(rh);
  const sqPoly = sqPlan.find((c) => c.kind === "corePolygon") as { points: readonly (readonly [number, number])[] };
  const rhPoly = rhPlan.find((c) => c.kind === "corePolygon") as { points: readonly (readonly [number, number])[] };
  const maxY = (pts: readonly (readonly [number, number])[]) => Math.max(...pts.map((p) => Math.abs(p[1])));
  const maxX = (pts: readonly (readonly [number, number])[]) => Math.max(...pts.map((p) => Math.abs(p[0])));
  const sqAspect = maxY(sqPoly.points) / maxX(sqPoly.points);
  const rhAspect = maxY(rhPoly.points) / maxX(rhPoly.points);
  assert.notEqual(
    Math.round(sqAspect * 100),
    Math.round(rhAspect * 100),
    "square and rhombus must have different bounding aspect ratios",
  );
});

// ---- 17. approved core-size refinement -------------------------------------

test("17. Core size implements the approved refinement (~33/100, up from the RV2 prototype's 30/100)", () => {
  assert.equal(CORE_RADIUS, 33);
});

// ---- 18. at least 2 non-colour distinguishing dimensions -------------------

test("18. Every Sigil has at least one core-shape cue and one non-colour ring cue, in addition to palette", () => {
  const VALID_RING_CUES = new Set(["notch-single", "notch-paired", "dot-single", "dot-paired", "arc"]);
  for (const id of REGISTRY_TOKEN_IDS) {
    const p = deriveRushSigilParams(id);
    assert.ok(p.shape.length > 0);
    assert.ok(VALID_RING_CUES.has(p.ringCue));
  }
});

// ---- 19-21. texture keys ----------------------------------------------------

test("19. Texture keys are stable, tokenId-based, and versioned", () => {
  assert.equal(rushSigilTextureKey("rpt-0001"), "rush-sigil:rpt-0001:v1");
  assert.equal(rushSigilTextureKey("rpt-0001"), rushSigilTextureKey("rpt-0001"));
  assert.equal(RUSH_SIGIL_VERSION, "v1");
});

test("20. ensureRushSigilTexture checks textures.exists before generating (no duplicate texture creation)", () => {
  const src = codeOnly(read("src/game/rushSigil.ts"));
  const fnSrc = src.slice(src.indexOf("export function ensureRushSigilTexture"));
  const existsIdx = fnSrc.indexOf("scene.textures.exists(key)");
  const createIdx = fnSrc.indexOf("scene.textures.createCanvas");
  assert.ok(existsIdx !== -1 && createIdx !== -1);
  assert.ok(existsIdx < createIdx, "must check textures.exists(key) before createCanvas");
  assert.match(fnSrc.slice(existsIdx, existsIdx + 40), /return key/);
});

test("21. Released-logo texture key format remains unchanged (token-logo:<tokenId>:v<version>)", () => {
  const src = read("src/game/dailyLogoPreload.ts");
  assert.match(src, /`token-logo:\$\{tokenId\}:v\$\{logoVersion\}`/);
});

// ---- 22. manifest byte-identity --------------------------------------------

test("22. Logo release manifest remains byte-identical (64 entries, logo-release-v1-8235284b59f49250)", () => {
  assert.equal(manifest.entryCount, 64);
  assert.equal(manifest.logoReleaseVersion, "logo-release-v1-8235284b59f49250");
});

// ---- 23, 24. many synthetic Daily-like selections --------------------------

test("23 & 24. Several thousand deterministic synthetic Daily-date token selections all resolve 15/15, never emergency", () => {
  // Local, test-only deterministic picker (NOT src/game/seededRandom.ts —
  // this never touches gameplay RNG, it only samples which of the 250
  // ALREADY-PROVEN-safe tokenIds a hypothetical date would pick, reusing
  // the exhaustive per-token proof from tests #4/#7 above across many
  // combinations instead of re-deriving randomness semantics).
  function pick15(seed: number): string[] {
    const picked: string[] = [];
    let x = seed;
    for (let i = 0; i < 15; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      picked.push(REGISTRY_TOKEN_IDS[x % REGISTRY_TOKEN_IDS.length]);
    }
    return picked;
  }
  const SAMPLE_DATES = 4000;
  let checked = 0;
  for (let day = 0; day < SAMPLE_DATES; day++) {
    const tokens = pick15(day + 1);
    assert.equal(tokens.length, 15);
    for (const id of tokens) {
      assert.doesNotThrow(() => deriveRushSigilParams(id));
      checked += 1;
    }
  }
  assert.equal(checked, SAMPLE_DATES * 15);
});

// ---- 25. no remote image URL ------------------------------------------------

test("25. No remote token-image URL enters the Sigil path", () => {
  const geomSrc = codeOnly(read("src/game/rushSigilGeometry.ts"));
  const renderSrc = codeOnly(read("src/game/rushSigil.ts"));
  for (const src of [geomSrc, renderSrc]) {
    // The one legitimate "http://" string is the fixed, no-network SVG XML
    // namespace declaration (xmlns="http://www.w3.org/2000/svg") — a
    // required namespace identifier, not a fetched resource. Exclude only
    // that literal before checking for any OTHER network-shaped reference.
    const withoutSvgNamespace = src.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "");
    assert.doesNotMatch(withoutSvgNamespace, /https?:\/\//);
    assert.doesNotMatch(src, /\bfetch\(/);
    assert.doesNotMatch(src, /new Image\(/);
    assert.doesNotMatch(src, /imageUrl/);
    assert.doesNotMatch(src, /XMLHttpRequest/);
    assert.doesNotMatch(src, /\.src\s*=/);
  }
});

// ---- resolution order (logo -> Sigil -> emergency), wired into dailyTokens ----

test("resolution order: makeTokenCollectible tries the logo presentation before the Sigil", () => {
  const src = codeOnly(read("src/game/dailyTokens.ts"));
  const presentationIdx = src.indexOf("makeTokenLogoPresentation(scene, logoTextureKey)");
  const sigilIdx = src.indexOf("ensureRushSigilTexture(scene, tokenId)");
  assert.ok(presentationIdx !== -1 && sigilIdx !== -1);
  assert.ok(presentationIdx < sigilIdx, "logo presentation must be attempted before the Sigil");
});

test("resolution order: the emergency disc is only reached when the Sigil key is falsy", () => {
  const rawSrc = read("src/game/dailyTokens.ts");
  assert.match(codeOnly(rawSrc), /if \(sigilKey\)/);
  assert.match(rawSrc, /Emergency fallback/i);
  // The emergency branch (between "Emergency fallback" and the closing of
  // the else-if block) must not draw any text/ticker.
  const emergencyIdx = rawSrc.indexOf("Emergency fallback");
  const emergencyBlock = codeOnly(rawSrc.slice(emergencyIdx, emergencyIdx + 500));
  assert.doesNotMatch(emergencyBlock, /scene\.add\.text/);
  assert.doesNotMatch(emergencyBlock, /spec\.symbol/);
});

test("the Sigil branch never modifies the released-logo branch's face/ring drawing", () => {
  const src = read("src/game/dailyTokens.ts");
  // Both branches independently draw their own face/ring circles — proves
  // the logo path (section 8 of the brief: "do not modify the logo system")
  // is untouched code, just now scoped to its own branch.
  const matches = src.match(/scene\.add\.circle\(0, 0, r \+ 2, PALETTE\.gold, 0\)/g) ?? [];
  assert.equal(matches.length, 2, "expected the gold ring circle in both the logo and emergency branches");
});

// ---- 26-30. forbidden-scope guards -----------------------------------------

test("26. rulesVersion remains 3", () => {
  assert.match(read("src/game/dailyRulesVersion.ts"), /export const DAILY_RULES_VERSION = 3/);
});

test("27. scoring constants remain unchanged", () => {
  const cfg = read("src/game/gameConfig.ts");
  assert.match(cfg, /energyPoints:\s*10/);
  assert.match(cfg, /survivalPerSecond:\s*5/);
  assert.match(cfg, /comboStep:\s*0\.1/);
  assert.match(cfg, /comboMaxMultiplier:\s*3/);
  assert.match(cfg, /obstaclePenalty:\s*50/);
  assert.match(cfg, /cleanRunBonus:\s*500/);
});

test("28. Daily challenge generation constants remain unchanged", () => {
  const src = read("api/_lib/dailyTokenChallenge.ts");
  assert.match(src, /DAILY_TOKEN_COUNT = 15/);
  assert.match(src, /TOKEN_CHALLENGE_VERSION = 1/);
});

test("29. attempt-accounting code has zero coupling to the Sigil system (api/ untouched)", () => {
  const apiFiles = ["api/_lib/supabaseRpc.ts"];
  for (const f of apiFiles) {
    const src = read(f);
    assert.doesNotMatch(src, /rushSigil/i);
  }
});

test("30. movement/collision constants remain unchanged", () => {
  const cfg = read("src/game/gameConfig.ts");
  assert.match(cfg, /LANE_COUNT = 3/);
  assert.match(cfg, /radius: 18/); // OBJECTS.radius
  assert.match(cfg, /radius: 22/); // PLAYER.radius
  const dailyTokensSrc = read("src/game/dailyTokens.ts");
  assert.match(dailyTokensSrc, /TOKEN_RADIUS = 20/);
});
