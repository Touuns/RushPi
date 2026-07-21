// Public logo-release manifest (Phase 12C-1B2B). Machine-generated, safe for
// client use: entries carry ONLY output identity/paths/hashes - never a
// source URL, source page, approval identity, permission notes or local
// intake path. This is a content-derived version, deliberately separate from
// the token registry's catalogVersion (a logo-source/version/normalization
// change must never change catalogVersion, Daily selection, the challenge
// seed, token eligibility or scoring).
import { createHash } from "node:crypto";
import {
  SCHEMA_VERSION,
  NORMALIZATION_POLICY_VERSION,
  TOKEN_ID_PATTERN,
  SHA256_HEX_PATTERN,
  TOKEN_LOGOS_OUTPUT_ROOT,
} from "./constants.mjs";

// Fields that must NEVER appear anywhere in the public release manifest -
// the full admin/source/approval/intake surface, plus the receipt-only
// source-hash and raw-source-shape fields (those belong in
// tools/logos/receipts/, never in the client-safe manifest).
export const FORBIDDEN_PUBLIC_FIELDS = [
  "sourceReference", "sourcePageReference", "sourceType", "sourceReviewStatus",
  "permissionReviewStatus", "permissionEvidenceReference", "approvedBy",
  "approvedAt", "notes", "intakePath", "permittedVariant", "variantType",
  "cropMode", "providerFallbackApproved",
  "approvedSourceContentHash", "actualSourceContentHash",
  "sourceMimeType", "sourceWidth", "sourceHeight", "sourceFileSize",
  "approvalRecordContentHash",
];

// Exact allowlists: the only fields the public manifest (and each of its
// entries) may ever carry. Anything else is rejected outright, even a field
// that isn't on FORBIDDEN_PUBLIC_FIELDS above (a manifest schema is a closed
// contract, not merely a blocklist).
const MANIFEST_TOP_LEVEL_ALLOWED_FIELDS = new Set([
  "schemaVersion", "logoReleaseVersion", "normalizationPolicyVersion",
  "catalogVersion", "contentHash", "entryCount", "entries",
]);
const MANIFEST_ENTRY_ALLOWED_FIELDS = new Set([
  "tokenId", "logoVersion", "output64Path", "output128Path",
  "output64Hash", "output128Hash", "output64MimeType", "output128MimeType",
]);

function expectedOutputRelPath(tokenId, logoVersion, size, hash) {
  return `${TOKEN_LOGOS_OUTPUT_ROOT}/${tokenId}/v${logoVersion}/${size}/${hash}.png`;
}

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
 * Full structural + registry/policy + privacy validation of a built release
 * manifest.
 * @param {any} manifest
 * @param {{ byTokenId: Map, catalogVersion: string }} [registry]  optional -
 *   when provided, cross-checks catalogVersion and registry membership.
 * @returns {string[]} errors
 */
