#!/usr/bin/env node
// Validates registry/tokens/v1/registry.json + logo-manifest.json against
// the canonical-token-registry contract (Phase 12C-1A, hardened 12C-1A.1).
// Exits non-zero on any failure. Run twice to confirm identical output/hash.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEntries } from "./lib/validateEntries.mjs";
import { validateManifest } from "./lib/validateManifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const registryPath = path.join(repoRoot, "registry/tokens/v1/registry.json");
const manifestPath = path.join(repoRoot, "registry/tokens/v1/logo-manifest.json");

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function main() {
  const registry = loadJson(registryPath);
  const manifest = loadJson(manifestPath);

  const { errors: entryErrors, tokenIds } = validateEntries(registry.schemaVersion, registry.entries, {
    expectedEntryCount: registry.entryCount,
    expectedContentHash: registry.contentHash,
    expectedCatalogVersion: registry.catalogVersion,
  });
  const manifestErrors = validateManifest(tokenIds, manifest.entries);

  const errors = [...entryErrors, ...manifestErrors];
  if (errors.length > 0) {
    console.error(`Registry validation FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`Registry validation OK: entryCount=${registry.entryCount} catalogVersion=${registry.catalogVersion} contentHash=${registry.contentHash}`);
  console.log(`Logo manifest OK: ${manifest.entries.length} entries, exactly one per registry token.`);
}

main();
