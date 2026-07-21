#!/usr/bin/env node
// Builds the V2 curated 250-token catalog PROPOSAL artifacts from:
//   - the frozen 36-entry V1 registry (preserved verbatim),
//   - the authored 214 new entries (data/v2-metadata.mjs, author-assigned tokenIds),
//   - the frozen CoinGecko capture (data/v2-provider-capture.json),
//   - the recognized-eligible set + diversity substitutions (12C-1B1.1),
//   - the structured identity review of the uncertain entries.
//
// Deterministic and OFFLINE: no network, no Math.random, and NO current time
// enters any output. Running twice yields byte-identical files. This is a
// PROPOSAL: nothing here is wired into the runtime, replaces V1, or is labelled
// "latest".
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeContentHash, computeCatalogVersion } from "./lib/canonical.mjs";
import { classifyExclusion } from "./lib/v2Exclusions.mjs";
import { computeBaseline } from "./lib/v2Baseline.mjs";
import { V2_NEW_ENTRIES } from "./data/v2-metadata.mjs";
import { V2_RECOGNIZED_ELIGIBLE } from "./data/v2-recognized-eligible.mjs";
import { V2_DIVERSITY_SUBSTITUTIONS } from "./data/v2-substitutions.mjs";
import { V2_UNCERTAIN_REVIEW } from "./data/v2-uncertain-review.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const SCHEMA_VERSION = 2;
const CATALOG_STAGE = "proposal";
const TARGET_COUNT = 250;
const outDir = path.join(repoRoot, "registry/tokens/v2-proposal");

const HARD_REASONS = new Set([
  "wrapped-or-bridged", "duplicate-underlying", "leveraged-or-derivative",
  "inactive-or-abandoned", "missing-market-data", "identity-not-sufficiently-verified",
  "unsupported-asset-form",
]);

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function pendingLogo() {
  return {
    status: "pending", version: 0, contentHash: null, url64: null, url128: null,
    source: null, sourceReference: null, ingestedAt: null,
  };
}

function buildV1Entries(v1) {
  return v1.entries.map((e) => ({
    tokenId: e.tokenId, name: e.name, symbol: e.symbol, slug: e.slug,
    category: e.category, status: "active", eligibilityTier: e.eligibilityTier,
    assetClass: e.assetClass, providerIds: { coingecko: e.providerIds.coingecko },
    aliases: [], networks: [], logo: pendingLogo(),
  }));
}

function buildNewEntries() {
  return V2_NEW_ENTRIES.map((m) => {
    const entry = {
      tokenId: m.tokenId, name: m.name, symbol: m.symbol, slug: m.slug,
      category: m.category, status: "active", eligibilityTier: m.eligibilityTier,
      assetClass: m.assetClass, providerIds: { coingecko: m.id },
      aliases: Array.isArray(m.aliases) ? m.aliases.slice() : [], networks: [], logo: pendingLogo(),
    };
    if (m.symbolConflictGroup) entry.symbolConflictGroup = m.symbolConflictGroup;
    return entry;
  });
}

