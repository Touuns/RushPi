// Verified processing receipts (Phase 12C-1B2B.1). A receipt is the ONLY
// thing the release-manifest builder and hardened output verifier trust -
// directory discovery alone is never sufficient. A receipt is generated only
// after: complete source-plan validation, the approval gate, an exact
// source-hash match, security inspection, successful normalization and
// output verification. A receipt must never be handwritten; this module also
// provides the validator that recomputes and verifies every receipt/output
// relationship from scratch.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sha256Hex } from "./hashes.mjs";
import { outputPathFor } from "./output-paths.mjs";
import {
  TOKEN_ID_PATTERN,
  SHA256_HEX_PATTERN,
  RECEIPT_SCHEMA_VERSION,
  NORMALIZATION_POLICY_VERSION,
  OUTPUT_SIZES,
  TOKEN_LOGOS_OUTPUT_ROOT,
} from "./constants.mjs";

// Fields a receipt must NEVER contain - the same admin/private surface kept
// out of the public release manifest, plus intake-specific fields.
export const FORBIDDEN_RECEIPT_FIELDS = [
  "sourceReference", "sourcePageReference", "approvedBy", "approvedAt", "notes", "intakePath",
];

export class ReceiptError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ReceiptError";
    this.details = details;
  }
}

/**
 * Build the deterministic receipt object. Everything but `toolchain` is a
 * pure function of the approved entry + inspected/normalized bytes - no
 * current time is ever included.
 */
export function buildReceipt({
  tokenId, catalogVersion, logoVersion, normalizationPolicyVersion,
  approvedSourceContentHash, actualSourceContentHash,
  sourceMimeType, sourceWidth, sourceHeight, sourceFileSize,
  output64Path, output128Path, output64Hash, output128Hash,
  toolchain,
}) {
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    tokenId,
    catalogVersion,
    logoVersion,
    normalizationPolicyVersion,
    approvedSourceContentHash,
    actualSourceContentHash,
    sourceMimeType,
    sourceWidth,
    sourceHeight,
    sourceFileSize,
    output64Path,
    output128Path,
    output64Hash,
    output128Hash,
    output64MimeType: "image/png",
    output128MimeType: "image/png",
    toolchain,
  };
}

function receiptFileName(tokenId, logoVersion) {
  return `${tokenId}-v${logoVersion}.json`;
}

export function receiptPathFor(receiptsRoot, tokenId, logoVersion) {
  return path.join(receiptsRoot, receiptFileName(tokenId, logoVersion));
}

/** Structural shape validation only - no filesystem access. */
export function validateReceiptShape(receipt) {
  const errors = [];
  if (!receipt || typeof receipt !== "object") return ["receipt is not an object"];

  if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION) errors.push(`receipt schemaVersion must be ${RECEIPT_SCHEMA_VERSION}`);
  if (typeof receipt.tokenId !== "string" || !TOKEN_ID_PATTERN.test(receipt.tokenId)) errors.push("receipt tokenId is invalid");
  if (typeof receipt.catalogVersion !== "string" || receipt.catalogVersion.length === 0) errors.push("receipt catalogVersion is invalid");
  if (!Number.isInteger(receipt.logoVersion) || receipt.logoVersion < 1) errors.push("receipt logoVersion must be a positive integer");
  if (receipt.normalizationPolicyVersion !== NORMALIZATION_POLICY_VERSION) errors.push(`receipt normalizationPolicyVersion must be ${NORMALIZATION_POLICY_VERSION}`);
  if (typeof receipt.approvedSourceContentHash !== "string" || !SHA256_HEX_PATTERN.test(receipt.approvedSourceContentHash)) errors.push("receipt approvedSourceContentHash is invalid");
  if (typeof receipt.actualSourceContentHash !== "string" || !SHA256_HEX_PATTERN.test(receipt.actualSourceContentHash)) errors.push("receipt actualSourceContentHash is invalid");
  if (receipt.approvedSourceContentHash !== receipt.actualSourceContentHash) {
    errors.push("receipt approvedSourceContentHash and actualSourceContentHash must be equal (a receipt only exists after they matched)");
  }
  if (typeof receipt.sourceMimeType !== "string") errors.push("receipt sourceMimeType is invalid");
  if (!Number.isInteger(receipt.sourceWidth) || receipt.sourceWidth < 1) errors.push("receipt sourceWidth is invalid");
  if (!Number.isInteger(receipt.sourceHeight) || receipt.sourceHeight < 1) errors.push("receipt sourceHeight is invalid");
  if (!Number.isInteger(receipt.sourceFileSize) || receipt.sourceFileSize < 1) errors.push("receipt sourceFileSize is invalid");
  for (const size of OUTPUT_SIZES) {
    if (typeof receipt[`output${size}Path`] !== "string") errors.push(`receipt output${size}Path is invalid`);
    if (typeof receipt[`output${size}Hash`] !== "string" || !SHA256_HEX_PATTERN.test(receipt[`output${size}Hash`])) errors.push(`receipt output${size}Hash is invalid`);
    if (receipt[`output${size}MimeType`] !== "image/png") errors.push(`receipt output${size}MimeType must be image/png`);
  }
  for (const field of FORBIDDEN_RECEIPT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(receipt, field)) errors.push(`receipt must never contain forbidden field "${field}"`);
  }
  return errors;
}

