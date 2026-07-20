#!/usr/bin/env node
// V1 PARITY CHECK — compares the frozen V1 registry artifact against the
// current production 36-token catalog (api/_lib/tokenCatalog.ts) to protect
// it from drifting before the legacy challenge handler lands in 12C-2.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyCatalog } from "./lib/legacyCatalog.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const registryPath = path.join(repoRoot, "registry/tokens/v1/registry.json");

const errors = [];
function fail(message) {
  errors.push(message);
}

function main() {
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const { entries: legacyEntries, filePath } = readLegacyCatalog(repoRoot);

  const legacyById = new Map(legacyEntries.map((e) => [e.id, e]));
  const registryByCgId = new Map(
    registry.entries
      .filter((e) => e.providerIds && e.providerIds.coingecko)
      .map((e) => [e.providerIds.coingecko, e]),
  );

  const legacyIds = new Set(legacyById.keys());
  const registryIds = new Set(registryByCgId.keys());

  for (const id of legacyIds) {
    if (!registryIds.has(id)) fail(`missing from registry: CoinGecko id "${id}" present in ${filePath}`);
  }
  for (const id of registryIds) {
    if (!legacyIds.has(id)) fail(`additional entry not in production catalog: CoinGecko id "${id}"`);
  }

  for (const [id, legacy] of legacyById) {
    const entry = registryByCgId.get(id);
    if (!entry) continue; // already reported above

    if (entry.symbol !== legacy.preferredSymbol) {
      fail(`symbol mismatch for "${id}": catalog=${legacy.preferredSymbol} registry=${entry.symbol}`);
    }
    if (entry.category !== legacy.category) {
      fail(`category mismatch for "${id}": catalog=${legacy.category} registry=${entry.category}`);
    }
    // Catalog stores a single Daily-eligibility bool; registry expresses it
    // as eligibilityTier !== "excluded". Today every legacy entry is
    // enabledForDaily:true, so every matching registry entry must not be
    // "excluded".
    const registryEligible = entry.eligibilityTier !== "excluded";
    if (legacy.enabledForDaily !== registryEligible) {
      fail(`Daily eligibility mismatch for "${id}": catalog.enabledForDaily=${legacy.enabledForDaily} registry eligibilityTier=${entry.eligibilityTier}`);
    }
    // The static catalog carries no display name field, so "same names" is
    // validated as a non-empty, non-id sanity check rather than a literal
    // catalog comparison (nothing in production to compare against).
    if (typeof entry.name !== "string" || entry.name.length === 0 || entry.name === id) {
      fail(`suspicious/missing display name for "${id}": "${entry.name}"`);
    }
  }

  if (legacyIds.size !== registryIds.size || errors.length > 0) {
    console.error(`V1 parity check FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`V1 parity check OK: ${legacyIds.size} CoinGecko IDs match between ${filePath} and ${registryPath}`);
}

main();
