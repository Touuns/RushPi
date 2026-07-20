// Registry-only canonical category enum for the V2 catalog PROPOSAL
// (Phase 12C-1B1). This is intentionally separate from — and does NOT modify —
// the legacy runtime TokenCategory (api/_lib/tokenCatalog.ts) or the default
// legacy set enforced for V1 in lib/validateEntries.mjs.
//
// A controlled, deliberately small set: every category below carries multiple
// entries in the proposal (no one-token categories). The 9 legacy V1
// categories are a strict subset, so all 36 frozen V1 entries map cleanly into
// this canonical set without any category change.
export const V2_CANONICAL_CATEGORIES = new Set([
  // legacy V1 subset (unchanged mapping for the 36 frozen entries)
  "store-of-value",
  "smart-contract",
  "payments",
  "layer-2",
  "interoperability",
  "stablecoin",
  "meme",
  "privacy",
  "defi",
  // registry-only additions introduced by the V2 proposal
  "oracle",
  "exchange",
  "gaming",
  "ai",
  "infrastructure",
  "data-storage",
  "social",
  "rwa",
  "liquid-staking",
  "depin",
  "other",
]);
