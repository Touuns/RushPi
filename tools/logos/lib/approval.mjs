// Immutable approval records (Phase 12C-1B2B.2). A non-runtime, admin-only
// artifact that FREEZES the complete approved decision for one
// (tokenId, logoVersion) - the source-plan entry that authorized it can be
// freely edited afterward (e.g. to prepare logoVersion 2) without ever
// altering this file. Every downstream step (normalization, receipts,
// publication) is bound to this frozen record, never to the live,
// mutable source plan.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { TOKEN_ID_PATTERN, SHA256_HEX_PATTERN, APPROVAL_SCHEMA_VERSION } from "./constants.mjs";
import {
  SOURCE_REVIEW_STATUSES,
  PERMISSION_REVIEW_STATUSES,
  SOURCE_TYPES,
  VARIANT_TYPES,
  CROP_MODES,
  EXPECTED_MIME_CLASSES,
} from "./constants.mjs";

export class ApprovalError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApprovalError";
    this.details = details;
  }
}

// The complete set of fields an approval record freezes, in the exact order
// listed by the phase brief. approvalRecordContentHash is deliberately NOT
// in this list - it is the hash OVER these fields, never a hashed field
// itself.
export const APPROVAL_FIELD_NAMES = [
  "schemaVersion", "tokenId", "catalogVersion", "providerId", "canonicalName",
  "symbol", "logoVersion", "sourceReviewStatus", "permissionReviewStatus",
  "sourceType", "sourceReference", "sourcePageReference", "permittedVariant",
  "variantType", "cropMode", "expectedMimeClass", "approvedSourceContentHash",
  "approvedBy", "approvedAt", "permissionEvidenceReference",
  "providerFallbackApproved", "allowExtremeAspectRatio", "notes", "intakePath",
];

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep(value[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Canonical, deterministic serialization of the approval fields (excludes approvalRecordContentHash). */
export function canonicalSerializeApproval(fields) {
  const projected = {};
  for (const name of APPROVAL_FIELD_NAMES) projected[name] = fields[name] ?? null;
  return JSON.stringify(sortKeysDeep(projected));
}

export function computeApprovalRecordContentHash(fields) {
  return createHash("sha256").update(canonicalSerializeApproval(fields), "utf8").digest("hex");
}

function approvalFileName(tokenId, logoVersion) {
  return `${tokenId}-v${logoVersion}.json`;
}

export function approvalPathFor(approvalsRoot, tokenId, logoVersion) {
  return path.join(approvalsRoot, approvalFileName(tokenId, logoVersion));
}

/**
 * Build the deterministic, immutable approval record from a fully-approved
 * source-plan entry. No current time is generated here - approvedAt is the
 * entry's own explicit, human-supplied value and participates in the hash.
 * @param {any} entry  a source-plan entry (already validated as source-approved)
 */
export function buildApprovalRecord(entry) {
  const fields = {
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    tokenId: entry.tokenId,
    catalogVersion: entry.catalogVersion,
    providerId: entry.providerId,
    canonicalName: entry.canonicalName,
    symbol: entry.symbol,
    logoVersion: entry.expectedLogoVersion,
    sourceReviewStatus: entry.sourceReviewStatus,
    permissionReviewStatus: entry.permissionReviewStatus,
    sourceType: entry.sourceType,
    sourceReference: entry.sourceReference,
    sourcePageReference: entry.sourcePageReference,
    permittedVariant: entry.permittedVariant,
    variantType: entry.variantType,
    cropMode: entry.cropMode,
    expectedMimeClass: entry.expectedMimeClass,
    approvedSourceContentHash: entry.approvedSourceContentHash,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    permissionEvidenceReference: entry.permissionEvidenceReference ?? null,
    providerFallbackApproved: entry.providerFallbackApproved === true,
    allowExtremeAspectRatio: entry.allowExtremeAspectRatio === true,
    notes: entry.notes ?? "",
    intakePath: entry.intakePath,
  };
  return { ...fields, approvalRecordContentHash: computeApprovalRecordContentHash(fields) };
}

/**
 * Structural validation + self-consistent hash check. No filesystem/registry
 * access.
 * @returns {string[]} errors (empty = structurally valid)
 */
export function validateApprovalRecordShape(record) {
  const errors = [];
  if (!record || typeof record !== "object") return ["approval record is not an object"];

  if (record.schemaVersion !== APPROVAL_SCHEMA_VERSION) errors.push(`approval record schemaVersion must be ${APPROVAL_SCHEMA_VERSION}`);
  if (typeof record.tokenId !== "string" || !TOKEN_ID_PATTERN.test(record.tokenId)) errors.push("approval record tokenId is invalid");
  if (typeof record.catalogVersion !== "string" || record.catalogVersion.length === 0) errors.push("approval record catalogVersion is invalid");
  if (typeof record.providerId !== "string" || record.providerId.length === 0) errors.push("approval record providerId is invalid");
  if (typeof record.canonicalName !== "string" || record.canonicalName.length === 0) errors.push("approval record canonicalName is invalid");
  if (typeof record.symbol !== "string" || record.symbol.length === 0) errors.push("approval record symbol is invalid");
  if (!Number.isInteger(record.logoVersion) || record.logoVersion < 1) errors.push("approval record logoVersion must be a positive integer");
  if (!SOURCE_REVIEW_STATUSES.has(record.sourceReviewStatus)) errors.push("approval record sourceReviewStatus is invalid");
  if (record.sourceReviewStatus !== "source-approved") errors.push('approval record sourceReviewStatus must be "source-approved"');
  if (!PERMISSION_REVIEW_STATUSES.has(record.permissionReviewStatus)) errors.push("approval record permissionReviewStatus is invalid");
  if (!SOURCE_TYPES.has(record.sourceType)) errors.push("approval record sourceType is invalid");
  if (typeof record.sourceReference !== "string" || record.sourceReference.length === 0) errors.push("approval record sourceReference is invalid");
  if (typeof record.sourcePageReference !== "string" || record.sourcePageReference.length === 0) errors.push("approval record sourcePageReference is invalid");
  if (typeof record.permittedVariant !== "string" || record.permittedVariant.length === 0) errors.push("approval record permittedVariant is invalid");
  if (!VARIANT_TYPES.has(record.variantType)) errors.push("approval record variantType is invalid");
  if (!CROP_MODES.has(record.cropMode)) errors.push("approval record cropMode is invalid");
  if (!EXPECTED_MIME_CLASSES.has(record.expectedMimeClass)) errors.push("approval record expectedMimeClass is invalid");
  if (typeof record.approvedSourceContentHash !== "string" || !SHA256_HEX_PATTERN.test(record.approvedSourceContentHash)) errors.push("approval record approvedSourceContentHash is invalid");
  if (typeof record.approvedBy !== "string" || record.approvedBy.length === 0) errors.push("approval record approvedBy is invalid");
  if (typeof record.approvedAt !== "string" || record.approvedAt.length === 0) errors.push("approval record approvedAt is invalid");
  if (typeof record.notes !== "string") errors.push("approval record notes must be a string");
  if (typeof record.intakePath !== "string" || record.intakePath.length === 0) errors.push("approval record intakePath is invalid");
  if (typeof record.providerFallbackApproved !== "boolean") errors.push("approval record providerFallbackApproved must be a boolean");
  if (typeof record.allowExtremeAspectRatio !== "boolean") errors.push("approval record allowExtremeAspectRatio must be a boolean");
  if (typeof record.approvalRecordContentHash !== "string" || !SHA256_HEX_PATTERN.test(record.approvalRecordContentHash)) {
    errors.push("approval record approvalRecordContentHash is invalid");
  } else {
    const recomputed = computeApprovalRecordContentHash(record);
    if (recomputed !== record.approvalRecordContentHash) {
      errors.push(`approval record content hash mismatch: stored=${record.approvalRecordContentHash} recomputed=${recomputed}`);
    }
  }

  return errors;
}

/**
 * Cross-check a frozen approval record against the CURRENT registry: token
 * identity and catalogVersion must still match.
 */
export function verifyApprovalMatchesRegistry(record, registry) {
  const errors = [];
  const regEntry = registry.byTokenId.get(record.tokenId);
  if (!regEntry) {
    errors.push(`approval record ${record.tokenId}: token is absent from the approved V2 registry`);
    return errors;
  }
  if (record.catalogVersion !== registry.catalogVersion) errors.push(`approval record ${record.tokenId}: catalogVersion "${record.catalogVersion}" does not match the approved registry catalogVersion "${registry.catalogVersion}"`);
  if (record.providerId !== regEntry.providerIds.coingecko) errors.push(`approval record ${record.tokenId}: providerId does not match registry`);
  if (record.canonicalName !== regEntry.name) errors.push(`approval record ${record.tokenId}: canonicalName does not match registry`);
  if (record.symbol !== regEntry.symbol) errors.push(`approval record ${record.tokenId}: symbol does not match registry`);
  return errors;
}

/**
 * Cross-check a frozen approval record against the CURRENT (live, mutable)
 * source-plan entry. Every field must match exactly - any drift (the entry
 * was edited after this version was frozen) blocks further processing of
 * this exact logoVersion until the drift is resolved (either revert the plan
 * entry, or bump to a new logoVersion and freeze a new approval for it).
 * @returns {string[]} errors (empty = the live entry still matches the frozen record)
 */
export function verifyApprovalMatchesPlanEntry(record, entry) {
  const errors = [];
  const compare = (field, recordValue, entryValue) => {
    if (recordValue !== entryValue) {
      errors.push(`approval record field "${field}" (${JSON.stringify(recordValue)}) no longer matches the current source-plan entry (${JSON.stringify(entryValue)}) - the plan was edited after this version was frozen`);
    }
  };
  compare("tokenId", record.tokenId, entry.tokenId);
  compare("logoVersion", record.logoVersion, entry.expectedLogoVersion);
  compare("catalogVersion", record.catalogVersion, entry.catalogVersion);
  compare("providerId", record.providerId, entry.providerId);
  compare("canonicalName", record.canonicalName, entry.canonicalName);
  compare("symbol", record.symbol, entry.symbol);
  compare("sourceReviewStatus", record.sourceReviewStatus, entry.sourceReviewStatus);
  compare("permissionReviewStatus", record.permissionReviewStatus, entry.permissionReviewStatus);
  compare("sourceType", record.sourceType, entry.sourceType);
  compare("sourceReference", record.sourceReference, entry.sourceReference);
  compare("sourcePageReference", record.sourcePageReference, entry.sourcePageReference);
  compare("permittedVariant", record.permittedVariant, entry.permittedVariant);
  compare("variantType", record.variantType, entry.variantType);
  compare("cropMode", record.cropMode, entry.cropMode);
  compare("expectedMimeClass", record.expectedMimeClass, entry.expectedMimeClass);
  compare("approvedSourceContentHash", record.approvedSourceContentHash, entry.approvedSourceContentHash);
  compare("approvedBy", record.approvedBy, entry.approvedBy);
  compare("approvedAt", record.approvedAt, entry.approvedAt);
  compare("permissionEvidenceReference", record.permissionEvidenceReference, entry.permissionEvidenceReference ?? null);
  compare("providerFallbackApproved", record.providerFallbackApproved, entry.providerFallbackApproved === true);
  compare("allowExtremeAspectRatio", record.allowExtremeAspectRatio, entry.allowExtremeAspectRatio === true);
  compare("notes", record.notes, entry.notes ?? "");
  compare("intakePath", record.intakePath, entry.intakePath);
  return errors;
}

/** Load and structurally validate the approval record for (tokenId, logoVersion), if any. */
export function loadApprovalRecord(approvalsRoot, tokenId, logoVersion) {
  const filePath = approvalPathFor(approvalsRoot, tokenId, logoVersion);
  if (!existsSync(filePath)) return { record: null, errors: [`approval record missing: ${path.basename(filePath)}`] };
  let record;
  try {
    record = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return { record: null, errors: [`approval record "${path.basename(filePath)}" is not valid JSON`] };
  }
  const errors = validateApprovalRecordShape(record);
  if (errors.length > 0) return { record: null, errors };
  if (record.tokenId !== tokenId || record.logoVersion !== logoVersion) {
    return { record: null, errors: [`approval record file "${path.basename(filePath)}" content (${record.tokenId} v${record.logoVersion}) does not match its filename`] };
  }
  return { record, errors: [] };
}

/**
 * Write an approval record to its deterministic path. Refuses to overwrite
 * an existing record with DIFFERENT content (immutability); re-writing
 * identical content is an idempotent no-op.
 */
export function writeApprovalRecordAtomically(approvalsRoot, record) {
  const shapeErrors = validateApprovalRecordShape(record);
  if (shapeErrors.length > 0) {
    throw new ApprovalError(`refusing to write an invalid approval record: ${shapeErrors.join("; ")}`, { shapeErrors });
  }
  const filePath = approvalPathFor(approvalsRoot, record.tokenId, record.logoVersion);
  if (existsSync(filePath)) {
    const existing = JSON.parse(readFileSync(filePath, "utf8"));
    if (JSON.stringify(existing) !== JSON.stringify(record)) {
      throw new ApprovalError(`refusing to overwrite existing IMMUTABLE approval record ${path.basename(filePath)} with different content`, { filePath });
    }
    return filePath; // identical - idempotent no-op
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
  return filePath;
}
