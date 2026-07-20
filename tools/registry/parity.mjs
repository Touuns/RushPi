#!/usr/bin/env node
// V1 PARITY CHECK — compares the frozen V1 registry artifact against the
// current production 36-token catalog (api/_lib/tokenCatalog.ts) to protect
// it from drifting before the legacy challenge handler lands in 12C-2.
//
// Scope of this check (Phase 12C-1A.1 correction): api/_lib/tokenCatalog.ts
// carries no display-name field, so "name" and the derived "slug" are
// curated canonical metadata authored fresh for this registry — NOT
// something that can be checked against production. What IS proven
// byte-for-byte equal to production, for all 36 entries, is:
//   - CoinGecko ID (providerIds.coingecko);
//   - symbol;
//   - category;
//   - Daily eligibility;
//   - entry presence/count (no missing or additional entries).
// Curated-name sanity (non-empty, trimmed, not equal to the CoinGecko ID or
// tokenId) is validated separately in tools/registry/lib/validateEntries.mjs
// — it is a contract check on the curated data itself, not a parity claim.
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
  }

  if (legacyIds.size !== registryIds.size || errors.length > 0) {
    console.error(`V1 parity check FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`V1 parity check OK (CoinGecko ID, symbol, category, Daily eligibility, entry count): ${legacyIds.size} entries match between ${filePath} and ${registryPath}.`);
  console.log("Note: display name and slug are curated canonical metadata, not production-parity fields (tokenCatalog.ts has no name field) — see tools/registry/README.md.");
}

main();
