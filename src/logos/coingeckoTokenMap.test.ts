import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTokenIdFromCoinGeckoId } from "./coingeckoTokenMap.ts";
import { COINGECKO_TOKEN_ID_PAIRS } from "./generatedCoingeckoTokenMap.ts";

test("bitcoin -> rpt-0001", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("bitcoin"), "rpt-0001");
});

test("ethereum -> rpt-0002", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("ethereum"), "rpt-0002");
});

test("tether -> rpt-0004", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("tether"), "rpt-0004");
});

test("chainlink -> rpt-0012", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("chainlink"), "rpt-0012");
});

test("shiba-inu -> rpt-0024", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("shiba-inu"), "rpt-0024");
});

test("at least one V2-only token maps correctly (hyperliquid -> rpt-0037)", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("hyperliquid"), "rpt-0037");
});

test("unknown CoinGecko ID returns undefined", () => {
  assert.equal(resolveTokenIdFromCoinGeckoId("not-a-real-coingecko-id"), undefined);
});

test("no duplicate CoinGecko provider IDs in the generated map", () => {
  const ids = COINGECKO_TOKEN_ID_PAIRS.map(([coingeckoId]) => coingeckoId);
  assert.equal(new Set(ids).size, ids.length, "every coingecko provider ID must be unique");
  for (const [coingeckoId, tokenId] of COINGECKO_TOKEN_ID_PAIRS) {
    assert.equal(resolveTokenIdFromCoinGeckoId(coingeckoId), tokenId);
  }
});
