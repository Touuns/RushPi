#!/usr/bin/env node
// Builds the frozen V1 canonical token registry artifact from the current
// production 36-token catalog (api/_lib/tokenCatalog.ts) + the hand-authored
// V1 freeze metadata. Deterministic: no current time enters the artifact
// content, no Math.random, no network access. Run twice to confirm
// byte-identical output (see TESTS in the phase brief).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyCatalog } from "./lib/legacyCatalog.mjs";
import { V1_TOKEN_METADATA } from "./data/v1-metadata.mjs";
import {
  computeContentHash,
  computeCatalogVersion,
} from "./lib/canonical.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const SCHEMA_VERSION = 1;

function buildEntries() {
  const { entries: legacyEntries } = readLegacyCatalog(repoRoot);
  if (legacyEntries.length !== V1_TOKEN_METADATA.length) {
    throw new Error(
      `Legacy catalog has ${legacyEntries.length} entries but V1 metadata has ${V1_TOKEN_METADATA.length} — keep tools/registry/data/v1-metadata.mjs in sync with api/_lib/tokenCatalog.ts.`,
    );
  }

  const metaById = new Map(V1_TOKEN_METADATA.map((m) => [m.id, m]));

  return legacyEntries.map((legacy) => {
    const meta = metaById.get(legacy.id);
    if (!meta) {
      throw new Error(`No V1 metadata entry for legacy CoinGecko id "${legacy.id}".`);
    }
    return {
      tokenId: meta.tokenId,
      name: meta.name,
      symbol: legacy.preferredSymbol,
      slug: meta.slug,
      category: legacy.category,
      status: "active",
      eligibilityTier: meta.eligibilityTier,
      assetClass: meta.assetClass,
      providerIds: { coingecko: legacy.id },
      aliases: [],
      networks: [],
      logo: {
        status: "pending",
        version: 0,
        contentHash: null,
        url64: null,
        url128: null,
        source: null,
        sourceReference: null,
        ingestedAt: null,
      },
    };
  });
}

function buildArtifact(entries) {
  const sorted = entries.slice().sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1));
  const contentHash = computeContentHash(SCHEMA_VERSION, sorted);
  const catalogVersion = computeCatalogVersion(SCHEMA_VERSION, sorted);
  return {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion,
    entryCount: sorted.length,
    contentHash,
    entries: sorted,
  };
}

function buildLogoManifest(entries) {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: entries.map((e) => ({
      tokenId: e.tokenId,
      status: "pending",
      // Planned category only — nothing has actually been sourced yet.
      sourceType: "authorized-provider",
      sourceReference: null,
      sourceMimeType: null,
      // Unknown until the source format is actually known — never true here.
      requiresRasterization: null,
      normalizedSizes: [64, 128],
      version: 0,
      contentHash: null,
      url64: null,
      url128: null,
      ingestedAt: null,
      rejectionReason: null,
    })),
  };
}

function buildLegacyIdMap(entries) {
  const map = {};
  for (const e of entries) {
    if (e.providerIds.coingecko) map[e.providerIds.coingecko] = e.tokenId;
  }
  return map;
}

function writeJson(relativePath, value) {
  const filePath = path.join(repoRoot, relativePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function main() {
  const entries = buildEntries();
  const artifact = buildArtifact(entries);
  const logoManifest = buildLogoManifest(artifact.entries);
  const legacyIdMap = buildLegacyIdMap(artifact.entries);

  const artifactPath = writeJson("registry/tokens/v1/registry.json", artifact);
  const manifestPath = writeJson("registry/tokens/v1/logo-manifest.json", logoManifest);
  const mapPath = writeJson("registry/tokens/v1/legacy-id-map.json", legacyIdMap);

  console.log(`Wrote ${artifactPath}`);
  console.log(`Wrote ${manifestPath}`);
  console.log(`Wrote ${mapPath}`);
  console.log(`entryCount=${artifact.entryCount} catalogVersion=${artifact.catalogVersion} contentHash=${artifact.contentHash}`);
}

main();
