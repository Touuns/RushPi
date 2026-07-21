// Explicit, human-curated diversity-substitution pairs for the V2 proposal
// (Phase 12C-1B1.2). Each pair names BOTH a specific retained selection and
// the specific higher-ranked eligible asset it was chosen over — NOT produced
// by sorting the two sets by rank and zipping them together.
//
// The build validates these explicit pairs against the computed baseline sets
// (selectedId must be a proposal entry outside the baseline; displacedId must
// be a baseline member outside the proposal; selectedRank > displacedRank; the
// pairs must exactly cover both sets; no id may repeat) and writes each
// displacedId into exclusions.json with reasonCode "diversity-substitution".
//
// rationaleCode vocabulary + rules (enforced in lib/validateV2.mjs):
//   stablecoin-overweight-avoidance : displaced is a stablecoin, selected is not.
//   category-coverage               : selected category is less represented than
//                                     the displaced category (or a concrete
//                                     missing subcategory is named).
//   redundant-subsector             : same broad category; the explanation names
//                                     the displaced subsector already covered AND
//                                     the distinct value of the selected token.
//   identity-ambiguity-preference   : displaced identity is ambiguous; selected
//                                     identity is verified.
export const V2_DIVERSITY_SUBSTITUTIONS = [
  // --- stablecoin-overweight-avoidance (8): keep a distinctly-priced asset
  // over a 16th+ near-identical fiat-pegged token (stablecoins already 15). ---
  { selectedId: "zilliqa", displacedId: "usd1-wlfi", rationaleCode: "stablecoin-overweight-avoidance", explanation: "USD1 is a fiat-pegged dollar token (stablecoins already number 15, all ~$1); Zilliqa is a distinctly-priced smart-contract L1 that adds real price movement for the game." },
  { selectedId: "kava", displacedId: "global-dollar", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Global Dollar (USDG) is another ~$1 peg; Kava, a Cosmos-based smart-contract L1, contributes independent price action instead of a redundant stablecoin." },
  { selectedId: "astar", displacedId: "falcon-finance", rationaleCode: "stablecoin-overweight-avoidance", explanation: "Falcon USD (USDF) is a pegged dollar token; Astar, a Polkadot/EVM smart-contract L1, adds distinct price behaviour the stablecoin cannot." },
  { selectedId: "flow", displacedId: "bfusd", rationaleCode: "stablecoin-overweight-avoidance", explanation: "BFUSD is a pegged dollar token; Flow is a consumer/NFT smart-contract L1 with its own price dynamics, avoiding another flat ~$1 entry." },
  { selectedId: "nervos-network", displacedId: "usdtb", rationaleCode: "stablecoin-overweight-avoidance", explanation: "USDtb is a pegged dollar token; Nervos (CKB) is a PoW smart-contract L1 whose independent price is more useful than a 16th stablecoin." },
  { selectedId: "degen-base", displacedId: "agora-dollar", rationaleCode: "stablecoin-overweight-avoidance", explanation: "AUSD is a pegged dollar token; Degen is a volatile Base-ecosystem culture token whose large price swings add game diversity a stablecoin cannot." },
  { selectedId: "toshi", displacedId: "gusd", rationaleCode: "stablecoin-overweight-avoidance", explanation: "GUSD (Gemini dollar) is a ~$1 peg; Toshi is a volatile Base meme with distinct price action, preferred over an additional stablecoin." },
  { selectedId: "popcat", displacedId: "societe-generale-forge-eurcv", rationaleCode: "stablecoin-overweight-avoidance", explanation: "EURCV is a fiat-pegged EUR token; Popcat is a highly volatile Solana meme, adding price variance a pegged token cannot." },

  // --- redundant-subsector (7): same broad category, displaced subsector
  // already covered, selected supplies a distinct subsector/value. ---
  { selectedId: "venus", displacedId: "aster-2", rationaleCode: "redundant-subsector", explanation: "Aster is a perpetuals DEX, a subsector already covered by Hyperliquid, dYdX and GMX; Venus supplies the distinct cross-chain money-market lending subsector." },
  { selectedId: "deep", displacedId: "lighter", rationaleCode: "redundant-subsector", explanation: "Lighter is another perpetuals DEX (subsector already covered); DeepBook supplies a Sui central-limit-orderbook DEX primitive, a distinct DeFi subsector." },
  { selectedId: "sushi", displacedId: "edgex", rationaleCode: "redundant-subsector", explanation: "edgeX is a perpetuals DEX (subsector already covered); Sushi is an established multichain AMM/spot DEX, a different DeFi subsector." },
  { selectedId: "holoworld", displacedId: "venice-token", rationaleCode: "redundant-subsector", explanation: "Venice covers the AI inference-marketplace subsector; Holoworld supplies the distinct AI-agent / virtual-being creation subsector within the same AI category." },
  { selectedId: "oasis-network", displacedId: "midnight-3", rationaleCode: "redundant-subsector", explanation: "Midnight is a ZK privacy sidechain; shielded/ZK privacy is already represented (Zcash, Monero). Oasis adds the distinct confidential-compute (TEE ParaTimes) privacy subsector." },
  { selectedId: "pirate-chain", displacedId: "railgun", rationaleCode: "redundant-subsector", explanation: "Railgun is an on-chain privacy system on existing chains (subsector represented); Pirate Chain adds a fully-shielded standalone PoW privacy L1." },
  { selectedId: "peaq-2", displacedId: "doublezero", rationaleCode: "redundant-subsector", explanation: "DoubleZero is a DePIN fiber/transport network; peaq supplies the distinct machine-economy DePIN L1 subsector rather than another connectivity network." },

  // --- category-coverage (10): selected category is thinner than the displaced
  // category, so the swap widens coverage. ---
  { selectedId: "synapse-2", displacedId: "derive", rationaleCode: "category-coverage", explanation: "Derive is a DeFi options venue and DeFi is already the second-deepest category (41); Synapse instead reinforces the thinner interoperability category (11)." },
  { selectedId: "polymesh", displacedId: "world-liberty-financial", rationaleCode: "category-coverage", explanation: "World Liberty Financial is a DeFi platform token (DeFi at 41); Polymesh strengthens the far thinner RWA category (6) as a regulated security-token L1." },
  { selectedId: "creditcoin-2", displacedId: "olympus", rationaleCode: "category-coverage", explanation: "Olympus is a DeFi reserve/treasury token (DeFi at 41); Creditcoin strengthens the thin RWA category (6) with on-chain credit rails." },
  { selectedId: "lombard-protocol", displacedId: "meta-2-2", rationaleCode: "category-coverage", explanation: "MetaDAO is a DeFi governance token (DeFi at 41); Lombard strengthens the thin liquid-staking category (6) with BTC LST." },
  { selectedId: "blur", displacedId: "temple", rationaleCode: "category-coverage", explanation: "TempleDAO is a DeFi token (DeFi at 41); Blur strengthens the very thin social/NFT-marketplace category (4)." },
  { selectedId: "redstone-oracles", displacedId: "kite-2", rationaleCode: "category-coverage", explanation: "Kite is an AI token (AI at 11); RedStone strengthens the much thinner oracle category (3) with a modular price-feed oracle." },
  { selectedId: "tellor", displacedId: "hash-2", rationaleCode: "category-coverage", explanation: "Provenance (HASH) is an RWA L1 (RWA at 6); Tellor strengthens the thinnest utility category, oracles (3), with a decentralized dispute-based oracle." },
  { selectedId: "ronin", displacedId: "memecore", rationaleCode: "category-coverage", explanation: "MemeCore is a meme-focused L1 (meme at 20); Ronin instead reinforces the thinner dedicated-gaming category (12) as a games-first L1." },
  { selectedId: "movement", displacedId: "backpack", rationaleCode: "category-coverage", explanation: "Backpack is an exchange token (exchange at 11, already 11 venues); Movement reinforces the thinner layer-2 category (9) as a Move-VM rollup." },
  { selectedId: "altlayer", displacedId: "bitmart-token", rationaleCode: "category-coverage", explanation: "BitMart is an exchange token (exchange at 11); AltLayer reinforces the thinner layer-2 category (9) with restaked-rollup infrastructure." },

  // --- identity-ambiguity-preference (1) ---
  { selectedId: "espresso", displacedId: "story-2", rationaleCode: "identity-ambiguity-preference", explanation: "story-2 has an ambiguous provider identity (symbol DATA, name 'Data Network' — an unclear rebrand); Espresso is a verified shared-sequencing infrastructure token, so the clearer identity is kept." },
];
