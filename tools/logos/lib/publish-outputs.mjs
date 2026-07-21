// Preflight-checked, atomic, rollback-safe publication of one token's two
// output sizes + its receipt (Phase 12C-1B2B.2).
//
// Ordering guarantee: EVERY preflight check (version conflicts for both
// slots, and whether an existing receipt would conflict) runs BEFORE any
// file is written. Only once every preflight succeeds does publication
// begin. If a later step fails (128 write, either output's
// re-verification, or the receipt write), only the files THIS invocation
// actually created are removed - a previously existing valid output,
// approval record or receipt is never touched. A rerun after an
// interrupted-but-byte-identical publication is always safe: every write is
// idempotent for identical bytes, and the preflight recognizes an already-
// matching receipt as "nothing to do" rather than a conflict.
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import sharp from "sharp";
import { sha256Hex } from "./hashes.mjs";
import { writeOutputAtomically, assertNoVersionConflict, outputPathFor, OutputConflictError } from "./output-paths.mjs";
import { writeReceiptAtomically, peekReceiptConflict, ReceiptError } from "./receipt.mjs";

export class PublishRollbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PublishRollbackError";
    this.details = details;
  }
}

async function verifyWrittenOutput(absolutePath, size, expectedHash) {
  const buffer = readFileSync(absolutePath);
  const actualHash = sha256Hex(buffer);
  if (actualHash !== expectedHash) {
    throw new PublishRollbackError("output-verification-hash-mismatch", { absolutePath, expectedHash, actualHash });
  }
  const meta = await sharp(buffer).metadata();
  if (meta.format !== "png" || meta.width !== size || meta.height !== size || !meta.hasAlpha) {
    throw new PublishRollbackError("output-verification-shape-mismatch", { absolutePath, meta: { format: meta.format, width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha } });
  }
}

/**
 * @param {object} args
 * @param {string} args.outputRoot
 * @param {string} args.receiptsRoot
 * @param {string} args.tokenId
 * @param {number} args.logoVersion
 * @param {Buffer} args.buf64
 * @param {Buffer} args.buf128
 * @param {string} args.hash64
 * @param {string} args.hash128
 * @param {any} args.candidateReceipt  the fully-built receipt object (every
 *   field already known before any write - including approvalRecordContentHash)
 * @param {{ throwAfter?: "after64Write"|"after128Write"|"afterReceiptWrite" }} [args.testOnly]
 *   INTERNAL/TEST-ONLY synthetic failure injection point for deterministic
 *   rollback tests - never wired to any CLI flag.
 * @returns {Promise<{ receipt: any, receiptPath: string, path64: string, path128: string }>}
 */
export async function publishTokenVersion({
  outputRoot, receiptsRoot, tokenId, logoVersion, buf64, buf128, hash64, hash128, candidateReceipt, testOnly = {},
}) {
  const path64 = outputPathFor(outputRoot, tokenId, logoVersion, 64, hash64);
  const path128 = outputPathFor(outputRoot, tokenId, logoVersion, 128, hash128);

  // --- Preflight (no writes yet) --------------------------------------
  // Both output-version-conflict checks BEFORE either write, so a conflict
  // on either slot is detected before any new file is created.
  assertNoVersionConflict(outputRoot, tokenId, logoVersion, 64, hash64);
  assertNoVersionConflict(outputRoot, tokenId, logoVersion, 128, hash128);

  // Receipt preflight: an existing receipt must be identical, or the run is
  // rejected outright - BEFORE any output write.
  const receiptPeek = peekReceiptConflict(receiptsRoot, candidateReceipt);
  if (receiptPeek.conflict) {
    throw new ReceiptError(`refusing to publish: an existing receipt for ${tokenId} v${logoVersion} would conflict with different content`, { filePath: receiptPeek.filePath });
  }

  // --- Track what THIS invocation creates, for rollback on later failure ---
  const existed64Before = existsSync(path64);
  const existed128Before = existsSync(path128);
  const created = [];

  try {
    writeOutputAtomically(outputRoot, tokenId, logoVersion, 64, hash64, buf64);
    if (!existed64Before) created.push(path64);
    if (testOnly.throwAfter === "after64Write") throw new PublishRollbackError("synthetic-failure-after-64-write");
    await verifyWrittenOutput(path64, 64, hash64);

    writeOutputAtomically(outputRoot, tokenId, logoVersion, 128, hash128, buf128);
    if (!existed128Before) created.push(path128);
    if (testOnly.throwAfter === "after128Write") throw new PublishRollbackError("synthetic-failure-after-128-write");
    await verifyWrittenOutput(path128, 128, hash128);

    const receiptWasNew = !receiptPeek.existedBefore;
    const receiptPath = writeReceiptAtomically(receiptsRoot, candidateReceipt);
    if (receiptWasNew) created.push(receiptPath);
    if (testOnly.throwAfter === "afterReceiptWrite") throw new PublishRollbackError("synthetic-failure-after-receipt-write");

    return { receipt: candidateReceipt, receiptPath, path64, path128 };
  } catch (err) {
    const rolledBack = [];
    for (const filePath of created) {
      try {
        unlinkSync(filePath);
        rolledBack.push(filePath);
      } catch {
        // Best-effort cleanup: never let a cleanup failure mask the
        // original error, and never throw out of a catch block.
      }
    }
    if (err instanceof PublishRollbackError || err instanceof OutputConflictError || err instanceof ReceiptError) {
      throw new PublishRollbackError(`publication failed and was rolled back: ${err.message}`, { rolledBack, cause: err.message });
    }
    throw err;
  }
}
