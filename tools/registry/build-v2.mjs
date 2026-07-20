#!/usr/bin/env node
// Builds the V2 curated 250-token catalog PROPOSAL artifacts from:
//   - the frozen 36-entry V1 registry (preserved verbatim),
//   - the authored 214 new entries (data/v2-metadata.mjs, literal tokenIds),
//   - the frozen CoinGecko capture (data/v2-provider-capture.json).
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
import { V2_NEW_ENTRIES } from "./data/v2-metadata.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const SCHEMA_VERSION = 2;
const CATALOG_STAGE = "proposal";
const outDir = path.join(repoRoot, "registry/tokens/v2-proposal");

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function pendingLogo() {
  return {
    status: "pending",
    version: 0,
    contentHash: null,
    url64: null,
    url128: null,
    source: null,
    sourceReference: null,
    ingestedAt: null,
  };
}

// The 36 frozen V1 entries, preserved verbatim (tokenId, provider id, name,
// symbol, slug, category, assetClass, eligibilityTier) — only re-emitted into
// the proposal, never re-authored. BTC/ETH keep "anchor"; the rest keep "core".
function buildV1Entries(v1) {
  return v1.entries.map((e) => ({
    tokenId: e.tokenId,
    name: e.name,
    symbol: e.symbol,
    slug: e.slug,
    category: e.category,
    status: "active",
    eligibilityTier: e.eligibilityTier,
    assetClass: e.assetClass,
    providerIds: { coingecko: e.providerIds.coingecko },
    aliases: [],
    networks: [],
    logo: pendingLogo(),
  }));
}

function buildNewEntries() {
  return V2_NEW_ENTRIES.map((m) => {
    const entry = {
      tokenId: m.tokenId,
      name: m.name,
      symbol: m.symbol,
      slug: m.slug,
      category: m.category,
      status: "active",
      eligibilityTier: m.eligibilityTier,
      assetClass: m.assetClass,
      providerIds: { coingecko: m.id },
      aliases: Array.isArray(m.aliases) ? m.aliases.slice() : [],
      networks: [],
      logo: pendingLogo(),
    };
    if (m.symbolConflictGroup) entry.symbolConflictGroup = m.symbolConflictGroup;
    return entry;
  });
}

function byTokenId(a, b) {
  return a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0;
}

