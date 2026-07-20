#!/usr/bin/env node
// In-memory negative-fixture self-test for the registry/manifest validators
// (Phase 12C-1A.1). Builds small synthetic fixtures — never touches the
// committed registry/tokens/v1/*.json artifacts — and asserts the shared
// validators in lib/validateEntries.mjs + lib/validateManifest.mjs catch
// each violation, plus that reordering entries never changes the hash.
import { validateEntries } from "./lib/validateEntries.mjs";
import { validateManifest } from "./lib/validateManifest.mjs";
import { computeContentHash } from "./lib/canonical.mjs";

const SCHEMA_VERSION = 1;
let failures = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok  - ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${name}${detail ? `: ${detail}` : ""}`);
  }
}

function makeEntry(overrides = {}) {
  return {
    tokenId: "rpt-0001",
    name: "Test One",
    symbol: "TST1",
    slug: "test-one",
    category: "smart-contract",
    status: "active",
    eligibilityTier: "core",
    assetClass: "native",
    providerIds: { coingecko: "test-one" },
    aliases: [],
    networks: [],
    logo: {
      status: "pending", version: 0, contentHash: null, url64: null,
      url128: null, source: null, sourceReference: null, ingestedAt: null,
    },
    ...overrides,
  };
}

function makeManifestEntry(overrides = {}) {
  return {
    tokenId: "rpt-0001",
    status: "pending",
    sourceType: "authorized-provider",
    sourceReference: null,
    sourceMimeType: null,
    requiresRasterization: null,
    normalizedSizes: [64, 128],
    version: 0,
    contentHash: null,
    url64: null,
    url128: null,
    ingestedAt: null,
    rejectionReason: null,
    ...overrides,
  };
}

function baselineEntries() {
  return [
    makeEntry(),
    makeEntry({
      tokenId: "rpt-0002", name: "Test Two", symbol: "TST2", slug: "test-two",
      providerIds: { coingecko: "test-two" },
    }),
  ];
}

console.log("1) Baseline fixture is valid (sanity check on the harness itself)");
{
  const entries = baselineEntries();
  const { errors } = validateEntries(SCHEMA_VERSION, entries);
  check("baseline registry produces zero errors", errors.length === 0, errors.join("; "));

  const manifest = entries.map((e) => makeManifestEntry({ tokenId: e.tokenId }));
  const manifestErrors = validateManifest(new Set(entries.map((e) => e.tokenId)), manifest);
  check("baseline manifest produces zero errors", manifestErrors.length === 0, manifestErrors.join("; "));
}

console.log("2) tokenId equal to symbol is rejected");
{
  const entries = baselineEntries();
  entries[0].tokenId = entries[0].symbol; // "TST1" — not rpt-#### and self-collides
  const { errors } = validateEntries(SCHEMA_VERSION, entries);
  check("tokenId==symbol produces an error", errors.some((e) => /tokenId/i.test(e)), errors.join("; "));
}

console.log("3) duplicate manifest tokenId is rejected");
{
  const entries = baselineEntries();
  const tokenIds = new Set(entries.map((e) => e.tokenId));
  const manifest = [
    makeManifestEntry({ tokenId: "rpt-0001" }),
    makeManifestEntry({ tokenId: "rpt-0001" }),
    makeManifestEntry({ tokenId: "rpt-0002" }),
  ];
  const errors = validateManifest(tokenIds, manifest);
  check("duplicate manifest tokenId produces an error", errors.some((e) => /duplicate manifest tokenId/.test(e)), errors.join("; "));
}

console.log("4) missing manifest token is rejected");
{
  const entries = baselineEntries();
  const tokenIds = new Set(entries.map((e) => e.tokenId));
  const manifest = [makeManifestEntry({ tokenId: "rpt-0001" })]; // rpt-0002 missing
  const errors = validateManifest(tokenIds, manifest);
  check("missing manifest token produces an error", errors.some((e) => /absent from logo manifest/.test(e)), errors.join("; "));
}

console.log("5) invalid ready logo is rejected");
{
  const entries = baselineEntries();
  const tokenIds = new Set(entries.map((e) => e.tokenId));
  const manifest = [
    makeManifestEntry({ tokenId: "rpt-0001", status: "ready" }), // missing sourceReference/hash/urls/etc.
    makeManifestEntry({ tokenId: "rpt-0002" }),
  ];
  const errors = validateManifest(tokenIds, manifest);
  check("invalid ready logo produces an error", errors.some((e) => /ready logo requires/.test(e)), errors.join("; "));
}

console.log("6) invalid rejected logo is rejected");
{
  const entries = baselineEntries();
  const tokenIds = new Set(entries.map((e) => e.tokenId));
  const manifest = [
    makeManifestEntry({ tokenId: "rpt-0001", status: "rejected", rejectionReason: null, contentHash: "deadbeef" }),
    makeManifestEntry({ tokenId: "rpt-0002" }),
  ];
  const errors = validateManifest(tokenIds, manifest);
  check("invalid rejected logo produces an error", errors.some((e) => /rejected logo/.test(e)), errors.join("; "));
}

console.log("7) invalid pending logo is rejected");
{
  const entries = baselineEntries();
  const tokenIds = new Set(entries.map((e) => e.tokenId));
  const manifest = [
    makeManifestEntry({ tokenId: "rpt-0001", requiresRasterization: true }),
    makeManifestEntry({ tokenId: "rpt-0002" }),
  ];
  const errors = validateManifest(tokenIds, manifest);
  check("invalid pending logo (requiresRasterization=true) produces an error", errors.some((e) => /pending logo must not set requiresRasterization/.test(e)), errors.join("; "));
}

console.log("8) reordered registry entries produce an identical hash");
{
  const entries = baselineEntries();
  const forward = computeContentHash(SCHEMA_VERSION, entries);
  const reversed = computeContentHash(SCHEMA_VERSION, entries.slice().reverse());
  check("hash is order-independent", forward === reversed, `${forward} vs ${reversed}`);
}

if (failures > 0) {
  console.error(`\nself-test FAILED: ${failures} check(s) did not behave as expected.`);
  process.exit(1);
}
console.log("\nself-test OK: all negative fixtures were correctly rejected, reordering is hash-stable.");
