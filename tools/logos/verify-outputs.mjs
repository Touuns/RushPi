#!/usr/bin/env node
// CLI: verify every committed output PNG under the output root against its
// own filename hash, directory contract, dimensions, alpha channel and
// registry membership. Read-only. Handles an absent/empty output root
// gracefully (0 outputs is a valid, expected state before any pilot logo is
// published).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadV2Registry } from "./lib/registry.mjs";
import { sha256Hex } from "./lib/hashes.mjs";
import { TOKEN_ID_PATTERN, TOKEN_LOGOS_OUTPUT_ROOT, OUTPUT_SIZES } from "./lib/constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

function parseArgs(argv) {
  const args = { root: path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT) };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root" && argv[i + 1]) { args.root = path.resolve(process.cwd(), argv[i + 1]); i += 1; }
  }
  return args;
}

async function verifyOutputRoot(root, registry) {
  const errors = [];
  let verifiedCount = 0;

  if (!existsSync(root)) {
    return { errors, verifiedCount };
  }

  for (const tokenDir of readdirSync(root, { withFileTypes: true })) {
    if (!tokenDir.isDirectory()) continue;
    const tokenId = tokenDir.name;
    if (!TOKEN_ID_PATTERN.test(tokenId)) {
      errors.push(`unexpected non-tokenId directory: ${tokenId}`);
      continue;
    }
    if (!registry.byTokenId.has(tokenId)) {
      errors.push(`orphan tokenId directory (not in approved V2 registry): ${tokenId}`);
      continue;
    }

    const tokenPath = path.join(root, tokenId);
    for (const versionDir of readdirSync(tokenPath, { withFileTypes: true })) {
      if (!versionDir.isDirectory() || !/^v\d+$/.test(versionDir.name)) {
        errors.push(`${tokenId}: unexpected entry "${versionDir.name}" (expected v<N>)`);
        continue;
      }
      const versionPath = path.join(tokenPath, versionDir.name);
      for (const size of OUTPUT_SIZES) {
        const sizePath = path.join(versionPath, String(size));
        if (!existsSync(sizePath)) continue;
        for (const file of readdirSync(sizePath)) {
          if (!file.endsWith(".png")) {
            errors.push(`${tokenId}/${versionDir.name}/${size}: unexpected non-PNG file "${file}"`);
            continue;
          }
          const filePath = path.join(sizePath, file);
          const buffer = readFileSync(filePath);
          const expectedHash = file.slice(0, -".png".length);
          const actualHash = sha256Hex(buffer);
          if (actualHash !== expectedHash) {
            errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: filename hash does not match content (actual ${actualHash})`);
            continue;
          }
          const meta = await sharp(buffer).metadata();
          if (meta.width !== size || meta.height !== size) {
            errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: dimensions ${meta.width}x${meta.height} != expected ${size}x${size}`);
          }
          if (!meta.hasAlpha) {
            errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: output has no alpha channel`);
          }
          verifiedCount += 1;
        }
      }
    }
  }

  return { errors, verifiedCount };
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const registry = loadV2Registry(repoRoot);
  const { errors, verifiedCount } = await verifyOutputRoot(root, registry);

  if (errors.length > 0) {
    console.error(`Output verification FAILED (${errors.length} error(s)):`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log(`Output verification OK: ${verifiedCount} output file(s) verified at ${root}${verifiedCount === 0 ? " (no outputs published yet)" : ""}`);
}

main();
