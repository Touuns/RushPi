// Plain-Node mirror of api/_lib/tokenRegistry/hash.ts — must stay logically
// identical. No current time may ever enter the hashed content.
import { createHash } from "node:crypto";

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
  return entries
    .slice()
    .sort((a, b) => (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0));
}

// Entries are normalized to tokenId order before hashing so the same logical
// entries in a different input order always produce the same contentHash.
export function canonicalSerialize(schemaVersion, entries) {
  return JSON.stringify(sortKeysDeep({ schemaVersion, entries: orderByTokenId(entries) }));
}

export function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeContentHash(schemaVersion, entries) {
  return sha256Hex(canonicalSerialize(schemaVersion, entries));
}

export function computeCatalogVersion(schemaVersion, entries) {
  const hash = computeContentHash(schemaVersion, entries);
  return `token-registry-v${schemaVersion}-${hash.slice(0, 16)}`;
}