export function validateReleaseManifest(manifest, registry) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || !Array.isArray(manifest.entries)) {
    return ["release manifest entries is not an array"];
  }

  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_TOP_LEVEL_ALLOWED_FIELDS.has(key)) errors.push(`release manifest: unknown top-level field "${key}"`);
  }

  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`release manifest schemaVersion must be ${SCHEMA_VERSION}, got ${JSON.stringify(manifest.schemaVersion)}`);
  }
  if (manifest.normalizationPolicyVersion !== NORMALIZATION_POLICY_VERSION) {
    errors.push(`release manifest normalizationPolicyVersion must be ${NORMALIZATION_POLICY_VERSION}, got ${manifest.normalizationPolicyVersion}`);
  }
  if (registry && manifest.catalogVersion !== registry.catalogVersion) {
    errors.push(`release manifest catalogVersion "${manifest.catalogVersion}" does not match the approved registry catalogVersion "${registry.catalogVersion}"`);
  } else if (typeof manifest.catalogVersion !== "string" || manifest.catalogVersion.length === 0) {
    errors.push("release manifest catalogVersion is missing/invalid");
  }
  if (typeof manifest.entryCount !== "number" || manifest.entryCount !== manifest.entries.length) {
    errors.push(`release manifest entryCount must equal entries.length (${manifest.entries.length}), got ${JSON.stringify(manifest.entryCount)}`);
  }
  const orderedTokenIds = manifest.entries.map((e) => e.tokenId);
  const sortedTokenIds = orderedTokenIds.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (JSON.stringify(orderedTokenIds) !== JSON.stringify(sortedTokenIds)) {
    errors.push("release manifest entries must be in deterministic ascending tokenId order");
  }

  const seenTokenIds = new Set();
  for (const entry of manifest.entries) {
    const label = `release entry ${entry.tokenId ?? "<unknown>"}`;

    for (const field of FORBIDDEN_PUBLIC_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`${label}: forbidden private/admin field "${field}" present`);
      }
    }
    for (const key of Object.keys(entry)) {
      if (!MANIFEST_ENTRY_ALLOWED_FIELDS.has(key)) errors.push(`${label}: unknown field "${key}"`);
    }

    if (typeof entry.tokenId !== "string" || !TOKEN_ID_PATTERN.test(entry.tokenId)) {
      errors.push(`${label}: invalid tokenId`);
      continue; // nothing further can be safely cross-checked
    }
    if (seenTokenIds.has(entry.tokenId)) errors.push(`${label}: duplicate tokenId in release manifest`);
    seenTokenIds.add(entry.tokenId);

    if (registry && !registry.byTokenId.has(entry.tokenId)) {
      errors.push(`${label}: token is absent from the approved V2 registry`);
    }
    if (!Number.isInteger(entry.logoVersion) || entry.logoVersion < 1) {
      errors.push(`${label}: logoVersion must be a positive integer, got ${JSON.stringify(entry.logoVersion)}`);
    }

    for (const size of [64, 128]) {
      const p = entry[`output${size}Path`];
      const h = entry[`output${size}Hash`];
      const mime = entry[`output${size}MimeType`];
      if (typeof p !== "string" || p.length === 0) errors.push(`${label}: missing output${size}Path`);
      if (typeof h !== "string" || !SHA256_HEX_PATTERN.test(h)) errors.push(`${label}: missing/invalid output${size}Hash`);
      if (mime !== "image/png") errors.push(`${label}: output${size}MimeType must be "image/png", got ${JSON.stringify(mime)}`);
      if (typeof p === "string" && typeof h === "string" && Number.isInteger(entry.logoVersion)) {
        const expected = expectedOutputRelPath(entry.tokenId, entry.logoVersion, size, h);
        if (p !== expected) {
          errors.push(`${label}: output${size}Path "${p}" is inconsistent with tokenId/logoVersion/size/hash (expected "${expected}")`);
        }
      }
    }
  }

  const recomputedHash = computeReleaseContentHash(manifest.normalizationPolicyVersion, manifest.catalogVersion, manifest.entries);
  if (typeof manifest.contentHash !== "string" || manifest.contentHash.length === 0) {
    errors.push("release manifest contentHash is missing");
  } else if (manifest.contentHash !== recomputedHash) {
    errors.push(`release manifest contentHash mismatch: stored=${manifest.contentHash} recomputed=${recomputedHash}`);
  }

  const recomputedVersion = computeLogoReleaseVersion(manifest.normalizationPolicyVersion, manifest.catalogVersion, manifest.entries);
  if (typeof manifest.logoReleaseVersion !== "string" || manifest.logoReleaseVersion.length === 0) {
    errors.push("release manifest logoReleaseVersion is missing");
  } else if (manifest.logoReleaseVersion !== recomputedVersion) {
    errors.push(`release manifest logoReleaseVersion mismatch: stored=${manifest.logoReleaseVersion} recomputed=${recomputedVersion}`);
  }

  return errors;
}
