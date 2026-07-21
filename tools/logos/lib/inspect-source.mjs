// Orchestrates full security validation of a local intake file against its
// approved source-plan entry (Phase 12C-1B2B, hardened in 12C-1B2B.1). Used by
// both inspect-source.mjs (report-only) and lib/normalize-pipeline.mjs (as a
// mandatory pre-normalize gate - normalization never trusts a prior
// inspection result blindly).
import fs from "node:fs";
import { sniffMime } from "./mime.mjs";
import { scanSvgText } from "./scan-svg.mjs";
import { inspectRasterBuffer, RasterRejectedError } from "./inspect-raster.mjs";
import { rasterizeSvg, NormalizationError } from "./normalize.mjs";
import { sha256Hex } from "./hashes.mjs";
import { resolveSafePath, assertRegularNonSymlinkFile, UnsafePathError } from "./path-safety.mjs";
import { MAX_RASTER_INPUT_BYTES, MAX_SVG_INPUT_BYTES, EXPECTED_MIME_EXTENSION } from "./constants.mjs";

export class SourceRejectedError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "SourceRejectedError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * @param {Buffer} fileBuffer  raw bytes read from the local intake file
 * @param {{ expectedMimeClass:string, allowExtremeAspectRatio?:boolean }} planEntry
 * @returns {Promise<{ mime:string, width:number, height:number, fileSize:number, sha256:string, rasterForNormalization:Buffer }>}
 */
export async function inspectSource(fileBuffer, planEntry) {
  const fileSize = fileBuffer.length;
  const sniffed = sniffMime(fileBuffer);

  if (planEntry.expectedMimeClass === "image/png") {
    if (sniffed !== "image/png") {
      throw new SourceRejectedError("mime-mismatch", { expected: "image/png", sniffed });
    }
    if (fileSize > MAX_RASTER_INPUT_BYTES) {
      throw new SourceRejectedError("raster-exceeds-max-bytes", { fileSize });
    }
    let info;
    try {
      info = await inspectRasterBuffer(fileBuffer, { allowExtremeAspectRatio: planEntry.allowExtremeAspectRatio === true });
    } catch (e) {
      if (e instanceof RasterRejectedError) throw new SourceRejectedError(e.reason, e.details);
      throw e;
    }
    return {
      mime: "image/png",
      width: info.width,
      height: info.height,
      fileSize,
      sha256: sha256Hex(fileBuffer),
      rasterForNormalization: fileBuffer,
    };
  }

  if (planEntry.expectedMimeClass === "image/svg+xml") {
    if (sniffed !== "image/svg+xml") {
      throw new SourceRejectedError("mime-mismatch", { expected: "image/svg+xml", sniffed });
    }
    if (fileSize > MAX_SVG_INPUT_BYTES) {
      throw new SourceRejectedError("svg-exceeds-max-bytes", { fileSize });
    }
    const text = fileBuffer.toString("utf8");
    const scan = scanSvgText(text);
    if (!scan.ok) {
      throw new SourceRejectedError("svg-security-check-failed", { reasons: scan.reasons });
    }
    let rasterized;
    try {
      rasterized = rasterizeSvg(text);
    } catch (e) {
      if (e instanceof NormalizationError) throw new SourceRejectedError(e.reason);
      throw e;
    }
    let info;
    try {
      info = await inspectRasterBuffer(rasterized, { allowExtremeAspectRatio: planEntry.allowExtremeAspectRatio === true });
    } catch (e) {
      if (e instanceof RasterRejectedError) throw new SourceRejectedError(e.reason, e.details);
      throw e;
    }
    return {
      mime: "image/svg+xml",
      width: info.width,
      height: info.height,
      fileSize,
      sha256: sha256Hex(fileBuffer),
      rasterForNormalization: rasterized,
    };
  }

  throw new SourceRejectedError("unsupported-expected-mime-class", { expectedMimeClass: planEntry.expectedMimeClass });
}

/**
 * Read the file at the source-plan entry's OWN intakePath - never a
 * caller-supplied path. This is the sole normal-path way bytes reach the
 * pipeline: entry.intakePath belongs to that exact token entry, must exist,
 * must resolve inside `intakeRoot` (no traversal/escape), must not itself be
 * a symlink (regardless of what it points at), and must be a regular file.
 * The basename extension is cross-checked against expectedMimeClass as a
 * defense-in-depth string check; MIME sniffing on the actual bytes remains
 * the authoritative check (done later in inspectSource).
 * @param {any} entry
 * @param {string} intakeRoot
 * @returns {Buffer}
 */
export function readApprovedIntakeFile(entry, intakeRoot) {
  if (typeof entry.intakePath !== "string" || entry.intakePath.length === 0) {
    throw new SourceRejectedError("missing-intake-path", { tokenId: entry.tokenId });
  }
  let safePath;
  try {
    safePath = resolveSafePath(intakeRoot, entry.intakePath);
  } catch (e) {
    if (e instanceof UnsafePathError) throw new SourceRejectedError("unsafe-intake-path", { message: e.message });
    throw e;
  }
  try {
    assertRegularNonSymlinkFile(safePath);
  } catch (e) {
    if (e instanceof UnsafePathError) {
      const reason = /symlink/.test(e.message) ? "intake-file-is-symlink" : "intake-file-not-found";
      throw new SourceRejectedError(reason, { message: e.message });
    }
    throw e;
  }
  if (entry.expectedMimeClass && EXPECTED_MIME_EXTENSION[entry.expectedMimeClass]) {
    const expectedExt = EXPECTED_MIME_EXTENSION[entry.expectedMimeClass];
    if (!entry.intakePath.toLowerCase().endsWith(expectedExt)) {
      throw new SourceRejectedError("intake-extension-mismatch", { intakePath: entry.intakePath, expectedExt });
    }
  }
  return fs.readFileSync(safePath);
}

/**
 * Full approved-intake pipeline: read the bound intake file (or, ONLY for
 * self-tests, an explicit in-memory override - never available via any CLI
 * argument), verify its SHA-256 matches entry.approvedSourceContentHash
 * BEFORE any rasterization/normalization, then run the existing
 * mime/security/dimension inspection.
 *
 * @param {any} entry
 * @param {string} intakeRoot
 * @param {{ fileBufferOverride?: Buffer }} [testOnly]  INTERNAL/TEST-ONLY. Never
 *   wired to any CLI flag - selftest.mjs is the only caller that uses this.
 */
export async function inspectApprovedIntake(entry, intakeRoot, testOnly = {}) {
  const fileBuffer = testOnly.fileBufferOverride ?? readApprovedIntakeFile(entry, intakeRoot);

  const actualSourceContentHash = sha256Hex(fileBuffer);
  if (actualSourceContentHash !== entry.approvedSourceContentHash) {
    throw new SourceRejectedError("source-hash-mismatch", {
      approvedSourceContentHash: entry.approvedSourceContentHash,
      actualSourceContentHash,
    });
  }

  const inspected = await inspectSource(fileBuffer, entry);
  return { ...inspected, actualSourceContentHash };
}
