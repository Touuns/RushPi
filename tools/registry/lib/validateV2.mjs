// Reusable, pure V2-proposal validation checks (Phase 12C-1B1). Shared by
// tools/registry/validate-v2.mjs (reads the real artifacts) and
// tools/registry/selftest-v2.mjs (in-memory negative fixtures). Builds on the
// shared lib/validateEntries.mjs rather than duplicating its logic — this file
// only adds the constraints that are specific to the V2 proposal.
import { validateEntries } from "./validateEntries.mjs";
import { V2_CANONICAL_CATEGORIES } from "./v2Categories.mjs";

const EXPECTED_ENTRY_COUNT = 250;
const TOKEN_ID_PATTERN = /^rpt-[0-9]{4}$/;
const ANCHOR_COINGECKO_IDS = ["bitcoin", "ethereum"];

/**
 * Validate the proposal's entries against the shared entry contract (with the
 * expanded V2 category set) plus the V2-specific rules.
 * @param {{schemaVersion:number, catalogVersion?:string, entryCount?:number, contentHash?:string, entries:any[]}} registry
 * @param {any[]} v1Entries  the frozen V1 registry entries, for preservation checks
 */
export function validateProposalEntries(registry, v1Entries) {
  const errors = [];
  const entries = registry.entries;

  const { errors: baseErrors, tokenIds } = validateEntries(registry.schemaVersion, entries, {
    expectedEntryCount: registry.entryCount,
    expectedContentHash: registry.contentHash,
    expectedCatalogVersion: registry.catalogVersion,
    allowedCategories: V2_CANONICAL_CATEGORIES,
  });
  errors.push(...baseErrors);

  // Exactly 250 entries.
  if (entries.length !== EXPECTED_ENTRY_COUNT) {
    errors.push(`expected exactly ${EXPECTED_ENTRY_COUNT} entries, got ${entries.length}`);
  }

  // catalogVersion must not be a mutable label.
  if (registry.catalogVersion === "latest") {
    errors.push('catalogVersion must be immutable/content-derived, not "latest"');
  }

  const byTokenId = new Map(entries.map((e) => [e.tokenId, e]));
  const byCoingecko = new Map(entries.map((e) => [e.providerIds && e.providerIds.coingecko, e]));

  // Every entry: explicit tokenId, active, non-excluded tier, not wrapped/bridged.
  for (const e of entries) {
    if (!TOKEN_ID_PATTERN.test(e.tokenId ?? "")) {
      errors.push(`entry ${e.tokenId}: tokenId must be an explicit rpt-#### literal`);
    }
    if (e.status !== "active") errors.push(`entry ${e.tokenId}: status must be "active", got "${e.status}"`);
    if (e.eligibilityTier === "excluded") errors.push(`entry ${e.tokenId}: eligibilityTier must not be "excluded"`);
    if (e.assetClass === "wrapped" || e.assetClass === "bridged") {
      errors.push(`entry ${e.tokenId}: wrapped/bridged assets must not appear in the proposal`);
    }
  }

  // Exactly two anchors: Bitcoin and Ethereum.
  const anchors = entries.filter((e) => e.eligibilityTier === "anchor");
  if (anchors.length !== 2) errors.push(`expected exactly 2 anchor entries, got ${anchors.length}`);
  for (const cg of ANCHOR_COINGECKO_IDS) {
    const e = byCoingecko.get(cg);
    if (!e) errors.push(`missing anchor asset "${cg}"`);
    else if (e.eligibilityTier !== "anchor") errors.push(`asset "${cg}" must be an anchor, got tier "${e.eligibilityTier}"`);
  }

  // All V1 tokenIds + CoinGecko ids preserved with no reassignment.
  for (const v1 of v1Entries) {
    const e = byTokenId.get(v1.tokenId);
    if (!e) {
      errors.push(`V1 tokenId ${v1.tokenId} missing from the proposal`);
      continue;
    }
    const v1Cg = v1.providerIds && v1.providerIds.coingecko;
    const cg = e.providerIds && e.providerIds.coingecko;
    if (cg !== v1Cg) errors.push(`V1 ${v1.tokenId}: CoinGecko id changed ${v1Cg} -> ${cg}`);
    if (e.symbol !== v1.symbol) errors.push(`V1 ${v1.tokenId}: symbol changed ${v1.symbol} -> ${e.symbol}`);
    if (e.slug !== v1.slug) errors.push(`V1 ${v1.tokenId}: slug changed ${v1.slug} -> ${e.slug}`);
    if (e.name !== v1.name) errors.push(`V1 ${v1.tokenId}: name changed ${v1.name} -> ${e.name}`);
    if (e.category !== v1.category) errors.push(`V1 ${v1.tokenId}: category changed ${v1.category} -> ${e.category}`);
  }

  return { errors, tokenIds };
}

