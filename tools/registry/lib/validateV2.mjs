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
const MAX_TRUE_DIVERSITY_SUBSTITUTIONS = 30;

/**
 * Validate the hand-authored selection input BEFORE any metadata is generated.
 * tokenIds must be explicit author literals — the generator must never allocate
 * one — so this rejects a missing/badly-formed/duplicate tokenId or any
 * collision with the frozen V1 tokenId range. Pure: shared by
 * gen-v2-metadata.mjs and selftest-v2.mjs.
 * @param {any[]} selections
 * @param {Set<string>} v1TokenIds  frozen V1 tokenIds (rpt-0001..rpt-0036)
 */
export function validateSelectionInput(selections, v1TokenIds) {
  const errors = [];
  if (!Array.isArray(selections)) return ["selection input is not an array"];
  const seen = new Set();
  for (const e of selections) {
    const label = e && e.id ? `selection "${e.id}"` : "selection <unknown>";
    if (!e || typeof e.tokenId !== "string" || e.tokenId.length === 0) {
      errors.push(`${label}: missing explicit tokenId (the generator must never allocate one)`);
      continue;
    }
    if (!TOKEN_ID_PATTERN.test(e.tokenId)) errors.push(`${label}: tokenId "${e.tokenId}" must match ^rpt-[0-9]{4}$`);
    if (v1TokenIds.has(e.tokenId)) errors.push(`${label}: tokenId "${e.tokenId}" collides with a frozen V1 tokenId`);
    if (seen.has(e.tokenId)) errors.push(`${label}: duplicate tokenId "${e.tokenId}"`);
    seen.add(e.tokenId);
  }
  return errors;
}

export { MAX_TRUE_DIVERSITY_SUBSTITUTIONS };

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

const UNCERTAINTY_TYPES = new Set(["rebrand", "migration", "ambiguous-name", "ambiguous-symbol", "category"]);
const REVIEW_OUTCOMES = new Set(["verified", "excluded-unresolved"]);
const SUBSTITUTION_RATIONALES = new Set([
  "stablecoin-overweight-avoidance", "redundant-subsector", "category-coverage", "identity-ambiguity-preference",
]);

function firstWord(s) {
  return String(s || "").trim().toLowerCase().split(/[\s.\-]+/)[0] || "";
}
// Does the explanation actually name a side (by symbol, full name, or the
// leading word of the name)? Guards against generic, non-pair-specific text.
function mentions(explanationLc, side) {
  const name = String(side.name || "").toLowerCase();
  const sym = String(side.symbol || "").toLowerCase();
  return (name.length > 1 && explanationLc.includes(name)) ||
    (sym.length > 2 && explanationLc.includes(sym)) ||
    explanationLc.includes(firstWord(side.name));
}

/**
 * Validate the EXPLICIT, human-curated diversity-substitution pairs
 * (Phase 12C-1B1.2): <=30, strict bijection, selected⊂catalog, displaced∩
 * catalog=∅, selectedRank>displacedRank, each displaced carries a
 * diversity-substitution exclusion, the rationaleCode obeys its semantic rule
 * for that exact pair, and the explanation is pair-specific (names both sides).
 * @param {Array} pairs  substitution pairs {selected:{providerId,name,symbol,marketCapRank,category}, displaced:{...}, rationaleCode, explanation}
 * @param {Set<string>} selectedCgIds  catalog CoinGecko ids
 * @param {Set<string>} diversityExclusionIds  provider ids flagged diversity-substitution in exclusions.json
 * @param {Record<string,number>} categoryCounts  catalog category -> count
 */
