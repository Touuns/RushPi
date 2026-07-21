// Public logo-release manifest (Phase 12C-1B2B). Machine-generated, safe for
// client use: entries carry ONLY output identity/paths/hashes - never a
// source URL, source page, approval identity, permission notes or local
// intake path. This is a content-derived version, deliberately separate from
// the token registry's catalogVersion (a logo-source/version/normalization
// change must never change catalogVersion, Daily selection, the challenge
// seed, token eligibility or scoring).
import { createHash } from "node:crypto";
import { SCHEMA_VERSION, NORMALIZATION_POLICY_VERSION } from "./constants.mjs";

// Fields that must NEVER appear anywhere in the public release manifest.
export const FORBIDDEN_PUBLIC_FIELDS = [
  "sourceReference", "sourcePageReference", "sourceType", "sourceReviewStatus",
  "permissionReviewStatus", "permissionEvidenceReference", "approvedBy",
  "approvedAt", "notes", "intakePath", "permittedVariant", "variantType",
  "cropMode", "providerFallbackApproved",
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

function orderByTokenId(entries) {
  return entries.slice().sort((a, b) => (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0));
}

/**
 * publishedAt is deliberately never included in the hashed/serialized
 * content at all (not merely excluded from hashing) - no current-time value
 * may enter this deterministic artifact.
 */
export function canonicalSerializeRelease(normalizationPolicyVersion, catalogVersion, entries) {
  return JSON.stringify(
    sortKeysDeep({ schemaVersion: SCHEMA_VERSION, normalizationPolicyVersion, catalogVersion, entries: orderByTokenId(entries) }),
  );
}

export function computeReleaseContentHash(normalizationPolicyVersion, catalogVersion, entries) {
  return createHash("sha256").update(canonicalSerializeRelease(normalizationPolicyVersion, catalogVersion, entries), "utf8").digest("hex");
}

export function computeLogoReleaseVersion(normalizationPolicyVersion, catalogVersion, entries) {
  const hash = computeReleaseContentHash(normalizationPolicyVersion, catalogVersion, entries);
  return `logo-release-v${SCHEMA_VERSION}-${hash.slice(0, 16)}`;
}

/**
 * @param {{ catalogVersion: string, entries: Array<{tokenId, logoVersion, output64Path, output128Path, output64Hash, output128Hash, output64MimeType, output128MimeType, sourceContentHash?}> }} input
 */
export function buildReleaseManifest({ catalogVersion, entries, normalizationPolicyVersion = NORMALIZATION_POLICY_VERSION }) {
  const sorted = orderByTokenId(entries);
  const contentHash = computeReleaseContentHash(normalizationPolicyVersion, catalogVersion, sorted);
  const logoReleaseVersion = computeLogoReleaseVersion(normalizationPolicyVersion, catalogVersion, sorted);
  return {
    schemaVersion: SCHEMA_VERSION,
    logoReleaseVersion,
    normalizationPolicyVersion,
    catalogVersion,
    contentHash,
    entryCount: sorted.length,
    entries: sorted,
  };
}

/**
 * Structural + privacy validation of a built release manifest. Rejects any
 * entry carrying a forbidden admin/private field.
 * @returns {string[]} errors
 */
export function validateReleaseManifest(manifest) {
  const errors = [];
  if (!manifest || !Array.isArray(manifest.entries)) {
    return ["release manifest entries is not an array"];
  }
  for (const entry of manifest.entries) {
    for (const field of FORBIDDEN_PUBLIC_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`release entry ${entry.tokenId ?? "<unknown>"}: forbidden private/admin field "${field}" present`);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(entry, "tokenId")) errors.push("release entry missing tokenId");
    if (!Object.prototype.hasOwnProperty.call(entry, "logoVersion")) errors.push(`release entry ${entry.tokenId}: missing logoVersion`);
    if (!Object.prototype.hasOwnProperty.call(entry, "output64Hash")) errors.push(`release entry ${entry.tokenId}: missing output64Hash`);
    if (!Object.prototype.hasOwnProperty.call(entry, "output128Hash")) errors.push(`release entry ${entry.tokenId}: missing output128Hash`);
  }
  const recomputed = computeReleaseContentHash(manifest.normalizationPolicyVersion, manifest.catalogVersion, manifest.entries);
  if (manifest.contentHash !== undefined && manifest.contentHash !== recomputed) {
    errors.push(`release manifest contentHash mismatch: stored=${manifest.contentHash} recomputed=${recomputed}`);
  }
  return errors;
}
