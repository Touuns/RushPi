// Source-plan (admin/non-client audit manifest) validation (Phase 12C-1B2B).
// Pure function: takes the parsed plan + the approved V2 registry, returns
// errors[]. No source URL alone is ever sufficient for approval - every
// approved entry must carry a fully consistent set of review/approval fields.
import {
  TOKEN_ID_PATTERN,
  SOURCE_REVIEW_STATUSES,
  PERMISSION_REVIEW_STATUSES,
  PROCESSABLE_PERMISSION_STATUSES,
  SOURCE_TYPES,
  PROVIDER_FALLBACK_SOURCE_TYPE,
  VARIANT_TYPES,
  CROP_MODES,
  EXPECTED_MIME_CLASSES,
} from "./constants.mjs";
import { resolveSafePath, UnsafePathError } from "./path-safety.mjs";

// Fields the tooling computes - an authored plan entry must never carry them.
const FORBIDDEN_AUTHORED_FIELDS = [
  "output64Path", "output128Path", "output64Hash", "output128Hash",
  "sourceContentHash", "sourceWidth", "sourceHeight", "sourceFileSize",
  "logoVersion",
];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * @param {any[]} entries  parsed source-plan entries
 * @param {{ byTokenId: Map<string, any>, catalogVersion: string }} registry
 * @param {{ intakeRoot?: string }} [options]
 * @returns {string[]} errors (empty = valid)
 */
