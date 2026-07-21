// Validation for tools/logos/data/release-selection.json (Phase 12C-1B2B.2).
// This file exists SOLELY to disambiguate a token that has accumulated more
// than one verified receipted logoVersion - it must never carry a stale or
// speculative entry, and every entry it does carry must resolve to a real,
// verified receipt.
import { TOKEN_ID_PATTERN, RELEASE_SELECTION_SCHEMA_VERSION } from "./constants.mjs";

const ALLOWED_TOP_LEVEL_FIELDS = new Set(["schemaVersion", "description", "selections"]);

/**
 * @param {any} selectionFile  parsed release-selection.json
 * @param {any[]} receipts  the set of already-VERIFIED receipts (post
 *   verifyReceiptAgainstOutputs + verifyReceiptApprovalBinding)
 * @param {{ byTokenId: Map }} registry
 * @returns {string[]} errors (empty = valid)
 */
export function validateReleaseSelection(selectionFile, receipts, registry) {
  const errors = [];
  if (!selectionFile || typeof selectionFile !== "object" || Array.isArray(selectionFile)) {
    return ["release-selection file is not an object"];
  }

  for (const key of Object.keys(selectionFile)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`release-selection: unknown top-level field "${key}"`);
  }

  if (selectionFile.schemaVersion !== RELEASE_SELECTION_SCHEMA_VERSION) {
    errors.push(`release-selection: schemaVersion must be ${RELEASE_SELECTION_SCHEMA_VERSION}, got ${JSON.stringify(selectionFile.schemaVersion)}`);
  }

  const selections = selectionFile.selections;
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    errors.push("release-selection: \"selections\" must be a non-array object");
    return errors;
  }

  const receiptsByToken = new Map();
  for (const r of receipts) {
    if (!receiptsByToken.has(r.tokenId)) receiptsByToken.set(r.tokenId, []);
    receiptsByToken.get(r.tokenId).push(r.logoVersion);
  }

  for (const [tokenId, logoVersion] of Object.entries(selections)) {
    const label = `release-selection entry "${tokenId}"`;
    if (!TOKEN_ID_PATTERN.test(tokenId)) {
      errors.push(`${label}: invalid tokenId format`);
      continue;
    }
    if (!registry.byTokenId.has(tokenId)) {
      errors.push(`${label}: token is absent from the approved V2 registry`);
      continue;
    }
    if (!Number.isInteger(logoVersion) || logoVersion < 1) {
      errors.push(`${label}: logoVersion must be a positive integer, got ${JSON.stringify(logoVersion)}`);
      continue;
    }

    const versions = receiptsByToken.get(tokenId) ?? [];
    if (versions.length === 0) {
      errors.push(`${label}: no verified receipt exists at all for this token - remove this selection entry`);
      continue;
    }
    if (versions.length === 1) {
      errors.push(`${label}: stale selection entry - this token has only one verified receipt (v${versions[0]}) and does not need a selection`);
      continue;
    }
    if (!versions.includes(logoVersion)) {
      errors.push(`${label}: selected logoVersion ${logoVersion} has no verified receipt (available: ${versions.join(", ")})`);
    }
  }

  return errors;
}