const byTokenId = (a, b) => (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0);
const byRankThenId = (a, b) => {
  const ra = a.marketCapRank ?? Number.MAX_SAFE_INTEGER;
  const rb = b.marketCapRank ?? Number.MAX_SAFE_INTEGER;
  if (ra !== rb) return ra - rb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

function counts(items, keyFn) {
  const out = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function writeJson(fileName, value) {
  const filePath = path.join(outDir, fileName);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function main() {
  mkdirSync(outDir, { recursive: true });

  const v1 = loadJson("registry/tokens/v1/registry.json");
  const capture = loadJson("tools/registry/data/v2-provider-capture.json");
  const captureById = new Map(capture.rows.map((r) => [r.id, r]));

  const v1Entries = buildV1Entries(v1);
  const newEntries = buildNewEntries();
  const entries = [...v1Entries, ...newEntries].sort(byTokenId);

  const contentHash = computeContentHash(SCHEMA_VERSION, entries);
  const catalogVersion = computeCatalogVersion(SCHEMA_VERSION, entries);

  // --- Rank-based baseline + diversity-substitution accounting ---
  const v1Ids = new Set(v1.entries.map((e) => e.providerIds.coingecko));
  const selectedNonV1 = new Set(newEntries.map((e) => e.providerIds.coingecko));
  const recognizedEligible = new Set(V2_RECOGNIZED_ELIGIBLE.map((r) => r.id));
  const base = computeBaseline({ rows: capture.rows, v1Ids, selectedNonV1, recognizedEligible, targetCount: TARGET_COUNT });

  // EXPLICIT, human-curated pairs (12C-1B1.2) — NOT rank-zipped. Validate that
  // they exactly cover the computed baseline sets, are a bijection, and each is
  // a genuine reach-down (selectedRank > displacedRank). Semantic rationale
  // rules are enforced separately by lib/validateV2.mjs / validate-v2.mjs.
  const displacedSet = new Set(base.displaced);
  const extraSet = new Set(base.extra);
  const cateById = new Map(V2_RECOGNIZED_ELIGIBLE.map((r) => [r.id, r.category]));
  const tokenIdByCg = new Map(entries.map((e) => [e.providerIds.coingecko, e.tokenId]));
  const entryByCg = new Map(entries.map((e) => [e.providerIds.coingecko, e]));

  const subSel = new Set();
  const subDisp = new Set();
  for (const s of V2_DIVERSITY_SUBSTITUTIONS) {
    if (!s.selectedId || !s.displacedId) throw new Error("substitution entry missing selectedId/displacedId");
    if (subSel.has(s.selectedId)) throw new Error(`selected ${s.selectedId} used in more than one pair`);
    if (subDisp.has(s.displacedId)) throw new Error(`displaced ${s.displacedId} used in more than one pair`);
    subSel.add(s.selectedId);
    subDisp.add(s.displacedId);
    if (!extraSet.has(s.selectedId)) throw new Error(`selected ${s.selectedId} is not a proposal entry outside the baseline`);
    if (!displacedSet.has(s.displacedId)) throw new Error(`displaced ${s.displacedId} is not a baseline member outside the proposal`);
    const sr = base.rankLookup(s.selectedId);
    const dr = base.rankLookup(s.displacedId);
    if (!(typeof sr === "number" && typeof dr === "number" && sr > dr)) {
      throw new Error(`pair ${s.selectedId}<-${s.displacedId}: selectedRank (${sr}) must be numerically greater than displacedRank (${dr})`);
    }
  }
  const uncoveredExtra = [...extraSet].filter((id) => !subSel.has(id));
  const uncoveredDisplaced = [...displacedSet].filter((id) => !subDisp.has(id));
  if (uncoveredExtra.length || uncoveredDisplaced.length) {
    throw new Error(`explicit pairs must exactly cover the baseline sets. uncovered extra=${uncoveredExtra.join(",")} uncovered displaced=${uncoveredDisplaced.join(",")}`);
  }

  const rationaleById = new Map(V2_DIVERSITY_SUBSTITUTIONS.map((s) => [s.displacedId, s]));
  const displacedToSelectedTokenId = new Map(V2_DIVERSITY_SUBSTITUTIONS.map((s) => [s.displacedId, tokenIdByCg.get(s.selectedId)]));

  const substitutionPairs = V2_DIVERSITY_SUBSTITUTIONS
    .map((s) => {
      const sel = entryByCg.get(s.selectedId);
      const selRow = captureById.get(s.selectedId);
      const dispRow = captureById.get(s.displacedId);
      const sr = selRow.marketCapRank ?? null;
      const dr = dispRow.marketCapRank ?? null;
      return {
        selected: { tokenId: sel.tokenId, providerId: s.selectedId, name: sel.name, symbol: sel.symbol, marketCapRank: sr, category: sel.category },
        displaced: { providerId: s.displacedId, name: dispRow.name, symbol: dispRow.symbol, marketCapRank: dr, category: cateById.get(s.displacedId) ?? null },
        rationaleCode: s.rationaleCode,
        explanation: s.explanation,
        rankDelta: sr !== null && dr !== null ? sr - dr : null,
      };
    })
    .sort((a, b) => (a.displaced.marketCapRank ?? 1e9) - (b.displaced.marketCapRank ?? 1e9));

  // --- registry.json (proposal) ---
  const registry = {
    schemaVersion: SCHEMA_VERSION, catalogStage: CATALOG_STAGE, catalogVersion,
    entryCount: entries.length, contentHash, entries,
  };

  // --- logo-manifest.json (proposal) ---
  const logoManifest = {
    schemaVersion: SCHEMA_VERSION, catalogStage: CATALOG_STAGE,
    entries: entries.map((e) => ({ tokenId: e.tokenId, status: "pending", version: 0, requiresRasterization: null })),
  };

  // --- provider-snapshot.json ---
  const snapshotRows = capture.rows
    .map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, marketCapRank: r.marketCapRank ?? null, marketCap: r.marketCap ?? null, lastUpdated: r.lastUpdated ?? null }))
    .sort(byRankThenId);
  const providerSnapshot = {
    schemaVersion: SCHEMA_VERSION, catalogStage: CATALOG_STAGE, provider: capture.provider,
    endpoint: capture.endpoint, queryParams: capture.queryParams, retrievedAt: capture.retrievedAt,
    rowCount: snapshotRows.length, rows: snapshotRows,
  };

  // --- exclusions.json: every considered-but-excluded candidate ---
  const excludedRows = capture.rows.filter((r) => !tokenIdByCg.has(r.id)).sort(byRankThenId);
  const exclusions = excludedRows.map((r) => {
    let reasonCode; let explanation; let underlyingAssetId = null; let evidenceReference = null;
    let displacedForTokenId; let rationaleCode;
    if (displacedSet.has(r.id)) {
      const rat = rationaleById.get(r.id);
      reasonCode = "diversity-substitution";
      rationaleCode = rat.rationaleCode;
      explanation = rat.explanation;
      displacedForTokenId = displacedToSelectedTokenId.get(r.id); // the retained selection kept over it
    } else if (recognizedEligible.has(r.id)) {
      reasonCode = "lower-priority-capacity-cutoff";
      explanation = "Recognizable eligible asset ranked below the top-214 baseline fill cutoff.";
    } else {
      const c = classifyExclusion(r);
      if (c.reasonCode === "lower-priority-capacity-cutoff") {
        // Not affirmatively recognized as eligible -> neutral identity bucket.
        reasonCode = "identity-not-sufficiently-verified";
        explanation = "Identity/issuer not verified to catalog-inclusion confidence within this proposal's scope.";
      } else {
        reasonCode = c.reasonCode;
        explanation = c.explanation;
        underlyingAssetId = c.underlyingAssetId ?? null;
        evidenceReference = c.evidenceReference ?? null;
      }
    }
    const row = { providerId: r.id, name: r.name, symbol: r.symbol, marketCapRank: r.marketCapRank ?? null, reasonCode, explanation, underlyingAssetId, evidenceReference };
    if (rationaleCode) row.rationaleCode = rationaleCode;
    if (displacedForTokenId) row.displacedForTokenId = displacedForTokenId;
    return row;
  });
  const exclusionsArtifact = {
    schemaVersion: SCHEMA_VERSION, catalogStage: CATALOG_STAGE, providerRetrievedAt: capture.retrievedAt,
    count: exclusions.length, exclusions,
  };

  // --- curation-report.json ---
  const exclusionCountsByReason = counts(exclusions, (x) => x.reasonCode);
  const hardExclusionCount = exclusions.filter((x) => HARD_REASONS.has(x.reasonCode)).length;
  const uncertainReview = V2_UNCERTAIN_REVIEW.map((u) => ({ ...u, includedTokenId: tokenIdByCg.get(u.providerId) ?? null }));
  const verifiedUncertain = uncertainReview.filter((u) => u.reviewOutcome === "verified").length;
  const unresolvedUncertain = uncertainReview.filter((u) => u.reviewOutcome === "excluded-unresolved").length;

  const uncertaintyCapture = loadJson("tools/registry/data/v2-uncertain-capture.json");

  const curationReport = {
    schemaVersion: SCHEMA_VERSION, catalogStage: CATALOG_STAGE, catalogVersion, contentHash,
    provider: { name: capture.provider, endpoint: capture.endpoint, retrievedAt: capture.retrievedAt, pages: capture.queryParams.pages, candidateUniverse: capture.rowCount },
    finalCount: entries.length,
    preservedV1Count: v1.entries.length,
    newCount: newEntries.length,
    anchors: entries.filter((e) => e.eligibilityTier === "anchor").map((e) => e.symbol).sort(),
    tierCounts: counts(entries, (e) => e.eligibilityTier),
    categoryCounts: counts(entries, (e) => e.category),
    assetClassCounts: counts(entries, (e) => e.assetClass),
    exclusionCountsByReason,
    baseline: {
      methodology: "Preserve 36 V1; hard-exclude wrapped/bridged, duplicate-underlying, leveraged/derivative, unsupported asset forms, inactive/abandoned, missing-data and identity-not-verified assets; fill remaining slots with the highest-ranked eligible assets (V1 + selected + recognized-eligible) to exactly 250.",
      baselineCount: base.baselineIds.size,
      hardExclusionCount,
      naturalCutoffRank: base.naturalCutoffRank,
      mandatoryV1OutsideNaturalCutoffCount: base.mandatoryV1OutsideNaturalCutoff.length,
      mandatoryV1OutsideNaturalCutoff: base.mandatoryV1OutsideNaturalCutoff,
      hardExclusionTailFillCount: base.hardExclusionTailFills.length,
      hardExclusionTailFills: base.hardExclusionTailFills,
      trueDiversitySubstitutionCount: substitutionPairs.length,
    },
    diversitySubstitutions: { count: substitutionPairs.length, pairs: substitutionPairs },
    uncertainEntries: { reviewedAt: uncertaintyCapture.retrievedAt, verifiedCount: verifiedUncertain, unresolvedCount: unresolvedUncertain, reviews: uncertainReview },
    symbolConflictGroups: [],
  };

  writeJson("registry.json", registry);
  writeJson("logo-manifest.json", logoManifest);
  writeJson("provider-snapshot.json", providerSnapshot);
  writeJson("exclusions.json", exclusionsArtifact);
  writeJson("curation-report.json", curationReport);

  console.log(`Wrote V2 proposal to ${outDir}`);
  console.log(`entryCount=${registry.entryCount} catalogVersion=${catalogVersion}`);
  console.log(`contentHash=${contentHash}`);
  console.log(`trueDiversitySubstitutions=${substitutionPairs.length} hardExclusions=${hardExclusionCount} tailFills=${base.hardExclusionTailFills.length} v1OutsideCutoff=${base.mandatoryV1OutsideNaturalCutoff.length}`);
  console.log(`exclusions=${exclusions.length} reasons=${JSON.stringify(exclusionCountsByReason)}`);
  console.log(`uncertain verified=${verifiedUncertain} unresolved=${unresolvedUncertain}`);
}

main();
