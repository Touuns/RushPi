// Registry entry contract validation (Phase 12C-1A, hardened in 12C-1A.1).
// Pure function: takes {schemaVersion, entries} data, returns {errors, tokenIds}.
// Shared by tools/registry/validate.mjs (CLI, reads the real artifact) and
// tools/registry/selftest.mjs (in-memory negative fixtures).
import { computeContentHash, computeCatalogVersion } from "./canonical.mjs";

// Legacy V1 canonical categories. V1 validation uses exactly these (the
// registry currently reuses the narrower legacy Daily categories). The V2
// proposal passes an expanded registry-only set via options.allowedCategories
// (see tools/registry/lib/v2Categories.mjs) without changing this default, so
// V1 behavior is untouched.
const CATEGORIES = new Set([
  "store-of-value", "smart-contract", "payments", "layer-2",
  "interoperability", "stablecoin", "meme", "privacy", "defi",
]);
const STATUSES = new Set(["active", "inactive", "deprecated"]);
const TIERS = new Set(["anchor", "core", "established", "discovery", "excluded"]);
const ASSET_CLASSES = new Set([
  "native", "token", "wrapped", "bridged", "stablecoin", "meme", "other",
]);

// V1 internal tokenId format. Documented (not derived) alongside
// api/_lib/tokenRegistry/types.ts V1_TOKEN_ID_PATTERN — keep both in sync.
const V1_TOKEN_ID_PATTERN = /^rpt-[0-9]{4}$/;

