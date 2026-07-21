// Recognizable, identity-verified assets from the frozen top-500 capture that
// are NOT selected into the 250-entry proposal (Phase 12C-1B1.1, updated in
// 12C-1B1.2).
//
// These define the eligible universe together with the selected entries: the
// rank-based baseline is built from (V1 + selected + these). Every OTHER
// non-V1 capture asset is treated as hard-excluded (tokenized security/fund/
// commodity, wrapped/bridged/duplicate, inactive, or — the catch-all for the
// unrecognized long tail — identity-not-sufficiently-verified).
//
// `category` is the canonical V2 category used only for reporting the displaced
// or capacity side (these assets are not in the catalog).
export const V2_RECOGNIZED_ELIGIBLE = [
  // Higher-ranked eligibles deliberately displaced for category diversity, each
  // paired 1:1 with a retained lower-ranked selection in data/v2-substitutions.mjs.
  { id: "usd1-wlfi", category: "stablecoin" },
  { id: "global-dollar", category: "stablecoin" },
  { id: "world-liberty-financial", category: "defi" },
  { id: "aster-2", category: "defi" },
  { id: "memecore", category: "meme" },
  { id: "falcon-finance", category: "stablecoin" },
  { id: "bfusd", category: "stablecoin" },
  { id: "lighter", category: "defi" },
  { id: "venice-token", category: "ai" },
  { id: "hash-2", category: "rwa" },
  { id: "usdtb", category: "stablecoin" },
  { id: "midnight-3", category: "privacy" },
  { id: "olympus", category: "defi" },
  { id: "kite-2", category: "ai" },
  { id: "doublezero", category: "depin" },
  { id: "agora-dollar", category: "stablecoin" },
  { id: "gusd", category: "stablecoin" },
  { id: "societe-generale-forge-eurcv", category: "stablecoin" },
  { id: "edgex", category: "defi" },
  { id: "derive", category: "defi" },
  { id: "backpack", category: "exchange" },
  { id: "bitmart-token", category: "exchange" },
  { id: "meta-2-2", category: "defi" },
  { id: "railgun", category: "privacy" },
  { id: "story-2", category: "infrastructure" },
  { id: "temple", category: "defi" },
  // Recognizable eligibles below the baseline rank cutoff — reported as
  // capacity-cutoff, not substitutions. Includes the proposal-only entries
  // vacated by the 12C-1B1.1 and 12C-1B1.2 swaps.
  { id: "vvs-finance", category: "defi" },
  { id: "funfair", category: "gaming" },
  { id: "concordium", category: "smart-contract" },
  { id: "pharos-network", category: "smart-contract" },
  { id: "ontology", category: "smart-contract" },
  { id: "xyo-network", category: "depin" },
];
