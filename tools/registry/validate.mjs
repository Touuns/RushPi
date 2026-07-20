#!/usr/bin/env node
// Validates registry/tokens/v1/registry.json + logo-manifest.json against
// the canonical-token-registry contract (Phase 12C-1A). Exits non-zero on
// any failure. Run twice to confirm identical output/hash (determinism).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeContentHash, computeCatalogVersion } from "./lib/canonical.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const registryPath = path.join(repoRoot, "registry/tokens/v1/registry.json");
const manifestPath = path.join(repoRoot, "registry/tokens/v1/logo-manifest.json");

const CATEGORIES = new Set([
  "store-of-value", "smart-contract", "payments", "layer-2",
  "interoperability", "stablecoin", "meme", "privacy", "defi",
]);
const STATUSES = new Set(["active", "inactive", "deprecated"]);
const TIERS = new Set(["anchor", "core", "established", "discovery", "excluded"]);
const ASSET_CLASSES = new Set([
  "native", "token", "wrapped", "bridged", "stablecoin", "meme", "other",
]);

const errors = [];
function fail(message) {
  errors.push(message);
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function requireField(entry, field, label) {
  const value = entry[field];
  if (value === undefined || value === null || value === "") {
    fail(`${label}: missing required field "${field}"`);
    return false;
  }
  return true;
}

function validateRegistry(registry) {
  if (!Array.isArray(registry.entries)) {
    fail("registry.entries is not an array");
    return;
  }
  const entries = registry.entries;

  if (registry.entryCount !== entries.length) {
    fail(`mismatched entry count: entryCount=${registry.entryCount} actual=${entries.length}`);
  }

  const recomputedHash = computeContentHash(registry.schemaVersion, entries);
  if (recomputedHash !== registry.contentHash) {
    fail(`mismatched content hash: stored=${registry.contentHash} recomputed=${recomputedHash}`);
  }
  const recomputedCatalogVersion = computeCatalogVersion(registry.schemaVersion, entries);
  if (recomputedCatalogVersion !== registry.catalogVersion) {
    fail(`mismatched catalogVersion: stored=${registry.catalogVersion} recomputed=${recomputedCatalogVersion}`);
  }
  if (typeof registry.catalogVersion !== "string" || registry.catalogVersion === "latest") {
    fail(`catalogVersion must be an immutable content-derived string, got "${registry.catalogVersion}"`);
  }

  const tokenIds = new Set();
  const slugs = new Set();
  const coingeckoIds = new Set();
  const symbolGroups = new Map(); // symbol -> symbolConflictGroup | undefined

  for (const entry of entries) {
    const label = `entry ${entry.tokenId ?? entry.symbol ?? "<unknown>"}`;

    for (const field of ["tokenId", "name", "symbol", "slug", "category", "status", "eligibilityTier", "assetClass", "providerIds", "aliases", "networks", "logo"]) {
      requireField(entry, field, label);
    }

    if (entry.tokenId) {
      if (tokenIds.has(entry.tokenId)) fail(`duplicate tokenId: ${entry.tokenId}`);
      tokenIds.add(entry.tokenId);
    }
    if (entry.slug) {
      if (slugs.has(entry.slug)) fail(`duplicate slug: ${entry.slug}`);
      slugs.add(entry.slug);
    }
    const cgId = entry.providerIds && entry.providerIds.coingecko;
    if (cgId) {
      if (coingeckoIds.has(cgId)) fail(`duplicate CoinGecko provider ID: ${cgId}`);
      coingeckoIds.add(cgId);
    }

    if (entry.category && !CATEGORIES.has(entry.category)) fail(`${label}: unknown category "${entry.category}"`);
    if (entry.status && !STATUSES.has(entry.status)) fail(`${label}: unknown status "${entry.status}"`);
    if (entry.eligibilityTier && !TIERS.has(entry.eligibilityTier)) fail(`${label}: unknown eligibilityTier "${entry.eligibilityTier}"`);
    if (entry.assetClass && !ASSET_CLASSES.has(entry.assetClass)) fail(`${label}: unknown assetClass "${entry.assetClass}"`);

    if (!Array.isArray(entry.aliases) || entry.aliases.some((a) => typeof a !== "string" || a.length === 0)) {
      fail(`${label}: invalid aliases (must be an array of non-empty strings)`);
    }

    if (entry.symbol) {
      if (!symbolGroups.has(entry.symbol)) {
        symbolGroups.set(entry.symbol, []);
      }
      symbolGroups.get(entry.symbol).push(entry);
    }

    if (entry.logo) {
      if (entry.logo.status === "ready") {
        const requiredLogoFields = ["contentHash", "version", "url64", "url128", "source"];
        const missing = requiredLogoFields.filter((f) => {
          if (f === "version") return !(entry.logo.version >= 1);
          return !entry.logo[f];
        });
        if (missing.length > 0) {
          fail(`${label}: logo marked "ready" but missing/invalid ${missing.join(", ")}`);
        }
      }
    }

    const isWrappedOrBridged = entry.assetClass === "wrapped" || entry.assetClass === "bridged";
    const isActiveDailyEligible = entry.status === "active" && entry.eligibilityTier !== "excluded";
    if (isWrappedOrBridged && isActiveDailyEligible && entry.wrappedOrBridgedApproved !== true) {
      fail(`${label}: active Daily-eligible wrapped/bridged entry requires wrappedOrBridgedApproved:true`);
    }
  }

  // Duplicate symbols are allowed only when every entry sharing that symbol
  // declares the SAME explicit symbolConflictGroup — this is the concrete
  // guard against symbol being (mis)used as an implicit primary key.
  for (const [symbol, group] of symbolGroups) {
    if (group.length <= 1) continue;
    const groupIds = group.map((e) => e.symbolConflictGroup);
    const allDeclared = groupIds.every((g) => typeof g === "string" && g.length > 0);
    const allSame = allDeclared && groupIds.every((g) => g === groupIds[0]);
    if (!allSame) {
      fail(`symbol "${symbol}" is duplicated across ${group.length} entries without a matching symbolConflictGroup (symbol must never be used as a primary key)`);
    }
  }

  // Determinism self-check: serializing twice must hash identically.
  const again = computeContentHash(registry.schemaVersion, entries);
  if (again !== recomputedHash) {
    fail("non-deterministic output: recomputing the hash twice produced different results");
  }

  return tokenIds;
}

function validateLogoManifest(manifest, knownTokenIds) {
  if (!Array.isArray(manifest.entries)) {
    fail("logo-manifest.entries is not an array");
    return;
  }
  for (const entry of manifest.entries) {
    if (!entry.tokenId || !knownTokenIds.has(entry.tokenId)) {
      fail(`logo manifest tokenId absent from registry: ${entry.tokenId}`);
    }
  }
}

function main() {
  const registry = loadJson(registryPath);
  const manifest = loadJson(manifestPath);
  const tokenIds = validateRegistry(registry) ?? new Set();
  validateLogoManifest(manifest, tokenIds);

  if (errors.length > 0) {
    console.error(`Registry validation FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`Registry validation OK: entryCount=${registry.entryCount} catalogVersion=${registry.catalogVersion} contentHash=${registry.contentHash}`);
}

main();
