// Shared processing gate (Phase 12C-1B2B): given a loaded source plan entry,
// decide whether it is eligible for security inspection / normalization at
// all. Processing is permitted ONLY when sourceReviewStatus=source-approved
// AND permissionReviewStatus is permission-confirmed or
// explicit-product-exception - and even then only if the entry independently
// passes full validate-source-plan consistency checks. No image URL or
// candidate alone is ever sufficient.
import { PROCESSABLE_PERMISSION_STATUSES } from "./constants.mjs";

export class ProcessingNotPermittedError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "ProcessingNotPermittedError";
  }
}

/** @param {any} entry a single source-plan entry */
export function assertProcessable(entry) {
  if (entry.sourceReviewStatus !== "source-approved") {
    throw new ProcessingNotPermittedError(
      `tokenId ${entry.tokenId}: processing requires sourceReviewStatus=source-approved, got "${entry.sourceReviewStatus}"`,
    );
  }
  if (!PROCESSABLE_PERMISSION_STATUSES.has(entry.permissionReviewStatus)) {
    throw new ProcessingNotPermittedError(
      `tokenId ${entry.tokenId}: processing requires permissionReviewStatus permission-confirmed or explicit-product-exception, got "${entry.permissionReviewStatus}"`,
    );
  }
}

export function findPlanEntry(plan, tokenId) {
  const entry = plan.entries.find((e) => e.tokenId === tokenId);
  if (!entry) throw new ProcessingNotPermittedError(`tokenId ${tokenId} is not present in the source plan`);
  return entry;
}
