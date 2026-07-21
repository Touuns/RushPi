#!/usr/bin/env node
// CLI: build the public logo-release manifest from the verified output tree.
// Contains ONLY safe-for-client fields (schemaVersion, logoReleaseVersion,
// normalizationPolicyVersion, catalogVersion, tokenId, logoVersion, output
// paths/hashes, output MIME types) - never a source URL, approval identity or
// intake path. Deterministic: no current time enters the hashed content.
//
// With zero published outputs (the state shipped in this phase), this
// produces a manifest with entries: [] - a declaration of "no logos ready
// yet", not itself a logo asset.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadV2Registry } from "./lib/registry.mjs";
import { buildReleaseManifest, validateReleaseManifest } from "./lib/release-manifest.mjs";
import { TOKEN_ID_PATTERN, TOKEN_LOGOS_OUTPUT_ROOT } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

function parseArgs(argv) {
  const args = {
    root: path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT),
    out: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root" && argv[i + 1]) { args.root = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
    else if (argv[i] === "--out" && argv[i + 1]) { args.out = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
  }
  return args;
}

/** Discover the latest published logoVersion per tokenId from the output tree. */
function discoverEntries(root) {
  const entries = [];
  if (!existsSync(root)) return entries;

  for (const tokenDir of readdirSync(root, { withFileTypes: true })) {
    if (!tokenDir.isDirectory() || !TOKEN_ID_PATTERN.test(tokenDir.name)) continue;
    const tokenId = tokenDir.name;
    const tokenPath = path.join(root, tokenId);
    const versions = readdirSync(tokenPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^v\d+$/.test(d.name))
      .map((d) => Number(d.name.slice(1)))
      .sort((a, b) => b - a);
    if (versions.length === 0) continue;
    const logoVersion = versions[0];
    const versionPath = path.join(tokenPath, `v${logoVersion}`);

    const pick = (size) => {
      const sizePath = path.join(versionPath, String(size));
      if (!existsSync(sizePath)) return null;
      const files = readdirSync(sizePath).filter((f) => f.endsWith(".png"));
      if (files.length !== 1) return null; // ambiguous/incomplete - skip, verify-outputs will flag conflicts separately
      const hash = files[0].slice(0, -".png".length);
      return { hash, relPath: path.relative(repoRoot, path.join(sizePath, files[0])).split(path.sep).join("/") };
    };

    const out64 = pick(64);
    const out128 = pick(128);
    if (!out64 || !out128) continue;

    entries.push({
      tokenId,
      logoVersion,
      output64Path: out64.relPath,
      output128Path: out128.relPath,
      output64Hash: out64.hash,
      output128Hash: out128.hash,
      output64MimeType: "image/png",
      output128MimeType: "image/png",
    });
  }
  return entries;
}

function main() {
  const { root, out } = parseArgs(process.argv.slice(2));
  const registry = loadV2Registry(repoRoot);
  const entries = discoverEntries(root);

  const manifest = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
  const errors = validateReleaseManifest(manifest);
  if (errors.length > 0) {
    console.error(`Release manifest build FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (out) {
    writeFileSync(out, json);
    console.log(`Wrote ${out}`);
  } else {
    console.log(json);
  }
  console.log(`logoReleaseVersion=${manifest.logoReleaseVersion} entryCount=${manifest.entryCount}`);
}

main();