/**
 * Recompute and verify every receipt/output relationship from scratch:
 * registry membership, catalogVersion, normalizationPolicyVersion, the exact
 * immutable path convention, real file existence, recomputed SHA-256, real
 * dimensions/alpha/PNG format. This is the sole trust boundary for
 * downstream tooling - a receipt is only ever "verified" after passing this.
 * @param {any} receipt
 * @param {string} repoRoot
 * @param {{ byTokenId: Map, catalogVersion: string }} registry
 * @returns {Promise<string[]>} errors (empty = fully verified)
 */
export async function verifyReceiptAgainstOutputs(receipt, repoRoot, registry) {
  const errors = validateReceiptShape(receipt);
  if (errors.length > 0) return errors;

  if (!registry.byTokenId.has(receipt.tokenId)) {
    errors.push(`receipt ${receipt.tokenId}: token is absent from the approved V2 registry`);
    return errors;
  }
  if (receipt.catalogVersion !== registry.catalogVersion) {
    errors.push(`receipt ${receipt.tokenId}: catalogVersion "${receipt.catalogVersion}" does not match the approved registry catalogVersion "${registry.catalogVersion}"`);
  }

  for (const size of OUTPUT_SIZES) {
    const relPath = receipt[`output${size}Path`];
    const declaredHash = receipt[`output${size}Hash`];
    const expectedRelPath = toRepoRelative(repoRoot, outputPathFor(path.join(repoRoot, TOKEN_LOGOS_OUTPUT_ROOT), receipt.tokenId, receipt.logoVersion, size, declaredHash));
    if (relPath !== expectedRelPath) {
      errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: output${size}Path "${relPath}" is inconsistent with the tokenId/logoVersion/size/hash convention (expected "${expectedRelPath}")`);
      continue;
    }
    const absPath = path.join(repoRoot, relPath);
    if (!existsSync(absPath)) {
      errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: output file does not exist at ${relPath}`);
      continue;
    }
    const buffer = readFileSync(absPath);
    const actualHash = sha256Hex(buffer);
    if (actualHash !== declaredHash) {
      errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: recomputed hash ${actualHash} does not match receipt hash ${declaredHash}`);
      continue;
    }
    let meta;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: output file is not a decodable image`);
      continue;
    }
    if (meta.format !== "png") errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: output is not PNG (${meta.format})`);
    if (meta.width !== size || meta.height !== size) errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: dimensions ${meta.width}x${meta.height} != ${size}x${size}`);
    if (!meta.hasAlpha) errors.push(`receipt ${receipt.tokenId} v${receipt.logoVersion} size ${size}: output has no alpha channel`);
  }

  return errors;
}

function toRepoRelative(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

/**
 * Load every receipt file from `receiptsRoot`, cross-checking that each
 * file's NAME matches its own declared tokenId/logoVersion (a receipt must
 * never be handwritten under a mismatched filename) and that no two receipt
 * files declare the same (tokenId, logoVersion) pair.
 * @returns {{ receipts: any[], errors: string[] }}
 */
export function loadAllReceipts(receiptsRoot) {
  const errors = [];
  const receipts = [];
  if (!existsSync(receiptsRoot)) return { receipts, errors };

  const seen = new Map(); // `${tokenId}:${logoVersion}` -> filename
  for (const fileName of readdirSync(receiptsRoot)) {
    if (!fileName.endsWith(".json")) continue;
    const filePath = path.join(receiptsRoot, fileName);
    let receipt;
    try {
      receipt = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      errors.push(`receipt file "${fileName}" is not valid JSON`);
      continue;
    }
    const shapeErrors = validateReceiptShape(receipt);
    if (shapeErrors.length > 0) {
      errors.push(...shapeErrors.map((e) => `${fileName}: ${e}`));
      continue;
    }
    const expectedFileName = receiptFileName(receipt.tokenId, receipt.logoVersion);
    if (fileName !== expectedFileName) {
      errors.push(`receipt file "${fileName}" does not match its own content (expected filename "${expectedFileName}")`);
      continue;
    }
    const key = `${receipt.tokenId}:${receipt.logoVersion}`;
    if (seen.has(key)) {
      errors.push(`duplicate tokenId+logoVersion receipt: "${fileName}" and "${seen.get(key)}" both declare ${key}`);
      continue;
    }
    seen.set(key, fileName);
    receipts.push(receipt);
  }
  return { receipts, errors };
}

/**
 * Write a receipt to its deterministic path. Refuses to silently overwrite a
 * DIFFERENT receipt for the same (tokenId, logoVersion) - re-writing an
 * identical receipt is an idempotent no-op.
 */
export function writeReceiptAtomically(receiptsRoot, receipt) {
  const shapeErrors = validateReceiptShape(receipt);
  if (shapeErrors.length > 0) {
    throw new ReceiptError(`refusing to write an invalid receipt: ${shapeErrors.join("; ")}`, { shapeErrors });
  }
  const filePath = receiptPathFor(receiptsRoot, receipt.tokenId, receipt.logoVersion);
  const json = `${JSON.stringify(receipt, null, 2)}\n`;
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, "utf8");
    // toolchain is expected to vary run-to-run/machine-to-machine; compare
    // everything else for an idempotency check.
    const { toolchain: _existingToolchain, ...existingRest } = JSON.parse(existing);
    const { toolchain: _newToolchain, ...newRest } = receipt;
    if (JSON.stringify(existingRest) !== JSON.stringify(newRest)) {
      throw new ReceiptError(
        `refusing to overwrite existing receipt ${path.basename(filePath)} with different content`,
        { filePath },
      );
    }
    return filePath; // identical (modulo toolchain) - idempotent no-op
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, json);
  return filePath;
}
