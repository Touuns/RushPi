// Logo INGESTION MANIFEST validation (Phase 12C-1A.1). Pure function: takes
// the registry's known tokenIds + the manifest entries, returns errors[].
// Shared by tools/registry/validate.mjs and tools/registry/selftest.mjs.

const STATUSES = new Set(["pending", "ready", "rejected"]);
const SOURCE_TYPES = new Set(["official-project", "official-brand-kit", "authorized-provider"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function validateStateRules(entry, label, errors) {
  const { status, version, sourceReference, sourceMimeType, requiresRasterization, contentHash, url64, url128, ingestedAt, rejectionReason } = entry;

  if (status === "pending") {
    if (version !== 0) errors.push(`${label}: pending logo must have version=0, got ${version}`);
    if (contentHash !== null || url64 !== null || url128 !== null || ingestedAt !== null) {
      errors.push(`${label}: pending logo must have contentHash/url64/url128/ingestedAt all null`);
    }
    if (rejectionReason !== null) errors.push(`${label}: pending logo must have rejectionReason null`);
    if (requiresRasterization === true) {
      errors.push(`${label}: pending logo must not set requiresRasterization=true before the source format is known`);
    }
  } else if (status === "ready") {
    if (!(version >= 1)) errors.push(`${label}: ready logo must have version >= 1, got ${version}`);
    if (!isNonEmptyString(sourceReference)) errors.push(`${label}: ready logo requires a non-empty sourceReference`);
    if (!isNonEmptyString(sourceMimeType)) errors.push(`${label}: ready logo requires a non-empty sourceMimeType`);
    if (typeof requiresRasterization !== "boolean") errors.push(`${label}: ready logo requires requiresRasterization to be a boolean`);
    if (!isNonEmptyString(contentHash)) errors.push(`${label}: ready logo requires a non-empty contentHash`);
    if (!isNonEmptyString(url64)) errors.push(`${label}: ready logo requires a non-empty url64`);
    if (!isNonEmptyString(url128)) errors.push(`${label}: ready logo requires a non-empty url128`);
    if (!isNonEmptyString(ingestedAt)) errors.push(`${label}: ready logo requires a non-empty ingestedAt`);
    if (rejectionReason !== null) errors.push(`${label}: ready logo must have rejectionReason null`);
  } else if (status === "rejected") {
    if (!isNonEmptyString(rejectionReason)) errors.push(`${label}: rejected logo requires a non-empty rejectionReason`);
    if (contentHash !== null || url64 !== null || url128 !== null) {
      errors.push(`${label}: rejected logo must have contentHash/url64/url128 all null`);
    }
  }
}

export function validateManifest(registryTokenIds, manifestEntries) {
  const errors = [];

  if (!Array.isArray(manifestEntries)) {
    errors.push("logo manifest entries is not an array");
    return errors;
  }

  if (manifestEntries.length !== registryTokenIds.size) {
    errors.push(`manifest entry count (${manifestEntries.length}) differs from registry entry count (${registryTokenIds.size})`);
  }

  const seenTokenIds = new Set();
  for (const entry of manifestEntries) {
    const label = `logo manifest entry ${entry.tokenId ?? "<unknown>"}`;

    if (!entry.tokenId || !registryTokenIds.has(entry.tokenId)) {
      errors.push(`logo manifest tokenId absent from registry: ${entry.tokenId}`);
    } else if (seenTokenIds.has(entry.tokenId)) {
      errors.push(`duplicate manifest tokenId: ${entry.tokenId}`);
    }
    if (entry.tokenId) seenTokenIds.add(entry.tokenId);

    if (!STATUSES.has(entry.status)) errors.push(`${label}: unknown logo status "${entry.status}"`);
    if (!SOURCE_TYPES.has(entry.sourceType)) errors.push(`${label}: unknown source type "${entry.sourceType}"`);

    const sizes = entry.normalizedSizes;
    if (!Array.isArray(sizes) || sizes.length !== 2 || sizes[0] !== 64 || sizes[1] !== 128) {
      errors.push(`${label}: normalizedSizes must be exactly [64, 128], got ${JSON.stringify(sizes)}`);
    }

    if (STATUSES.has(entry.status)) validateStateRules(entry, label, errors);
  }

  for (const tokenId of registryTokenIds) {
    if (!seenTokenIds.has(tokenId)) {
      errors.push(`registry tokenId absent from logo manifest: ${tokenId}`);
    }
  }

  return errors;
}
