/**
 * Deterministic canonical serialization + SHA-256 hashing for registry
 * artifacts (Phase 12C-1A). This is the TypeScript reference implementation;
 * tools/registry/lib/canonical.mjs is a plain-Node mirror used by the build
 * tool (the repo's api/ and tools/ folders are not compiled through the same
 * pipeline — see the manual server/client mirror pattern already used by
 * api/_lib/marketTypes.ts + src/market/types.ts). Both implementations MUST
 * stay logically identical.
 *
 * No current time may ever enter the hashed content.
 */

import { createHash } from "node:crypto";
import type { CanonicalTokenEntry } from "./types";

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function orderByTokenId(entries: CanonicalTokenEntry[]): CanonicalTokenEntry[] {
  return entries
    .slice()
    .sort((a, b) => (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0));
}

/**
 * Deterministic JSON string: entries normalized to tokenId order, then
 * sorted object keys. The same logical entries in a different input order
 * always produce the same string (and therefore the same hash).
 */
export function canonicalSerialize(
  schemaVersion: number,
  entries: CanonicalTokenEntry[],
): string {
  return JSON.stringify(sortKeysDeep({ schemaVersion, entries: orderByTokenId(entries) }));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeContentHash(
  schemaVersion: number,
  entries: CanonicalTokenEntry[],
): string {
  return sha256Hex(canonicalSerialize(schemaVersion, entries));
}

/** Content-derived, immutable — never a mutable label such as "latest". */
export function computeCatalogVersion(
  schemaVersion: number,
  entries: CanonicalTokenEntry[],
): string {
  const hash = computeContentHash(schemaVersion, entries);
  return `token-registry-v${schemaVersion}-${hash.slice(0, 16)}`;
}
