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

export function canonicalSerialize(schemaVersion, entries) {
  return JSON.stringify(sortKeysDeep({ schemaVersion, entries }));
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
