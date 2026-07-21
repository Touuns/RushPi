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
  validateSelectionInput,
  validateSubstitutionSets,
  validateUncertainReview,
  findImageUrls,
  findSecrets,
} from "./lib/validateV2.mjs";
import { V2_NEW_SELECTIONS } from "./data/v2-selection-input.mjs";

const UNCERTAIN_PROVIDER_IDS = [
  "the-open-network", "eigenlayer", "fetch-ai", "sonic-3", "kaia",
  "vaulta", "sky", "chain-2", "safe", "gas",
];

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
  const report = readJson("registry/tokens/v2-proposal/curation-report.json");
  const v1 = readJson("registry/tokens/v1/registry.json");

  // Author-assigned tokenId workflow: the selection input must carry explicit,
  // valid, unique, non-V1-colliding tokenIds (the generator never allocates).
  const v1TokenIdSet = new Set(v1.entries.map((e) => e.tokenId));
  errors.push(...validateSelectionInput(V2_NEW_SELECTIONS, v1TokenIdSet));

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

  // Every new tokenId is an explicit literal in the authored source data, and
  // the input↔metadata providerId→tokenId mapping is consistent.
  const metaText = readText("tools/registry/data/v2-metadata.mjs");
  const inputText = readText("tools/registry/data/v2-selection-input.mjs");
  const v1TokenIds = new Set(v1.entries.map((e) => e.tokenId));
  for (const e of registry.entries) {
    if (v1TokenIds.has(e.tokenId)) continue; // V1 literals live in data/v1-metadata.mjs
    if (!metaText.includes(`tokenId: "${e.tokenId}"`)) {
      errors.push(`tokenId ${e.tokenId} is not an explicit literal in tools/registry/data/v2-metadata.mjs`);
    }
    if (!inputText.includes(`tokenId: "${e.tokenId}"`)) {
      errors.push(`tokenId ${e.tokenId} is not an explicit literal in tools/registry/data/v2-selection-input.mjs`);
    }
  }
  const inputByCg = new Map(V2_NEW_SELECTIONS.map((s) => [s.id, s.tokenId]));
  for (const e of registry.entries) {
    if (v1TokenIds.has(e.tokenId)) continue;
    const cg = e.providerIds.coingecko;
    if (inputByCg.get(cg) !== e.tokenId) {
      errors.push(`providerId ${cg}: registry tokenId ${e.tokenId} disagrees with selection input ${inputByCg.get(cg)}`);
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

  // True diversity substitutions: <=30, bijection, disjoint, each displaced
  // carries a diversity-substitution exclusion.
  const diversityExclusionIds = new Set(
    exclusions.exclusions.filter((x) => x.reasonCode === "diversity-substitution").map((x) => x.providerId),
  );
  const categoryCounts = {};
  for (const e of registry.entries) categoryCounts[e.category] = (categoryCounts[e.category] ?? 0) + 1;
  errors.push(...validateSubstitutionSets(report.diversitySubstitutions.pairs, selectedCg, diversityExclusionIds, categoryCounts));
  if (report.baseline.trueDiversitySubstitutionCount !== report.diversitySubstitutions.pairs.length) {
    errors.push("curation report trueDiversitySubstitutionCount disagrees with the pair list length");
  }
  // Every diversity-substitution exclusion must point back at a real kept entry.
  const selectedTokenIds = new Set(registry.entries.map((e) => e.tokenId));
  for (const x of exclusions.exclusions) {
    if (x.reasonCode === "diversity-substitution") {
      if (!x.rationaleCode) errors.push(`diversity exclusion ${x.providerId}: missing rationaleCode`);
      if (!x.displacedForTokenId || !selectedTokenIds.has(x.displacedForTokenId)) {
        errors.push(`diversity exclusion ${x.providerId}: displacedForTokenId must reference a kept entry`);
      }
    }
  }

  // Uncertain-entry review: all ten present, verified ones in the catalog.
  errors.push(...validateUncertainReview(report.uncertainEntries.reviews, UNCERTAIN_PROVIDER_IDS, selectedCg));

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
