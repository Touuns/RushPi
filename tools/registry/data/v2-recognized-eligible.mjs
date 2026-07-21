// Recognizable, identity-verified assets from the frozen top-500 capture that
// are NOT selected into the 250-entry proposal (Phase 12C-1B1.1).
//
// These define the eligible universe together with the selected entries: the
// rank-based baseline is built from (V1 + selected + these). Every OTHER
// non-V1 capture asset is treated as hard-excluded (tokenized security/fund/
// commodity, wrapped/bridged/duplicate, inactive, or — the catch-all for the
// unrecognized long tail — identity-not-sufficiently-verified).
//
// Splitting them out (rather than defaulting the whole tail to "capacity")
// keeps the baseline free of obscure micro-stablecoins / unidentifiable
// microcaps, so the difference between the proposal and the baseline is a
// small, honest set of true diversity substitutions (<=30) rather than ~80.
//
// `category` is the canonical V2 category used only for reporting the displaced
// side of a substitution (these assets are not in the catalog).
export const V2_RECOGNIZED_ELIGIBLE = [
  // Higher-ranked eligibles deliberately displaced for category diversity
  // (paired 1:1 with a retained lower-ranked pick in data/v2-substitutions.mjs).
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
  { id: "lorenzo-protocol", category: "liquid-staking" },
  { id: "backpack", category: "exchange" },
  { id: "bitmart-token", category: "exchange" },
  { id: "meta-2-2", category: "defi" },
  { id: "railgun", category: "privacy" },
  { id: "story-2", category: "infrastructure" },
  { id: "zama", category: "privacy" },
  { id: "proton", category: "payments" },
  { id: "temple", category: "defi" },
  { id: "stronghold-token", category: "payments" },
  // Recognizable eligibles below the baseline rank cutoff (proposal-only
  // entries vacated by the 12C-1B1.1 swap) — reported as capacity-cutoff, not
  // substitutions, because they do not fall inside the top-214 baseline fill.
  { id: "vvs-finance", category: "defi" },
  { id: "funfair", category: "gaming" },
];
