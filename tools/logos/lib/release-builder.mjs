// Assembles the public release manifest from verified receipts + an explicit
// release-selection file (Phase 12C-1B2B.1). Never infers "latest" from a
// directory listing or the highest version number.
import { RELEASE_SELECTION_PATH } from "./constants.mjs";

/**
 * Pick exactly one verified receipt per tokenId. A token with a single
 * receipt is unambiguously selected. A token with multiple receipts requires
 * an explicit entry in the release-selection file naming the chosen
 * logoVersion - anything else fails loudly (returned as an error, never
 * silently skipped).
 * @param {any[]} receipts
 * @param {{ selections?: Record<string, number> }} selection
 * @returns {{ chosen: any[], errors: string[] }}
 */
export function selectReceiptsForRelease(receipts, selection) {
  const errors = [];
  const byToken = new Map();
  for (const r of receipts) {
    if (!byToken.has(r.tokenId)) byToken.set(r.tokenId, []);
    byToken.get(r.tokenId).push(r);
  }

  const chosen = [];
  for (const [tokenId, group] of byToken) {
    if (group.length === 1) {
      chosen.push(group[0]);
      continue;
    }
    const selectedVersion = selection.selections && selection.selections[tokenId];
    if (!Number.isInteger(selectedVersion)) {
      errors.push(`tokenId ${tokenId} has ${group.length} verified receipts (versions ${group.map((g) => g.logoVersion).sort((a, b) => a - b).join(", ")}) and no explicit entry in ${RELEASE_SELECTION_PATH} - the highest version is never auto-selected`);
      continue;
    }
    const match = group.find((g) => g.logoVersion === selectedVersion);
    if (!match) {
      errors.push(`tokenId ${tokenId}: release-selection names logoVersion ${selectedVersion}, which has no verified receipt (available: ${group.map((g) => g.logoVersion).join(", ")})`);
      continue;
    }
    chosen.push(match);
  }
  return { chosen, errors };
}

/** Project a verified receipt down to the safe public release-manifest fields only. */
export function receiptToPublicEntry(receipt) {
  return {
    tokenId: receipt.tokenId,
    logoVersion: receipt.logoVersion,
    output64Path: receipt.output64Path,
    output128Path: receipt.output128Path,
    output64Hash: receipt.output64Hash,
    output128Hash: receipt.output128Hash,
    output64MimeType: receipt.output64MimeType,
    output128MimeType: receipt.output128MimeType,
  };
}
