#!/usr/bin/env node
// Validates the V2 catalog PROPOSAL artifacts in registry/tokens/v2-proposal/
// against the V2 contract (Phase 12C-1B1). Exits non-zero on any failure.
// Reuses the shared entry validator; adds only V2-specific rules. Run twice to
// confirm identical output.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateProposalEntries,
  validateProposalManifest,
  validateProviderSnapshot,
  findImageUrls,
  findSecrets,
} from "./lib/validateV2.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const proposalDir = path.join(repoRoot, "registry/tokens/v2-proposal");

function readText(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}
function readJson(rel) {
  return JSON.parse(readText(rel));
}

function main() {
  const errors = [];

  const registry = readJson("registry/tokens/v2-proposal/registry.json");
  const manifest = readJson("registry/tokens/v2-proposal/logo-manifest.json");
  const snapshot = readJson("registry/tokens/v2-proposal/provider-snapshot.json");
  const exclusions = readJson("registry/tokens/v2-proposal/exclusions.json");
  const v1 = readJson("registry/tokens/v1/registry.json");

  // Proposal must NOT be labelled production/latest.
  if (registry.catalogStage !== "proposal") {
    errors.push(`registry.catalogStage must be "proposal", got "${registry.catalogStage}"`);
  }

  const { errors: entryErrors, tokenIds } = validateProposalEntries(registry, v1.entries);
  errors.push(...entryErrors);

  errors.push(...validateProposalManifest(tokenIds, manifest.entries));
  errors.push(...validateProviderSnapshot(snapshot));

  // No image/logo URL anywhere in ANY proposal artifact.
  for (const file of ["registry.json", "logo-manifest.json", "provider-snapshot.json", "exclusions.json", "curation-report.json"]) {
    const text = readText(`registry/tokens/v2-proposal/${file}`);
    const imgs = findImageUrls(text);
    if (imgs.length) errors.push(`${file}: image/logo URL(s) present: ${imgs.slice(0, 3).join(", ")}`);
  }

  // No credentials in the provider snapshot.
  const secrets = findSecrets(readText("registry/tokens/v2-proposal/provider-snapshot.json"));
  if (secrets.length) errors.push(`provider-snapshot.json: credential-like token(s) present: ${[...new Set(secrets)].join(", ")}`);

  // Every new tokenId is an explicit literal in the authored source data.
  const metaText = readText("tools/registry/data/v2-metadata.mjs");
  const v1TokenIds = new Set(v1.entries.map((e) => e.tokenId));
  for (const e of registry.entries) {
    if (v1TokenIds.has(e.tokenId)) continue; // V1 literals live in data/v1-metadata.mjs
    if (!metaText.includes(`tokenId: "${e.tokenId}"`)) {
      errors.push(`tokenId ${e.tokenId} is not an explicit literal in tools/registry/data/v2-metadata.mjs`);
    }
  }

  // Exclusions: valid reason codes and shape.
  const validReasons = new Set([
    "wrapped-or-bridged", "duplicate-underlying", "leveraged-or-derivative",
    "inactive-or-abandoned", "missing-market-data", "identity-not-sufficiently-verified",
    "unsupported-asset-form", "lower-priority-capacity-cutoff", "diversity-substitution",
  ]);
  const selectedCg = new Set(registry.entries.map((e) => e.providerIds.coingecko));
  for (const x of exclusions.exclusions) {
    if (!validReasons.has(x.reasonCode)) errors.push(`exclusion ${x.providerId}: unknown reasonCode "${x.reasonCode}"`);
    if (selectedCg.has(x.providerId)) errors.push(`exclusion ${x.providerId}: provider id is also a selected entry`);
    if (x.marketCapRank !== null && !(Number.isInteger(x.marketCapRank) && x.marketCapRank > 0)) {
      errors.push(`exclusion ${x.providerId}: marketCapRank must be a positive integer or null`);
    }
  }

  if (errors.length > 0) {
    console.error(`V2 proposal validation FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`V2 proposal validation OK: ${registry.entryCount} entries, catalogVersion=${registry.catalogVersion}`);
  console.log(`contentHash=${registry.contentHash}`);
  console.log(`logo manifest OK: ${manifest.entries.length} pending entries. exclusions=${exclusions.count}. no image URLs, no secrets.`);
}

main();