export function validateSubstitutionSets(pairs, selectedCgIds, diversityExclusionIds, categoryCounts = {}) {
  const errors = [];
  if (!Array.isArray(pairs)) return ["diversity substitution pairs is not an array"];
  if (pairs.length > MAX_TRUE_DIVERSITY_SUBSTITUTIONS) {
    errors.push(`true diversity substitutions ${pairs.length} exceed the max of ${MAX_TRUE_DIVERSITY_SUBSTITUTIONS}`);
  }
  const sel = new Set();
  const disp = new Set();
  for (const p of pairs) {
    const s = p.selected && p.selected.providerId;
    const d = p.displaced && p.displaced.providerId;
    if (!s || !d) { errors.push("substitution pair missing selected/displaced providerId"); continue; }
    const tag = `pair ${s}<-${d}`;
    if (sel.has(s)) errors.push(`selected ${s} appears in more than one substitution pair`);
    if (disp.has(d)) errors.push(`displaced ${d} appears in more than one substitution pair`);
    sel.add(s); disp.add(d);
    if (!selectedCgIds.has(s)) errors.push(`${tag}: selected is not in the catalog`);
    if (selectedCgIds.has(d)) errors.push(`${tag}: displaced is also selected (overlap)`);
    if (!SUBSTITUTION_RATIONALES.has(p.rationaleCode)) errors.push(`${tag}: unknown rationaleCode "${p.rationaleCode}"`);

    // A substitution is a deliberate reach-DOWN: the kept asset must be ranked
    // numerically higher (worse) than the displaced one.
    const sr = p.selected.marketCapRank;
    const dr = p.displaced.marketCapRank;
    if (!(typeof sr === "number" && typeof dr === "number" && sr > dr)) {
      errors.push(`${tag}: selectedRank (${sr}) must be numerically greater than displacedRank (${dr})`);
    }

    // Explanation must be specific and name both sides.
    const ex = String(p.explanation || "");
    const exLc = ex.toLowerCase();
    if (ex.length < 40) errors.push(`${tag}: explanation is too short to be pair-specific`);
    if (!mentions(exLc, p.selected) || !mentions(exLc, p.displaced)) {
      errors.push(`${tag}: explanation must name both the selected and the displaced asset`);
    }

    // Per-rationale semantic rules.
    const sc = p.selected.category;
    const dc = p.displaced.category;
    if (p.rationaleCode === "stablecoin-overweight-avoidance") {
      if (dc !== "stablecoin") errors.push(`${tag}: stablecoin-overweight-avoidance requires the displaced asset to be a stablecoin (got "${dc}")`);
      if (sc === "stablecoin") errors.push(`${tag}: stablecoin-overweight-avoidance requires the selected asset NOT to be a stablecoin`);
    } else if (p.rationaleCode === "category-coverage") {
      const scn = categoryCounts[sc] ?? 0;
      const dcn = categoryCounts[dc] ?? 0;
      if (!(scn < dcn)) errors.push(`${tag}: category-coverage requires the selected category (${sc}=${scn}) to be less represented than the displaced category (${dc}=${dcn})`);
    } else if (p.rationaleCode === "redundant-subsector") {
      if (sc !== dc) errors.push(`${tag}: redundant-subsector requires both assets to share the broad category (got ${sc} vs ${dc})`);
      if (!exLc.includes("subsector")) errors.push(`${tag}: redundant-subsector explanation must identify the shared subsector context`);
    } else if (p.rationaleCode === "identity-ambiguity-preference") {
      if (!exLc.includes("ambig")) errors.push(`${tag}: identity-ambiguity-preference explanation must document the displaced identity ambiguity`);
    }
  }
  for (const d of disp) {
    if (!diversityExclusionIds.has(d)) errors.push(`displaced ${d} is missing a diversity-substitution exclusion`);
  }
  for (const d of diversityExclusionIds) {
    if (!disp.has(d)) errors.push(`exclusion ${d} is marked diversity-substitution but has no substitution pair`);
  }
  return errors;
}

/**
 * Validate the structured review of uncertain included entries: every expected
 * providerId is reviewed with the required fields; a "verified" entry must be
 * in the catalog; an "excluded-unresolved" entry must NOT be (it was replaced).
 */
export function validateUncertainReview(reviews, expectedProviderIds, selectedCgIds) {
  const errors = [];
  if (!Array.isArray(reviews)) return ["uncertain review is not an array"];
  const seen = new Set();
  for (const u of reviews) {
    const label = `uncertain review ${u.providerId ?? "<unknown>"}`;
    if (u.providerId) seen.add(u.providerId);
    if (!UNCERTAINTY_TYPES.has(u.uncertaintyType)) errors.push(`${label}: unknown uncertaintyType "${u.uncertaintyType}"`);
    if (!REVIEW_OUTCOMES.has(u.reviewOutcome)) errors.push(`${label}: unknown reviewOutcome "${u.reviewOutcome}"`);
    for (const f of ["canonicalNameDecision", "symbolDecision", "categoryDecision", "providerEvidenceReference", "reviewedAt", "note"]) {
      if (typeof u[f] !== "string" || u[f].length === 0) errors.push(`${label}: missing required field "${f}"`);
    }
    if (!Array.isArray(u.officialEvidenceReferences) || u.officialEvidenceReferences.length === 0) {
      errors.push(`${label}: officialEvidenceReferences must be a non-empty array`);
    }
    if (u.reviewOutcome === "verified" && !selectedCgIds.has(u.providerId)) errors.push(`${label}: verified but not present in the catalog`);
    if (u.reviewOutcome === "excluded-unresolved" && selectedCgIds.has(u.providerId)) errors.push(`${label}: excluded-unresolved but still present in the catalog`);
  }
  for (const id of expectedProviderIds) {
    if (!seen.has(id)) errors.push(`uncertain review missing expected entry: ${id}`);
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
