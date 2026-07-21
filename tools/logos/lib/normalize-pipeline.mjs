// Full approved-token normalization pipeline (Phase 12C-1B2B.1, bound to the
// immutable approval record in 12C-1B2B.2):
//
//   gate -> load+verify frozen approval record -> verify it still matches the
//   CURRENT source-plan entry -> bound-intake read -> source-hash match ->
//   security inspection -> deterministic normalization -> preflight-checked,
//   rollback-safe publication of both outputs + receipt.
//
// A receipt is generated ONLY after every one of these steps has succeeded.
import path from "node:path";
import { assertProcessable } from "./process-gate.mjs";
import { inspectApprovedIntake } from "./inspect-source.mjs";
import { normalizeToOutputs } from "./normalize.mjs";
import { sha256Hex } from "./hashes.mjs";
import { outputPathFor } from "./output-paths.mjs";
import { buildReceipt } from "./receipt.mjs";
import { publishTokenVersion } from "./publish-outputs.mjs";
import { loadApprovalRecord, verifyApprovalMatchesRegistry, verifyApprovalMatchesPlanEntry } from "./approval.mjs";
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
 * @param {any} args.entry  the CURRENT source-plan entry (must be source-approved)
 * @param {string} args.intakeRoot
 * @param {string} args.outputRoot
 * @param {string} args.receiptsRoot
 * @param {string} args.approvalsRoot
 * @param {string} args.repoRoot
 * @param {{ byTokenId: Map, catalogVersion: string }} args.registry
 * @param {{ fileBufferOverride?: Buffer, throwAfter?: string }} [args.testOnly]
 *   INTERNAL/TEST-ONLY, never wired to a CLI flag.
 * @returns {Promise<{ receipt: any, receiptPath: string }>}
 */
export async function normalizeApprovedToken({ entry, intakeRoot, outputRoot, receiptsRoot, approvalsRoot, repoRoot, registry, testOnly = {} }) {
  assertProcessable(entry);

  const logoVersion = entry.expectedLogoVersion;
  if (!Number.isInteger(logoVersion) || logoVersion < 1) {
    throw new PipelineError("invalid-expected-logo-version", { expectedLogoVersion: entry.expectedLogoVersion });
  }

  // The immutable approval record is the sole authority processing is bound
  // to - never the live, mutable plan entry directly.
  const { record: approvalRecord, errors: loadErrors } = loadApprovalRecord(approvalsRoot, entry.tokenId, logoVersion);
  if (!approvalRecord) {
    throw new PipelineError("approval-record-missing-or-invalid", { tokenId: entry.tokenId, logoVersion, loadErrors });
  }
  const registryErrors = verifyApprovalMatchesRegistry(approvalRecord, registry);
  if (registryErrors.length > 0) {
    throw new PipelineError("approval-record-registry-mismatch", { registryErrors });
  }
  const driftErrors = verifyApprovalMatchesPlanEntry(approvalRecord, entry);
  if (driftErrors.length > 0) {
    throw new PipelineError("approval-record-plan-drift", { driftErrors });
  }

  // Gate + bound-intake read + source-hash match + security inspection.
  const inspected = await inspectApprovedIntake(entry, intakeRoot, testOnly);

  // Deterministic normalization.
  const { buf64, buf128 } = await normalizeToOutputs(inspected.rasterForNormalization, entry.cropMode);
  const hash64 = sha256Hex(buf64);
  const hash128 = sha256Hex(buf128);

  const candidateReceipt = buildReceipt({
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
    approvalRecordContentHash: approvalRecord.approvalRecordContentHash,
    toolchain: getToolchainFingerprint(),
  });

  const { receipt, receiptPath } = await publishTokenVersion({
    outputRoot, receiptsRoot, tokenId: entry.tokenId, logoVersion, buf64, buf128, hash64, hash128,
    candidateReceipt, testOnly,
  });

  return { receipt, receiptPath };
}

function toRepoRelative(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}
