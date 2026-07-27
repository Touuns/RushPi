/**
 * Phase 12C-1B2C-2D2C-A — Daily token logo PRESENTATION RULES tests.
 *
 * Pure data + lookup, no Phaser, no I/O: these tests exercise the centralized
 * tokenId -> rule table directly (dailyTokenLogoRender.test.ts covers the
 * downstream size math in resolveTokenLogoLayout, which folds these rules onto
 * the existing fit-to-box scale).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveTokenLogoPresentationRule,
  DEFAULT_TOKEN_LOGO_PRESENTATION_RULE,
} from "./dailyTokenLogoPresentation.ts";

// Canonical tokenIds from the token registry, confirmed against the live
// release manifest's 11 shipped Daily logos.
const BTC = "rpt-0001";
const ETH = "rpt-0002";
const HYPE = "rpt-0037";
const TAO = "rpt-0041";
const ASI = "rpt-0070";
const CANTON = "rpt-0142";
const GAS = "rpt-0250";

test("default rule preserves multiplier 1.00 and no plate", () => {
  const rule = resolveTokenLogoPresentationRule(undefined);
  assert.equal(rule.scaleMultiplier, 1);
  assert.equal(rule.backingPlate, undefined);
  assert.equal(rule, DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
});

test("unknown tokenId uses the default rule", () => {
  assert.deepEqual(resolveTokenLogoPresentationRule("rpt-9999"), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
  assert.deepEqual(resolveTokenLogoPresentationRule(null), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
  assert.deepEqual(resolveTokenLogoPresentationRule(""), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
});

test("BTC (rpt-0001) remains unchanged", () => {
  assert.deepEqual(resolveTokenLogoPresentationRule(BTC), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
});

test("HYPE (rpt-0037) gets no plate and no adjustment", () => {
  assert.deepEqual(resolveTokenLogoPresentationRule(HYPE), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
});

test("TAO (rpt-0041) resolves by canonical tokenId with a warm-neutral backing plate", () => {
  const rule = resolveTokenLogoPresentationRule(TAO);
  assert.ok(rule.backingPlate);
  assert.equal(rule.backingPlate?.enabled, true);
  assert.equal(rule.backingPlate?.tone, "warm-neutral");
});

test("TAO backing plate diameter is 32-34px inside the 40px face, clear of the gold ring", () => {
  const rule = resolveTokenLogoPresentationRule(TAO);
  const faceDiameter = 40; // 2 * TOKEN_RADIUS
  const diameter = faceDiameter * (rule.backingPlate?.relativeDiameter ?? 0);
  assert.ok(diameter >= 32 && diameter <= 34, `expected 32-34px, got ${diameter}`);
  assert.ok(diameter < faceDiameter, "plate stays inside the face");
});

test("TAO scale multiplier is applied (~1.10-1.15)", () => {
  const rule = resolveTokenLogoPresentationRule(TAO);
  assert.ok(rule.scaleMultiplier >= 1.1 && rule.scaleMultiplier <= 1.15);
});

test("ETH (rpt-0002) gets a slight scale increase and no plate", () => {
  const rule = resolveTokenLogoPresentationRule(ETH);
  assert.ok(rule.scaleMultiplier > 1 && rule.scaleMultiplier <= 1.1);
  assert.equal(rule.backingPlate, undefined);
});

test("GAS (rpt-0250) gets a slight scale increase and no plate", () => {
  const rule = resolveTokenLogoPresentationRule(GAS);
  assert.ok(rule.scaleMultiplier > 1 && rule.scaleMultiplier <= 1.1);
  assert.equal(rule.backingPlate, undefined);
});

test("Canton (rpt-0142) gets a slight scale increase and no plate", () => {
  const rule = resolveTokenLogoPresentationRule(CANTON);
  assert.ok(rule.scaleMultiplier > 1 && rule.scaleMultiplier <= 1.08);
  assert.equal(rule.backingPlate, undefined);
});

test("ASI (rpt-0070) gets a slight scale reduction and no plate", () => {
  const rule = resolveTokenLogoPresentationRule(ASI);
  assert.ok(rule.scaleMultiplier < 1 && rule.scaleMultiplier >= 0.92);
  assert.equal(rule.backingPlate, undefined);
});

test("rules are looked up only by canonical tokenId — a symbol or CoinGecko id never matches", () => {
  assert.deepEqual(resolveTokenLogoPresentationRule("TAO"), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
  assert.deepEqual(resolveTokenLogoPresentationRule("bittensor"), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
  assert.deepEqual(resolveTokenLogoPresentationRule("gas"), DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
});

test("backing plate rule carries no physics/input fields — only enabled/tone/relativeDiameter", () => {
  const rule = resolveTokenLogoPresentationRule(TAO);
  assert.deepEqual(Object.keys(rule.backingPlate ?? {}).sort(), ["enabled", "relativeDiameter", "tone"]);
});

test("resolving a rule performs no network/fetch call", () => {
  const g = globalThis as unknown as { fetch?: unknown };
  const original = g.fetch;
  let calls = 0;
  g.fetch = () => {
    calls += 1;
    throw new Error("no fetch from presentation rules");
  };
  try {
    resolveTokenLogoPresentationRule(TAO);
    resolveTokenLogoPresentationRule("rpt-9999");
  } finally {
    g.fetch = original;
  }
  assert.equal(calls, 0);
});

test("repeated resolution across different tokens never leaves stale state", () => {
  const tao = resolveTokenLogoPresentationRule(TAO);
  const hype = resolveTokenLogoPresentationRule(HYPE);
  const taoAgain = resolveTokenLogoPresentationRule(TAO);
  assert.deepEqual(hype, DEFAULT_TOKEN_LOGO_PRESENTATION_RULE);
  assert.deepEqual(tao, taoAgain);
});
