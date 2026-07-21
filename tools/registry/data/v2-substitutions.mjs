// True discretionary diversity substitutions for the V2 proposal
// (Phase 12C-1B1.1): higher-ranked ELIGIBLE assets deliberately displaced so a
// lower-ranked, distinct-category asset could be kept for category coverage.
//
// This is NOT the tail-fill of the rank baseline and NOT a hard exclusion — it
// is the small set of deliberate deviations from the rank-based baseline. The
// build pairs each displaced asset 1:1, by rank order, with one retained
// lower-ranked selection (the "selected" side), records the rank delta, and
// writes each displaced asset into exclusions.json with
// reasonCode = "diversity-substitution". Must be <= 30 (see MAX in validateV2).
//
// rationaleCode is a controlled vocabulary:
//   stablecoin-overweight-avoidance | redundant-subsector |
//   category-coverage | identity-ambiguity-preference
export const V2_DIVERSITY_SUBSTITUTIONS = [
  { displacedId: "usd1-wlfi", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin; the curated stablecoin allocation is already met, so a distinct-category asset was kept over another near-identical dollar token." },
  { displacedId: "global-dollar", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin; kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "falcon-finance", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin (Falcon USD); kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "bfusd", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin; kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "usdtb", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin; kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "agora-dollar", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin (AUSD); kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "gusd", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged stablecoin (Gemini dollar); kept a distinct-category asset rather than over-weighting dollar tokens." },
  { displacedId: "societe-generale-forge-eurcv", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Fiat-pegged EUR stablecoin; kept a distinct-category asset rather than over-weighting pegged tokens." },
  { displacedId: "aster-2", rationaleCode: "redundant-subsector", explanation: "Perpetuals DEX; the derivatives-DEX subsector is already represented (Hyperliquid, dYdX, GMX), so a distinct-category asset was kept." },
  { displacedId: "lighter", rationaleCode: "redundant-subsector", explanation: "Perpetuals DEX; derivatives-DEX subsector already represented, so a distinct-category asset was kept." },
  { displacedId: "edgex", rationaleCode: "redundant-subsector", explanation: "Perpetuals DEX; derivatives-DEX subsector already represented, so a distinct-category asset was kept." },
  { displacedId: "derive", rationaleCode: "redundant-subsector", explanation: "On-chain options DEX; derivatives subsector already represented, so a distinct-category asset was kept." },
  { displacedId: "backpack", rationaleCode: "redundant-subsector", explanation: "Exchange/venue token; the exchange category is already well represented, so a distinct-category asset was kept." },
  { displacedId: "bitmart-token", rationaleCode: "redundant-subsector", explanation: "Exchange token; the exchange category is already well represented, so a distinct-category asset was kept." },
  { displacedId: "world-liberty-financial", rationaleCode: "redundant-subsector", explanation: "DeFi platform/governance token; DeFi is the deepest category, so a distinct-category asset was kept." },
  { displacedId: "olympus", rationaleCode: "redundant-subsector", explanation: "DeFi governance/treasury token; DeFi already deeply represented, so a distinct-category asset was kept." },
  { displacedId: "meta-2-2", rationaleCode: "redundant-subsector", explanation: "DeFi/governance (MetaDAO); DeFi already deeply represented, so a distinct-category asset was kept." },
  { displacedId: "temple", rationaleCode: "redundant-subsector", explanation: "DeFi (TempleDAO); DeFi already deeply represented, so a distinct-category asset was kept." },
  { displacedId: "venice-token", rationaleCode: "redundant-subsector", explanation: "AI-sector token; AI already represented, so a lower-ranked distinct-category asset was kept." },
  { displacedId: "kite-2", rationaleCode: "redundant-subsector", explanation: "AI/payments agent token; AI already represented, so a distinct-category asset was kept." },
  { displacedId: "doublezero", rationaleCode: "redundant-subsector", explanation: "DePIN token; DePIN already deeply represented, so a distinct-category asset was kept." },
  { displacedId: "lorenzo-protocol", rationaleCode: "redundant-subsector", explanation: "Liquid-staking (BTC); liquid-staking already represented (Lido, Jito, Ether.fi, Babylon, Lombard), so a distinct-category asset was kept." },
  { displacedId: "proton", rationaleCode: "redundant-subsector", explanation: "Payments network token (XPR); payments already represented, so a distinct-category asset was kept." },
  { displacedId: "stronghold-token", rationaleCode: "redundant-subsector", explanation: "Payments token (Stellar SHX); payments already represented, so a distinct-category asset was kept." },
  { displacedId: "memecore", rationaleCode: "redundant-subsector", explanation: "Meme L1; the meme category is already curated, so a distinct-category asset was kept." },
  { displacedId: "hash-2", rationaleCode: "category-coverage", explanation: "RWA L1 (Provenance); RWA already represented (Ondo, Centrifuge, Plume, Polymesh, Creditcoin), so a distinct-category asset was kept." },
  { displacedId: "midnight-3", rationaleCode: "category-coverage", explanation: "Privacy chain; privacy already represented by retained assets, so a distinct-category asset was kept over over-weighting one sector." },
  { displacedId: "railgun", rationaleCode: "category-coverage", explanation: "Privacy protocol; privacy already represented by retained assets, so a distinct-category asset was kept." },
  { displacedId: "zama", rationaleCode: "category-coverage", explanation: "Privacy/FHE protocol; privacy already represented by retained assets, so a distinct-category asset was kept." },
  { displacedId: "story-2", rationaleCode: "identity-ambiguity-preference", explanation: "Provider identity is an ambiguous rebrand (symbol DATA, name 'Data Network'); preferred clearer-identity assets." },
];
