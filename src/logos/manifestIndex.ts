/**
 * Immutable tokenId -> manifest entry index. The parser already guarantees
 * unique tokenIds (see manifestParser.ts), so building this index can never
 * silently drop an entry. Deliberately narrow: no symbol lookup, no provider
 * lookup — those belong to coingeckoTokenMap.ts.
 */
import type { TokenLogoManifest, TokenLogoManifestEntry } from "./types.ts";

export type TokenLogoManifestIndex = ReadonlyMap<string, TokenLogoManifestEntry>;

/** Build an O(1) tokenId -> entry index, preserving manifest entry order. */
export function buildManifestIndex(manifest: TokenLogoManifest): TokenLogoManifestIndex {
  const index = new Map<string, TokenLogoManifestEntry>();
  for (const entry of manifest.entries) {
    index.set(entry.tokenId, entry);
  }
  return index;
}

/** O(1) lookup. Returns undefined for an unknown tokenId. */
export function lookupManifestEntry(
  index: TokenLogoManifestIndex,
  tokenId: string,
): TokenLogoManifestEntry | undefined {
  return index.get(tokenId);
}
