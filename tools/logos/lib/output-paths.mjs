// Immutable output path layout + overwrite-prevention guard (Phase 12C-1B2B).
//
//   <outputRoot>/<tokenId>/v<logoVersion>/<size>/<contentHash>.png
//
// The hash is the OUTPUT file's own SHA-256 (never the source hash), and each
// size (64/128) gets its own independently computed hash — never one shared
// hash reused for both filenames.
import fs from "node:fs";
import path from "node:path";

export class OutputConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "OutputConflictError";
    this.details = details;
  }
}

/**
 * @param {string} outputRoot
 * @param {string} tokenId
 * @param {number} logoVersion
 * @param {number} size  64 or 128
 * @param {string} contentHash  sha256 hex of that size's output bytes
 */
export function outputPathFor(outputRoot, tokenId, logoVersion, size, contentHash) {
  return path.join(outputRoot, tokenId, `v${logoVersion}`, String(size), `${contentHash}.png`);
}

/**
 * Guard against silently overwriting a previously published output. A
 * (tokenId, logoVersion, size) slot may only ever contain ONE content hash.
 * Writing the identical bytes again (same hash) is an idempotent no-op.
 * Writing DIFFERENT bytes under an already-populated version+size slot is a
 * conflict that must be resolved by incrementing logoVersion instead.
 *
 * @param {string} outputRoot
 * @param {string} tokenId
 * @param {number} logoVersion
 * @param {number} size
 * @param {string} newContentHash
 * @throws {OutputConflictError}
 */
export function assertNoVersionConflict(outputRoot, tokenId, logoVersion, size, newContentHash) {
  const sizeDir = path.join(outputRoot, tokenId, `v${logoVersion}`, String(size));
  let existing;
  try {
    existing = fs.readdirSync(sizeDir).filter((f) => f.endsWith(".png"));
  } catch {
    return; // directory does not exist yet -> nothing to conflict with
  }
  for (const file of existing) {
    const existingHash = file.slice(0, -".png".length);
    if (existingHash !== newContentHash) {
      throw new OutputConflictError(
        `tokenId ${tokenId} v${logoVersion} size ${size} already published with a different hash (${existingHash} != ${newContentHash}); increment logoVersion instead of overwriting`,
        { tokenId, logoVersion, size, existingHash, newContentHash },
      );
    }
  }
}

/**
 * Write an output PNG buffer to its deterministic path, refusing to
 * overwrite a conflicting version. Idempotent for identical bytes.
 * @returns {string} the absolute path written (or already present)
 */
export function writeOutputAtomically(outputRoot, tokenId, logoVersion, size, contentHash, buffer) {
  assertNoVersionConflict(outputRoot, tokenId, logoVersion, size, contentHash);
  const filePath = outputPathFor(outputRoot, tokenId, logoVersion, size, contentHash);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }
  return filePath;
}