/**
 * Validate the V2 logo manifest: exactly one pending, zero-state entry per
 * registry token, with none of the source/URL/hash/ingestion fields present.
 */
export function validateProposalManifest(registryTokenIds, manifestEntries) {
  const errors = [];
  if (!Array.isArray(manifestEntries)) {
    errors.push("logo manifest entries is not an array");
    return errors;
  }
  if (manifestEntries.length !== registryTokenIds.size) {
    errors.push(`manifest entry count (${manifestEntries.length}) differs from registry entry count (${registryTokenIds.size})`);
  }
  const forbiddenKeys = ["contentHash", "url64", "url128", "ingestedAt", "sourceReference", "sourceMimeType", "hash", "url", "image"];
  const seen = new Set();
  for (const m of manifestEntries) {
    const label = `logo manifest entry ${m.tokenId ?? "<unknown>"}`;
    if (!m.tokenId || !registryTokenIds.has(m.tokenId)) errors.push(`${label}: tokenId absent from registry`);
    else if (seen.has(m.tokenId)) errors.push(`duplicate manifest tokenId: ${m.tokenId}`);
    if (m.tokenId) seen.add(m.tokenId);
    if (m.status !== "pending") errors.push(`${label}: status must be "pending", got "${m.status}"`);
    if (m.version !== 0) errors.push(`${label}: version must be 0, got ${m.version}`);
    if (m.requiresRasterization !== null) errors.push(`${label}: requiresRasterization must be null before any source is known`);
    for (const k of forbiddenKeys) {
      if (Object.prototype.hasOwnProperty.call(m, k)) errors.push(`${label}: forbidden field "${k}" present (nothing has been sourced)`);
    }
  }
  for (const tokenId of registryTokenIds) {
    if (!seen.has(tokenId)) errors.push(`registry tokenId absent from logo manifest: ${tokenId}`);
  }
  return errors;
}

/** Any image/logo URL anywhere in a serialized artifact is a hard failure. */
export function findImageUrls(text) {
  const matches = text.match(/https?:\/\/[^"'\s]*\.(?:png|jpe?g|svg|gif|webp)/gi) || [];
  const hostMatches = text.match(/https?:\/\/[^"'\s]*(?:coin-images|assets\.coingecko|imgproxy)[^"'\s]*/gi) || [];
  return [...matches, ...hostMatches];
}

/** Any credential-looking field in the provider snapshot is a hard failure. */
export function findSecrets(text) {
  return text.match(/\b(?:api[_-]?key|x-cg-[a-z-]*key|secret|authorization|bearer)\b/gi) || [];
}

/** Market ranks must be positive integers or explicitly null. */
export function validateProviderSnapshot(snapshot) {
  const errors = [];
  if (!Array.isArray(snapshot.rows)) {
    errors.push("provider snapshot rows is not an array");
    return errors;
  }
  for (const r of snapshot.rows) {
    if (r.marketCapRank !== null && !(Number.isInteger(r.marketCapRank) && r.marketCapRank > 0)) {
      errors.push(`provider snapshot ${r.id}: marketCapRank must be a positive integer or null, got ${r.marketCapRank}`);
    }
    if (Object.prototype.hasOwnProperty.call(r, "image")) {
      errors.push(`provider snapshot ${r.id}: must not carry an image field`);
    }
  }
  return errors;
}
