// Full approved-token normalization pipeline (Phase 12C-1B2B.1): gate ->
// bound-intake read -> source-hash match -> security inspection ->
// deterministic normalization -> version-conflict-checked write -> output
// re-verification -> receipt. A receipt is generated ONLY after every one of
// these steps has succeeded.
import path from "node:path";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { assertProcessable } from "./process-gate.mjs";
import { inspectApprovedIntake } from "./inspect-source.mjs";
import { normalizeToOutputs } from "./normalize.mjs";
import { sha256Hex } from "./hashes.mjs";
import { writeOutputAtomically, outputPathFor } from "./output-paths.mjs";
import { buildReceipt, writeReceiptAtomically } from "./receipt.mjs";
import { getToolchainFingerprint } from "./report.mjs";
import { NORMALIZATION_POLICY_VERSION } from "./constants.mjs";

export class PipelineError extends Error {
  constructor(reason, details = {}) {
    super(reason);
    this.name = "PipelineError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * @param {object} args
 * @param {any} args.entry  the source-plan entry (must be source-approved)
 * @param {string} args.intakeRoot
 * @param {string} args.outputRoot
 * @param {string} args.receiptsRoot
 * @param {string} args.repoRoot
 * @param {{ fileBufferOverride?: Buffer }} [args.testOnly]  INTERNAL/TEST-ONLY,
 *   never wired to a CLI flag.
 * @returns {Promise<any>} the written (or idempotently confirmed) receipt
 */
export async function normalizeApprovedToken({ entry, intakeRoot, outputRoot, receiptsRoot, repoRoot, testOnly = {} }) {
  assertProcessable(entry);

  const logoVersion = entry.expectedLogoVersion;
  if (!Number.isInteger(logoVersion) || logoVersion < 1) {
    throw new PipelineError("invalid-expected-logo-version", { expectedLogoVersion: entry.expectedLogoVersion });
  }

  // Gate + bound-intake read + source-hash match + security inspection.
  const inspected = await inspectApprovedIntake(entry, intakeRoot, testOnly);

  // Deterministic normalization.
  const { buf64, buf128 } = await normalizeToOutputs(inspected.rasterForNormalization, entry.cropMode);
  const hash64 = sha256Hex(buf64);
  const hash128 = sha256Hex(buf128);

  // Version-conflict-checked write (idempotent for identical bytes; refuses
  // to silently overwrite different bytes at an already-published slot).
  const path64Abs = writeOutputAtomically(outputRoot, entry.tokenId, logoVersion, 64, hash64, buf64);
  const path128Abs = writeOutputAtomically(outputRoot, entry.tokenId, logoVersion, 128, hash128, buf128);

  // Output re-verification: recompute hash + real dimensions/alpha/PNG from
  // the bytes just written, never trust the in-memory buffers blindly.
  await verifyJustWrittenOutput(path64Abs, 64, hash64);
  await verifyJustWrittenOutput(path128Abs, 128, hash128);

  const toolchain = getToolchainFingerprint();
  const receipt = buildReceipt({
    tokenId: entry.tokenId,
    catalogVersion: entry.catalogVersion,
    logoVersion,
    normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
    approvedSourceContentHash: entry.approvedSourceContentHash,
    actualSourceContentHash: inspected.actualSourceContentHash,
    sourceMimeType: inspected.mime,
    sourceWidth: inspected.width,
    sourceHeight: inspected.height,
    sourceFileSize: inspected.fileSize,
    output64Path: toRepoRelative(repoRoot, outputPathFor(outputRoot, entry.tokenId, logoVersion, 64, hash64)),
    output128Path: toRepoRelative(repoRoot, outputPathFor(outputRoot, entry.tokenId, logoVersion, 128, hash128)),
    output64Hash: hash64,
    output128Hash: hash128,
    toolchain,
  });

  const writtenPath = writeReceiptAtomically(receiptsRoot, receipt);
  return { receipt, receiptPath: writtenPath };
}

async function verifyJustWrittenOutput(absolutePath, size, expectedHash) {
  const buffer = readFileSync(absolutePath);
  const actualHash = sha256Hex(buffer);
  if (actualHash !== expectedHash) {
    throw new PipelineError("output-verification-hash-mismatch", { absolutePath, expectedHash, actualHash });
  }
  const meta = await sharp(buffer).metadata();
  if (meta.format !== "png" || meta.width !== size || meta.height !== size || !meta.hasAlpha) {
    throw new PipelineError("output-verification-shape-mismatch", { absolutePath, meta: { format: meta.format, width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha } });
  }
}

function toRepoRelative(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}
