#!/usr/bin/env node
// In-memory negative self-tests for the V2 proposal constraints
// (Phase 12C-1B1). Proves each V2-specific validator actually rejects its
// violation class. Never touches the committed artifacts. Exits non-zero if any
// violation is NOT caught (or a valid fixture is wrongly rejected).
import { computeContentHash, computeCatalogVersion } from "./lib/canonical.mjs";
import {
  validateProposalEntries,
  validateProposalManifest,
  validateProviderSnapshot,
  findImageUrls,
  findSecrets,
} from "./lib/validateV2.mjs";

let failures = 0;
function check(name, condition) {
  if (!condition) {
    failures += 1;
    console.error(` FAIL: ${name}`);
  } else {
    console.log(` ok: ${name}`);
  }
}

const SCHEMA = 2;

function logo() {
  return { status: "pending", version: 0, contentHash: null, url64: null, url128: null, source: null, sourceReference: null, ingestedAt: null };
}
function entry(over = {}) {
  return {
    tokenId: "rpt-0037", name: "Sample", symbol: "SMP", slug: "sample",
    category: "defi", status: "active", eligibilityTier: "discovery",
    assetClass: "token", providerIds: { coingecko: "sample" }, aliases: [],
    networks: [], logo: logo(), ...over,
  };
}

// Minimal valid 250-entry set: 2 anchors (btc/eth) + 248 fillers, plus the two
// V1 preservation references the validator compares against.
function makeValid() {
  const btc = entry({ tokenId: "rpt-0001", name: "Bitcoin", symbol: "BTC", slug: "bitcoin", category: "store-of-value", assetClass: "native", eligibilityTier: "anchor", providerIds: { coingecko: "bitcoin" } });
  const eth = entry({ tokenId: "rpt-0002", name: "Ethereum", symbol: "ETH", slug: "ethereum", category: "smart-contract", assetClass: "native", eligibilityTier: "anchor", providerIds: { coingecko: "ethereum" } });
  const rest = [];
  for (let i = 3; i <= 250; i += 1) {
    const id = `rpt-${String(i).padStart(4, "0")}`;
    rest.push(entry({ tokenId: id, name: `Token ${i}`, symbol: `T${i}`, slug: `token-${i}`, providerIds: { coingecko: `token-${i}` } }));
  }
  const entries = [btc, eth, ...rest];
  const registry = {
    schemaVersion: SCHEMA,
    catalogStage: "proposal",
    catalogVersion: computeCatalogVersion(SCHEMA, entries),
    entryCount: entries.length,
    contentHash: computeContentHash(SCHEMA, entries),
    entries,
  };
  const v1Refs = [
    { tokenId: "rpt-0001", name: "Bitcoin", symbol: "BTC", slug: "bitcoin", category: "store-of-value", assetClass: "native", providerIds: { coingecko: "bitcoin" } },
    { tokenId: "rpt-0002", name: "Ethereum", symbol: "ETH", slug: "ethereum", category: "smart-contract", assetClass: "native", providerIds: { coingecko: "ethereum" } },
  ];
  return { registry, v1Refs };
}

function rebuild(registry) {
  registry.contentHash = computeContentHash(SCHEMA, registry.entries);
  registry.catalogVersion = computeCatalogVersion(SCHEMA, registry.entries);
  registry.entryCount = registry.entries.length;
  return registry;
}

// 1. Valid fixture passes cleanly.
{
  const { registry, v1Refs } = makeValid();
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("valid 250-entry proposal passes", errors.length === 0);
}

// 2. Wrong entry count rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries.pop();
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("249 entries rejected", errors.some((e) => /exactly 250 entries/.test(e)));
}

// 3. Three anchors rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[5].eligibilityTier = "anchor";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("three anchors rejected", errors.some((e) => /exactly 2 anchor/.test(e)));
}

// 4. V1 tokenId reassignment (changed CoinGecko id) rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[0].providerIds = { coingecko: "not-bitcoin" };
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("V1 provider-id reassignment rejected", errors.some((e) => /CoinGecko id changed/.test(e)));
}

// 5. Active wrapped asset rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].assetClass = "wrapped";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("active wrapped asset rejected", errors.some((e) => /wrapped\/bridged/.test(e)));
}

// 6. Duplicate symbol without symbolConflictGroup rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].symbol = registry.entries[11].symbol;
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("duplicate symbol without group rejected", errors.some((e) => /symbolConflictGroup/.test(e)));
}

// 7. Unknown category still rejected even with the expanded V2 set.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].category = "not-a-category";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("unknown category rejected", errors.some((e) => /unknown category/.test(e)));
}

// 8. Excluded tier rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].eligibilityTier = "excluded";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("excluded tier rejected", errors.some((e) => /must not be "excluded"/.test(e)));
}

// 9. Manifest: missing entry + non-zero version + forbidden field rejected.
{
  const tokenIds = new Set(["rpt-0001", "rpt-0002"]);
  const bad = [
    { tokenId: "rpt-0001", status: "pending", version: 1, requiresRasterization: null },
    { tokenId: "rpt-0002", status: "pending", version: 0, requiresRasterization: null, url64: "x" },
  ];
  const errs = validateProposalManifest(tokenIds, bad);
  check("manifest version!=0 rejected", errs.some((e) => /version must be 0/.test(e)));
  check("manifest forbidden field rejected", errs.some((e) => /forbidden field "url64"/.test(e)));
}
{
  const tokenIds = new Set(["rpt-0001", "rpt-0002"]);
  const good = [
    { tokenId: "rpt-0001", status: "pending", version: 0, requiresRasterization: null },
    { tokenId: "rpt-0002", status: "pending", version: 0, requiresRasterization: null },
  ];
  check("valid manifest passes", validateProposalManifest(tokenIds, good).length === 0);
}

// 10. Image URL + secret scanners.
check("image URL detected", findImageUrls('{"x":"https://coin-images.coingecko.com/a/large/b.png"}').length > 0);
check("plain endpoint not flagged as image", findImageUrls('{"endpoint":"https://api.coingecko.com/api/v3/coins/markets"}').length === 0);
check("secret detected", findSecrets('{"api_key":"zzz"}').length > 0);

// 11. Provider snapshot: bad rank + stray image field rejected.
{
  const errs = validateProviderSnapshot({ rows: [{ id: "x", marketCapRank: 0 }, { id: "y", marketCapRank: 5, image: "u" }] });
  check("non-positive rank rejected", errs.some((e) => /positive integer or null/.test(e)));
  check("snapshot image field rejected", errs.some((e) => /must not carry an image field/.test(e)));
}

if (failures > 0) {
  console.error(`\nV2 selftest FAILED: ${failures} check(s) did not hold.`);
  process.exit(1);
}
console.log("\nV2 selftest OK: all V2 proposal constraints are enforced.");