export function validateSourcePlan(entries, registry, options = {}) {
  const errors = [];
  if (!Array.isArray(entries)) return ["source plan entries is not an array"];

  const seenTokenIds = new Set();

  for (const entry of entries) {
    const label = `entry ${entry && entry.tokenId ? entry.tokenId : "<unknown>"}`;

    // --- identity -------------------------------------------------------
    if (!isNonEmptyString(entry.tokenId) || !TOKEN_ID_PATTERN.test(entry.tokenId)) {
      errors.push(`${label}: unknown/invalid tokenId format`);
      continue; // nothing further can be safely cross-checked
    }
    if (seenTokenIds.has(entry.tokenId)) {
      errors.push(`${label}: duplicate tokenId in source plan`);
    }
    seenTokenIds.add(entry.tokenId);

    const registryEntry = registry.byTokenId.get(entry.tokenId);
    if (!registryEntry) {
      errors.push(`${label}: tokenId is absent from the approved V2 registry`);
      continue;
    }

    if (entry.providerId !== registryEntry.providerIds.coingecko) {
      errors.push(`${label}: providerId "${entry.providerId}" does not match registry "${registryEntry.providerIds.coingecko}"`);
    }
    if (entry.canonicalName !== registryEntry.name) {
      errors.push(`${label}: canonicalName "${entry.canonicalName}" does not match registry "${registryEntry.name}"`);
    }
    if (entry.symbol !== registryEntry.symbol) {
      errors.push(`${label}: symbol "${entry.symbol}" does not match registry "${registryEntry.symbol}"`);
    }
    if (entry.catalogVersion !== registry.catalogVersion) {
      errors.push(`${label}: catalogVersion "${entry.catalogVersion}" does not match approved registry catalogVersion "${registry.catalogVersion}"`);
    }

    // --- forbidden authored fields ---------------------------------------
    for (const field of FORBIDDEN_AUTHORED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`${label}: field "${field}" must never be authored manually (tooling-computed only)`);
      }
    }

    // --- enum validation --------------------------------------------------
    if (!SOURCE_REVIEW_STATUSES.has(entry.sourceReviewStatus)) {
      errors.push(`${label}: unknown sourceReviewStatus "${entry.sourceReviewStatus}"`);
    }
    if (!PERMISSION_REVIEW_STATUSES.has(entry.permissionReviewStatus)) {
      errors.push(`${label}: unknown permissionReviewStatus "${entry.permissionReviewStatus}"`);
    }
    if (entry.sourceType !== null && entry.sourceType !== undefined && !SOURCE_TYPES.has(entry.sourceType)) {
      errors.push(`${label}: unknown sourceType "${entry.sourceType}"`);
    }
    if (entry.variantType !== null && entry.variantType !== undefined && !VARIANT_TYPES.has(entry.variantType)) {
      errors.push(`${label}: unknown variantType "${entry.variantType}"`);
    }
    if (entry.cropMode !== null && entry.cropMode !== undefined && !CROP_MODES.has(entry.cropMode)) {
      errors.push(`${label}: unknown cropMode "${entry.cropMode}"`);
    }
    if (entry.expectedMimeClass !== null && entry.expectedMimeClass !== undefined && !EXPECTED_MIME_CLASSES.has(entry.expectedMimeClass)) {
      errors.push(`${label}: unknown expectedMimeClass "${entry.expectedMimeClass}"`);
    }

    // --- provider fallback gate (checked regardless of overall status) ---
    if (entry.sourceType === PROVIDER_FALLBACK_SOURCE_TYPE) {
      if (entry.providerFallbackApproved !== true) errors.push(`${label}: authorized-provider source requires providerFallbackApproved=true`);
      if (!isNonEmptyString(entry.approvedBy)) errors.push(`${label}: authorized-provider source requires approvedBy`);
      if (!isNonEmptyString(entry.approvedAt)) errors.push(`${label}: authorized-provider source requires approvedAt`);
      if (!isNonEmptyString(entry.permissionEvidenceReference)) errors.push(`${label}: authorized-provider source requires permissionEvidenceReference`);
      if (!isNonEmptyString(entry.notes)) errors.push(`${label}: authorized-provider source requires explanatory notes`);
    } else if (entry.providerFallbackApproved === true) {
      errors.push(`${label}: providerFallbackApproved=true is only meaningful for sourceType=authorized-provider`);
    }

    // --- explicit-product-exception completeness -------------------------
    if (entry.permissionReviewStatus === "explicit-product-exception") {
      if (!isNonEmptyString(entry.approvedBy)) errors.push(`${label}: explicit-product-exception requires approvedBy`);
      if (!isNonEmptyString(entry.approvedAt)) errors.push(`${label}: explicit-product-exception requires approvedAt`);
      if (!isNonEmptyString(entry.permissionEvidenceReference)) errors.push(`${label}: explicit-product-exception requires permissionEvidenceReference`);
      if (!isNonEmptyString(entry.notes)) errors.push(`${label}: explicit-product-exception requires explanatory notes`);
    }

    // --- approval consistency ---------------------------------------------
    const hasApprovalFields = isNonEmptyString(entry.approvedBy) || isNonEmptyString(entry.approvedAt);
    if (entry.sourceReviewStatus === "source-approved") {
      if (!isNonEmptyString(entry.approvedBy)) errors.push(`${label}: source-approved requires approvedBy`);
      if (!isNonEmptyString(entry.approvedAt)) errors.push(`${label}: source-approved requires approvedAt`);
      if (!isNonEmptyString(entry.sourceReference)) errors.push(`${label}: source-approved requires sourceReference (a URL/reference alone from an earlier stage is not sufficient - it must be present at approval)`);
      if (!isNonEmptyString(entry.sourcePageReference)) errors.push(`${label}: source-approved requires sourcePageReference`);
      if (!isNonEmptyString(entry.permittedVariant)) errors.push(`${label}: source-approved requires permittedVariant`);
      if (!VARIANT_TYPES.has(entry.variantType)) errors.push(`${label}: source-approved requires a valid variantType`);
      if (!CROP_MODES.has(entry.cropMode)) errors.push(`${label}: source-approved requires a valid cropMode`);
      if (!EXPECTED_MIME_CLASSES.has(entry.expectedMimeClass)) errors.push(`${label}: source-approved requires a valid expectedMimeClass`);
      if (!PROCESSABLE_PERMISSION_STATUSES.has(entry.permissionReviewStatus)) {
        errors.push(`${label}: source-approved requires permissionReviewStatus to be permission-confirmed or explicit-product-exception, got "${entry.permissionReviewStatus}"`);
      }
    } else if (hasApprovalFields) {
      errors.push(`${label}: approvedBy/approvedAt present but sourceReviewStatus is not "source-approved" (inconsistent state)`);
    }

    // --- intake path safety -------------------------------------------------
    if (entry.intakePath !== null && entry.intakePath !== undefined) {
      if (!isNonEmptyString(entry.intakePath)) {
        errors.push(`${label}: intakePath must be a non-empty string or null`);
      } else if (options.intakeRoot) {
        try {
          resolveSafePath(options.intakeRoot, entry.intakePath);
        } catch (e) {
          if (e instanceof UnsafePathError) {
            errors.push(`${label}: unsafe intakePath - ${e.message}`);
          } else {
            throw e;
          }
        }
      }
    }
  }

  return errors;
}
