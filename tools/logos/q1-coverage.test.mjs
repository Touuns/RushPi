import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Phase 13-Q1 — local token-logo coverage.
 *
 * Coverage is deliberately PARTIAL (64 of 250): the remaining tokens have no
 * source whose licence explicitly covers the image files. These tests pin what
 * IS released — its identity, integrity and honest classification — and pin
 * that the uncovered remainder still falls back safely.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p) => readFileSync(resolve(REPO, p), "utf8");
const json = (p) => JSON.parse(read(p));

const registry = json("registry/tokens/v2-proposal/registry.json");
const manifest = json("public/data/token-logos/release-manifest.json");
const released = manifest.entries.map((e) => e.tokenId);
const registryIds = new Set(registry.entries.map((e) => e.tokenId));

test("Registry V2 still holds exactly 250 unique token ids", () => {
  assert.equal(registry.entries.length, 250);
  assert.equal(registryIds.size, 250);
});

test("every released logo maps back to exactly one registry token", () => {
  assert.equal(new Set(released).size, released.length, "no duplicate tokenId");
  for (const id of released) {
    assert.ok(registryIds.has(id), `released ${id} must exist in the registry`);
  }
});

test("released coverage never regresses below the pilot", () => {
  assert.ok(released.length >= 11);
  assert.equal(manifest.entryCount, released.length);
});

test("the eleven pilot logos remain released", () => {
  for (const id of ["rpt-0001", "rpt-0002", "rpt-0004", "rpt-0012", "rpt-0024",
                    "rpt-0037", "rpt-0041", "rpt-0058", "rpt-0070", "rpt-0142", "rpt-0250"]) {
    assert.ok(released.includes(id), `pilot token ${id} must stay released`);
  }
});

test("every released entry carries both local sizes, same-origin and versioned", () => {
  for (const e of manifest.entries) {
    for (const p of [e.output64Path, e.output128Path]) {
      assert.match(p, /^public\/assets\/rushpi\/token-logos\//, "must be a local repo path");
      assert.doesNotMatch(p, /^https?:/, "no remote path may reach the manifest");
      assert.match(p, /\/v\d+\//, "asset must be versioned");
      assert.match(p, /\.png$/);
    }
    assert.match(e.output64Path, /\/64\//);
    assert.match(e.output128Path, /\/128\//);
    assert.ok(Number.isInteger(e.logoVersion) && e.logoVersion >= 1);
  }
});

test("no source URL or provenance field leaks into the public manifest", () => {
  const raw = read("public/data/token-logos/release-manifest.json");
  assert.doesNotMatch(raw, /raw\.githubusercontent|https?:\/\//, "no remote URL in the runtime manifest");
  for (const forbidden of ["sourceReference", "permissionEvidenceReference", "approvedBy", "intakePath", "notes"]) {
    assert.doesNotMatch(raw, new RegExp(forbidden), `${forbidden} must stay in the private artifacts`);
  }
});

test("community CC0 icons are classified honestly, never as official", () => {
  const approvals = json("tools/logos/data/q1-cc0-source-plan.json").entries;
  assert.ok(approvals.length > 0);
  for (const a of approvals) {
    assert.equal(a.sourceType, "community-cc0-token-icon");
    assert.equal(a.permissionReviewStatus, "permission-confirmed");
    assert.equal(a.providerFallbackApproved, false);
    assert.match(a.notes, /community-created cc0/i);
    assert.match(a.notes, /does not claim official project endorsement/i);
    assert.match(a.permissionEvidenceReference, /LICENSE/i, "licence must be pinned");
    assert.match(a.approvedSourceContentHash, /^[0-9a-f]{64}$/);
  }
});

test("released identities match the registry name and symbol exactly", () => {
  const byId = new Map(registry.entries.map((e) => [e.tokenId, e]));
  for (const a of json("tools/logos/data/q1-cc0-source-plan.json").entries) {
    const reg = byId.get(a.tokenId);
    assert.equal(a.canonicalName, reg.name, `${a.tokenId} name must match exactly`);
    assert.equal(a.symbol, reg.symbol, `${a.tokenId} symbol must match exactly`);
    assert.equal(a.providerId, reg.providerIds.coingecko, "mapping is by provider id, never by symbol alone");
  }
});

test("the uncovered remainder is accounted for and still falls back safely", () => {
  const uncovered = [...registryIds].filter((id) => !released.includes(id));
  assert.equal(released.length + uncovered.length, 250);
  // The renderer only draws a logo when a texture key resolved; otherwise it
  // uses the unchanged procedural collectible. That path must remain present.
  assert.match(read("src/game/dailyTokens.ts"), /shouldRenderDailyTokenLogo/);
  assert.match(read("src/game/dailyTokens.ts"), /Procedural fallback/i);
});

test("no CoinGecko or third-party image host is used as a publication source", () => {
  const plan = read("tools/logos/data/q1-cc0-source-plan.json");
  assert.doesNotMatch(plan, /coin-images\.coingecko|assets\.coingecko/i);
  assert.doesNotMatch(plan, /trustwallet/i);
  for (const e of JSON.parse(plan).entries) {
    assert.match(e.sourceReference, /^https:\/\/raw\.githubusercontent\.com\/spothq\/cryptocurrency-icons\//);
  }
});
