/**
 * Canonical CoinGecko provider ID -> tokenId mapping. Daily's runtime still
 * addresses tokens by CoinGecko ID (src/market/*); this is the single place
 * that translates one to the other for the logo layer.
 *
 * Built once, at module load, from a small checked-in generated pairs list
 * (see generatedCoingeckoTokenMap.ts) — no runtime fetch, no Node `fs`
 * access, no dependency on logo receipts/approvals. That pairs list is
 * produced deterministically by dedicated registry tooling and regenerated
 * with `npm run registry:build-coingecko-map`; this module never reads the
 * authoring source directly.
 *
 * No handwritten switch, no symbol matching, no aliasing/normalization —
 * exactly one generated pair per canonical provider ID, verbatim.
 */
import { COINGECKO_TOKEN_ID_PAIRS } from "./generatedCoingeckoTokenMap.ts";

function buildCoinGeckoTokenIdMap(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [coingeckoId, tokenId] of COINGECKO_TOKEN_ID_PAIRS) {
    if (map.has(coingeckoId)) {
      throw new Error(`Duplicate canonical CoinGecko provider ID: ${coingeckoId}`);
    }
    map.set(coingeckoId, tokenId);
  }
  return map;
}

const COINGECKO_TO_TOKEN_ID: ReadonlyMap<string, string> = buildCoinGeckoTokenIdMap();

/** Resolve a CoinGecko provider ID to its canonical tokenId. Unknown ID -> undefined. */
export function resolveTokenIdFromCoinGeckoId(coingeckoId: string): string | undefined {
  return COINGECKO_TO_TOKEN_ID.get(coingeckoId);
}
