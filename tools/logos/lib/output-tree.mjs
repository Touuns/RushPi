// Structural verification of the committed output tree (Phase 12C-1B2B.1).
// Pure(ish) function over the filesystem: exactly one PNG per size directory,
// positive-integer version directories with no leading zeros, no unexpected
// files/directories, filename hash matches bytes, exact dimensions, alpha
// channel present. Shared by tools/logos/verify-outputs.mjs (CLI) and
// selftest.mjs (temp-directory fixtures).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sha256Hex } from "./hashes.mjs";
import { TOKEN_ID_PATTERN, OUTPUT_SIZES } from "./constants.mjs";

/**
 * @param {string} root  output root (e.g. public/assets/rushpi/token-logos)
 * @param {{ byTokenId: Map }} registry
 * @returns {Promise<{ errors: string[], found: Set<string>, verifiedFileCount: number }>}
 *   `found` holds `${tokenId}:${logoVersion}` keys for every structurally
 *   valid (both sizes present, correct) published version.
 */
export async function verifyOutputTreeShape(root, registry) {
  const errors = [];
  const found = new Set();
  let verifiedFileCount = 0;

  if (!existsSync(root)) return { errors, found, verifiedFileCount };

  for (const tokenDir of readdirSync(root, { withFileTypes: true })) {
    if (!tokenDir.isDirectory()) {
      errors.push(`unexpected non-directory entry at output root: ${tokenDir.name}`);
      continue;
    }
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
      if (!versionDir.isDirectory()) {
        errors.push(`${tokenId}: unexpected non-directory entry "${versionDir.name}"`);
        continue;
      }
      const versionMatch = /^v([1-9][0-9]*)$/.exec(versionDir.name);
      if (!versionMatch) {
        errors.push(`${tokenId}: unexpected version directory "${versionDir.name}" (expected v<positive integer>, no leading zeros)`);
        continue;
      }
      const logoVersion = Number(versionMatch[1]);
      const versionPath = path.join(tokenPath, versionDir.name);

      const sizeEntries = readdirSync(versionPath, { withFileTypes: true });
      const unexpectedSizeEntries = sizeEntries.filter((d) => !OUTPUT_SIZES.includes(Number(d.name)));
      for (const bad of unexpectedSizeEntries) errors.push(`${tokenId}/${versionDir.name}: unexpected entry "${bad.name}" (expected only 64/ and 128/)`);

      let sizesOk = true;
      for (const size of OUTPUT_SIZES) {
        const sizePath = path.join(versionPath, String(size));
        if (!existsSync(sizePath)) {
          errors.push(`${tokenId}/${versionDir.name}: missing required "${size}/" directory (both 64 and 128 must be present)`);
          sizesOk = false;
          continue;
        }
        const files = readdirSync(sizePath, { withFileTypes: true });
        const pngFiles = files.filter((f) => f.isFile() && f.name.endsWith(".png"));
        const nonPngFiles = files.filter((f) => !(f.isFile() && f.name.endsWith(".png")));
        for (const bad of nonPngFiles) errors.push(`${tokenId}/${versionDir.name}/${size}: unexpected entry "${bad.name}"`);
        if (pngFiles.length !== 1) {
          errors.push(`${tokenId}/${versionDir.name}/${size}: expected exactly one PNG file, found ${pngFiles.length}`);
          sizesOk = false;
          continue;
        }
        const file = pngFiles[0].name;
        const filePath = path.join(sizePath, file);
        const buffer = readFileSync(filePath);
        const expectedHash = file.slice(0, -".png".length);
        const actualHash = sha256Hex(buffer);
        if (actualHash !== expectedHash) {
          errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: filename hash does not match content (actual ${actualHash})`);
          sizesOk = false;
          continue;
        }
        const meta = await sharp(buffer).metadata();
        if (meta.format !== "png" || meta.width !== size || meta.height !== size) {
          errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: dimensions/format ${meta.width}x${meta.height} (${meta.format}) != expected ${size}x${size} PNG`);
          sizesOk = false;
        }
        if (!meta.hasAlpha) {
          errors.push(`${tokenId}/${versionDir.name}/${size}/${file}: output has no alpha channel`);
          sizesOk = false;
        }
        verifiedFileCount += 1;
      }

      if (sizesOk) found.add(`${tokenId}:${logoVersion}`);
    }
  }

  return { errors, found, verifiedFileCount };
}