function byRankThenId(a, b) {
  const ra = a.marketCapRank ?? Number.MAX_SAFE_INTEGER;
  const rb = b.marketCapRank ?? Number.MAX_SAFE_INTEGER;
  if (ra !== rb) return ra - rb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function counts(items, keyFn) {
  const out = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  // Deterministic key ordering.
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

  const v1Entries = buildV1Entries(v1);
  const newEntries = buildNewEntries();
  const entries = [...v1Entries, ...newEntries].sort(byTokenId);

  const contentHash = computeContentHash(SCHEMA_VERSION, entries);
  const catalogVersion = computeCatalogVersion(SCHEMA_VERSION, entries);

  // --- registry.json (proposal) ---
  const registry = {
    schemaVersion: SCHEMA_VERSION,
    catalogStage: CATALOG_STAGE, // explicit: this is a proposal, not production, not "latest".
    catalogVersion,
    entryCount: entries.length,
    contentHash,
    entries,
  };

  // --- logo-manifest.json (proposal): exactly one pending entry per token,
  // no source/URL/hash/ingestedAt fields at all — nothing has been sourced. ---
  const logoManifest = {
    schemaVersion: SCHEMA_VERSION,
    catalogStage: CATALOG_STAGE,
    entries: entries.map((e) => ({
      tokenId: e.tokenId,
      status: "pending",
      version: 0,
      requiresRasterization: null,
    })),
  };

  // --- provider-snapshot.json: audit-only market identity/ranking. No image
  // URL, no price history, no credentials. Deterministic canonical ordering. ---
  const snapshotRows = capture.rows
    .map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      marketCapRank: r.marketCapRank ?? null,
      marketCap: r.marketCap ?? null,
      lastUpdated: r.lastUpdated ?? null,
    }))
    .sort(byRankThenId);
  const providerSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    catalogStage: CATALOG_STAGE,
    provider: capture.provider,
    endpoint: capture.endpoint,
    queryParams: capture.queryParams,
    retrievedAt: capture.retrievedAt,
    rowCount: snapshotRows.length,
    rows: snapshotRows,
  };

  // --- exclusions.json: every considered-but-excluded candidate. ---
  const selectedIds = new Set(entries.map((e) => e.providerIds.coingecko));
  const excludedRows = capture.rows.filter((r) => !selectedIds.has(r.id)).sort(byRankThenId);
  const exclusions = excludedRows.map((r) => {
    const c = classifyExclusion(r);
    return {
      providerId: r.id,
      name: r.name,
      symbol: r.symbol,
      marketCapRank: r.marketCapRank ?? null,
      reasonCode: c.reasonCode,
      explanation: c.explanation,
      underlyingAssetId: c.underlyingAssetId,
      evidenceReference: c.evidenceReference,
    };
  });
  const exclusionsArtifact = {
    schemaVersion: SCHEMA_VERSION,
    catalogStage: CATALOG_STAGE,
    providerRetrievedAt: capture.retrievedAt,
    count: exclusions.length,
    exclusions,
  };

  // --- curation-report.json ---
  const captureById = new Map(capture.rows.map((r) => [r.id, r]));
  const rankOf = (e) => {
    const row = captureById.get(e.providerIds.coingecko);
    return row ? row.marketCapRank ?? null : null;
  };
  const diversityPicks = entries
    .filter((e) => {
      const r = rankOf(e);
      return typeof r === "number" && r > 250;
    })
    .map((e) => ({ tokenId: e.tokenId, providerId: e.providerIds.coingecko, symbol: e.symbol, marketCapRank: rankOf(e) }))
    .sort((a, b) => a.marketCapRank - b.marketCapRank);

  const v1IdsInCapture = v1.entries.filter((e) => captureById.has(e.providerIds.coingecko)).length;
  const exclusionCountsByReason = counts(exclusions, (x) => x.reasonCode);
  const identityUnverified = exclusions.filter((x) => x.reasonCode === "identity-not-sufficiently-verified");

  // Highest remaining curation uncertainty among INCLUDED entries: canonical
  // rebrands/renames and low-cap diversity picks reaching deep into the tail.
  const uncertaintyIds = new Set([
    "the-open-network", "vaulta", "sonic-3", "kaia", "fetch-ai", "sky",
    "eigenlayer", "gas", "chain-2", "safe",
  ]);
  const highestUncertaintyIncluded = entries
    .filter((e) => uncertaintyIds.has(e.providerIds.coingecko))
    .map((e) => ({ tokenId: e.tokenId, providerId: e.providerIds.coingecko, name: e.name, symbol: e.symbol, note: "canonical rename/rebrand or deep-tail diversity pick" }));

  const anchors = entries.filter((e) => e.eligibilityTier === "anchor").map((e) => e.symbol).sort();

  const curationReport = {
    schemaVersion: SCHEMA_VERSION,
    catalogStage: CATALOG_STAGE,
    catalogVersion,
    contentHash,
    provider: {
      name: capture.provider,
      endpoint: capture.endpoint,
      retrievedAt: capture.retrievedAt,
      pages: capture.queryParams.pages,
      candidateUniverse: capture.rowCount,
    },
    finalCount: entries.length,
    preservedV1Count: v1.entries.length,
    v1PresentInCaptureCount: v1IdsInCapture,
    newCount: newEntries.length,
    anchors,
    tierCounts: counts(entries, (e) => e.eligibilityTier),
    categoryCounts: counts(entries, (e) => e.category),
    assetClassCounts: counts(entries, (e) => e.assetClass),
    exclusionCountsByReason,
    symbolConflictGroups: [],
    diversitySubstitutions: { count: diversityPicks.length, picks: diversityPicks },
    manuallyReviewedAmbiguousCount: identityUnverified.length,
    unresolvedExcludedCount: identityUnverified.length,
    highestUncertaintyIncluded,
  };

  writeJson("registry.json", registry);
  writeJson("logo-manifest.json", logoManifest);
  writeJson("provider-snapshot.json", providerSnapshot);
  writeJson("exclusions.json", exclusionsArtifact);
  writeJson("curation-report.json", curationReport);

  console.log(`Wrote V2 proposal to ${outDir}`);
  console.log(`entryCount=${registry.entryCount} catalogVersion=${catalogVersion}`);
  console.log(`contentHash=${contentHash}`);
  console.log(`exclusions=${exclusions.length} diversityPicks=${diversityPicks.length}`);
  console.log(`tiers=${JSON.stringify(curationReport.tierCounts)}`);
}

main();