function isNonEmptyTrimmedString(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function requireField(entry, field, label, errors) {
  const value = entry[field];
  if (value === undefined || value === null || value === "") {
    errors.push(`${label}: missing required field "${field}"`);
    return false;
  }
  return true;
}

function validateAliases(entry, label, errors) {
  const aliases = entry.aliases;
  if (!Array.isArray(aliases)) {
    errors.push(`${label}: invalid aliases (must be an array)`);
    return;
  }
  const selfValues = [entry.tokenId, entry.name, entry.symbol, entry.slug]
    .filter((v) => typeof v === "string")
    .map((v) => v.toLowerCase());
  const providerValues = entry.providerIds && typeof entry.providerIds === "object"
    ? Object.values(entry.providerIds).filter((v) => typeof v === "string").map((v) => v.toLowerCase())
    : [];
  const seen = new Set();
  for (const alias of aliases) {
    if (!isNonEmptyTrimmedString(alias)) {
      errors.push(`${label}: invalid alias "${alias}" (must be a trimmed non-empty string)`);
      continue;
    }
    const lower = alias.toLowerCase();
    if (seen.has(lower)) {
      errors.push(`${label}: duplicate alias "${alias}" (case-insensitive)`);
    }
    seen.add(lower);
    if (selfValues.includes(lower)) {
      errors.push(`${label}: alias "${alias}" repeats the entry's own tokenId, name, symbol or slug`);
    }
    if (providerValues.includes(lower)) {
      errors.push(`${label}: alias "${alias}" repeats one of the entry's own provider IDs`);
    }
  }
}

function validateNetworks(entry, label, errors) {
  const networks = entry.networks;
  if (!Array.isArray(networks)) {
    errors.push(`${label}: invalid networks (must be an array)`);
    return;
  }
  const seen = new Set();
  for (const network of networks) {
    if (!network || typeof network !== "object") {
      errors.push(`${label}: invalid network entry (must be an object)`);
      continue;
    }
    if (!isNonEmptyTrimmedString(network.name)) {
      errors.push(`${label}: network name must be a trimmed non-empty string, got "${network.name}"`);
    }
    if (network.contractAddress !== undefined && !isNonEmptyTrimmedString(network.contractAddress)) {
      errors.push(`${label}: network contractAddress must be a trimmed non-empty string when present`);
    }
    const key = `${network.name}::${network.contractAddress ?? ""}`;
    if (seen.has(key)) {
      errors.push(`${label}: duplicate identical network entry ${JSON.stringify(network)}`);
    }
    seen.add(key);
  }
}

/**
 * Curated-metadata sanity check for "name" — NOT a production-parity claim.
 * api/_lib/tokenCatalog.ts has no display-name field to compare against, so
 * this only guards against obviously broken curated data.
 */
function validateCuratedName(entry, label, errors) {
  const name = entry.name;
  if (typeof name !== "string") return; // missing already reported by requireField
  const trimmed = name.trim();
  if (name.length === 0 || trimmed !== name) {
    errors.push(`${label}: curated name must be a non-empty, trimmed string, got "${name}"`);
    return;
  }
  // Exact (case-sensitive) comparison: e.g. name "Bitcoin" vs id "bitcoin" is
  // legitimate curated capitalization, not a literal copy of the raw ID.
  const coingeckoId = entry.providerIds && entry.providerIds.coingecko;
  if (coingeckoId && name === coingeckoId) {
    errors.push(`${label}: curated name must not equal the CoinGecko ID ("${name}")`);
  }
  if (entry.tokenId && name === entry.tokenId) {
    errors.push(`${label}: curated name must not equal tokenId ("${name}")`);
  }
}

/**
 * tokenId must never be usable as, or confused with, a symbol, slug,
 * provider ID or alias anywhere in the registry (case-insensitive). Checked
 * globally, not just against the entry's own fields, since the identity
 * namespaces must never mix.
 */
function validateTokenIdIdentity(entries, errors) {
  const foreignValues = new Set();
  for (const entry of entries) {
    if (typeof entry.symbol === "string") foreignValues.add(entry.symbol.toLowerCase());
    if (typeof entry.slug === "string") foreignValues.add(entry.slug.toLowerCase());
    if (entry.providerIds && typeof entry.providerIds === "object") {
      for (const v of Object.values(entry.providerIds)) {
        if (typeof v === "string") foreignValues.add(v.toLowerCase());
      }
    }
    if (Array.isArray(entry.aliases)) {
      for (const a of entry.aliases) {
        if (typeof a === "string") foreignValues.add(a.toLowerCase());
      }
    }
  }
  for (const entry of entries) {
    if (typeof entry.tokenId !== "string") continue;
    const lower = entry.tokenId.toLowerCase();
    if (!V1_TOKEN_ID_PATTERN.test(entry.tokenId)) {
      errors.push(`entry ${entry.tokenId}: tokenId must match ^rpt-[0-9]{4}$`);
    }
    if (foreignValues.has(lower)) {
      errors.push(`entry ${entry.tokenId}: tokenId collides (case-insensitively) with a symbol, slug, provider ID or alias elsewhere in the registry`);
    }
  }
}

export function validateEntries(schemaVersion, entries, options = {}) {
  const errors = [];
  const { expectedEntryCount, expectedContentHash, expectedCatalogVersion } = options;
  // V1 keeps the legacy 9-category set by default; V2 passes the expanded
  // registry-only canonical set. Anything else is still rejected.
  const allowedCategories = options.allowedCategories instanceof Set
    ? options.allowedCategories
    : CATEGORIES;

  if (!Array.isArray(entries)) {
    errors.push("entries is not an array");
    return { errors, tokenIds: new Set() };
  }

  if (expectedEntryCount !== undefined && expectedEntryCount !== entries.length) {
    errors.push(`mismatched entry count: entryCount=${expectedEntryCount} actual=${entries.length}`);
  }

  const recomputedHash = computeContentHash(schemaVersion, entries);
  if (expectedContentHash !== undefined && recomputedHash !== expectedContentHash) {
    errors.push(`mismatched content hash: stored=${expectedContentHash} recomputed=${recomputedHash}`);
  }
  if (expectedCatalogVersion !== undefined) {
    const recomputedCatalogVersion = computeCatalogVersion(schemaVersion, entries);
    if (recomputedCatalogVersion !== expectedCatalogVersion) {
      errors.push(`mismatched catalogVersion: stored=${expectedCatalogVersion} recomputed=${recomputedCatalogVersion}`);
    }
    if (expectedCatalogVersion === "latest") {
      errors.push(`catalogVersion must be an immutable content-derived string, got "${expectedCatalogVersion}"`);
    }
  }

  const tokenIds = new Set();
  const slugs = new Set();
  const coingeckoIds = new Set();
  const symbolGroups = new Map();

  for (const entry of entries) {
    const label = `entry ${entry.tokenId ?? entry.symbol ?? "<unknown>"}`;

    for (const field of ["tokenId", "name", "symbol", "slug", "category", "status", "eligibilityTier", "assetClass", "providerIds", "aliases", "networks", "logo"]) {
      requireField(entry, field, label, errors);
    }

    if (entry.tokenId) {
      if (tokenIds.has(entry.tokenId)) errors.push(`duplicate tokenId: ${entry.tokenId}`);
      tokenIds.add(entry.tokenId);
    }
    if (entry.slug) {
      if (slugs.has(entry.slug)) errors.push(`duplicate slug: ${entry.slug}`);
      slugs.add(entry.slug);
    }
    const cgId = entry.providerIds && entry.providerIds.coingecko;
    if (cgId) {
      if (coingeckoIds.has(cgId)) errors.push(`duplicate CoinGecko provider ID: ${cgId}`);
      coingeckoIds.add(cgId);
    }

    if (entry.category && !allowedCategories.has(entry.category)) errors.push(`${label}: unknown category "${entry.category}"`);
    if (entry.status && !STATUSES.has(entry.status)) errors.push(`${label}: unknown status "${entry.status}"`);
    if (entry.eligibilityTier && !TIERS.has(entry.eligibilityTier)) errors.push(`${label}: unknown eligibilityTier "${entry.eligibilityTier}"`);
    if (entry.assetClass && !ASSET_CLASSES.has(entry.assetClass)) errors.push(`${label}: unknown assetClass "${entry.assetClass}"`);

    validateCuratedName(entry, label, errors);
    validateAliases(entry, label, errors);
    validateNetworks(entry, label, errors);

    if (entry.symbol) {
      if (!symbolGroups.has(entry.symbol)) symbolGroups.set(entry.symbol, []);
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
          errors.push(`${label}: logo marked "ready" but missing/invalid ${missing.join(", ")}`);
        }
      }
    }

    const isWrappedOrBridged = entry.assetClass === "wrapped" || entry.assetClass === "bridged";
    const isActiveDailyEligible = entry.status === "active" && entry.eligibilityTier !== "excluded";
    if (isWrappedOrBridged && isActiveDailyEligible && entry.wrappedOrBridgedApproved !== true) {
      errors.push(`${label}: active Daily-eligible wrapped/bridged entry requires wrappedOrBridgedApproved:true`);
    }
  }

  // Duplicate symbols are allowed only when every entry sharing that symbol
  // declares the SAME explicit symbolConflictGroup.
  for (const [symbol, group] of symbolGroups) {
    if (group.length <= 1) continue;
    const groupIds = group.map((e) => e.symbolConflictGroup);
    const allDeclared = groupIds.every((g) => typeof g === "string" && g.length > 0);
    const allSame = allDeclared && groupIds.every((g) => g === groupIds[0]);
    if (!allSame) {
      errors.push(`symbol "${symbol}" is duplicated across ${group.length} entries without a matching symbolConflictGroup (symbol must never be used as a primary key)`);
    }
  }

  validateTokenIdIdentity(entries, errors);

  // Determinism self-check, and proof that reordering the input does not
  // change the hash (canonicalSerialize normalizes to tokenId order).
  const reversedHash = computeContentHash(schemaVersion, entries.slice().reverse());
  if (reversedHash !== recomputedHash) {
    errors.push("non-deterministic output: reordering entries changed the content hash");
  }

  return { errors, tokenIds, contentHash: recomputedHash, catalogVersion: computeCatalogVersion(schemaVersion, entries) };
}
