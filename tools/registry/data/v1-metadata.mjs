// Hand-authored V1 freeze metadata: the deterministic mapping from each
// legacy CoinGecko ID (api/_lib/tokenCatalog.ts) to a stable Rush Pi tokenId,
// plus the additional canonical fields the legacy catalog does not carry
// (display name, slug, eligibilityTier, assetClass). tokenId values are
// literal strings — never computed from array position — so reordering this
// list can never change a published tokenId.
//
// eligibilityTier: "anchor" for the two guaranteed Daily Token Rush picks
// (see GUARANTEED_IDS in api/_lib/dailyTokenChallenge.ts), "core" for the
// remaining 34 — all 36 are enabledForDaily today, so none are "excluded".
// assetClass: none of the 36 are wrapped/bridged assets.
export const V1_TOKEN_METADATA = [
  { id: "bitcoin", tokenId: "rpt-0001", name: "Bitcoin", slug: "bitcoin", eligibilityTier: "anchor", assetClass: "native" },
  { id: "ethereum", tokenId: "rpt-0002", name: "Ethereum", slug: "ethereum", eligibilityTier: "anchor", assetClass: "native" },
  { id: "ripple", tokenId: "rpt-0003", name: "XRP", slug: "xrp", eligibilityTier: "core", assetClass: "native" },
  { id: "tether", tokenId: "rpt-0004", name: "Tether", slug: "tether", eligibilityTier: "core", assetClass: "stablecoin" },
  { id: "binancecoin", tokenId: "rpt-0005", name: "BNB", slug: "bnb", eligibilityTier: "core", assetClass: "native" },
  { id: "solana", tokenId: "rpt-0006", name: "Solana", slug: "solana", eligibilityTier: "core", assetClass: "native" },
  { id: "usd-coin", tokenId: "rpt-0007", name: "USDC", slug: "usd-coin", eligibilityTier: "core", assetClass: "stablecoin" },
  { id: "dogecoin", tokenId: "rpt-0008", name: "Dogecoin", slug: "dogecoin", eligibilityTier: "core", assetClass: "meme" },
  { id: "cardano", tokenId: "rpt-0009", name: "Cardano", slug: "cardano", eligibilityTier: "core", assetClass: "native" },
  { id: "tron", tokenId: "rpt-0010", name: "TRON", slug: "tron", eligibilityTier: "core", assetClass: "native" },
  { id: "stellar", tokenId: "rpt-0011", name: "Stellar", slug: "stellar", eligibilityTier: "core", assetClass: "native" },
  { id: "chainlink", tokenId: "rpt-0012", name: "Chainlink", slug: "chainlink", eligibilityTier: "core", assetClass: "token" },
  { id: "avalanche-2", tokenId: "rpt-0013", name: "Avalanche", slug: "avalanche", eligibilityTier: "core", assetClass: "native" },
  { id: "litecoin", tokenId: "rpt-0014", name: "Litecoin", slug: "litecoin", eligibilityTier: "core", assetClass: "native" },
  { id: "polkadot", tokenId: "rpt-0015", name: "Polkadot", slug: "polkadot", eligibilityTier: "core", assetClass: "native" },
  { id: "monero", tokenId: "rpt-0016", name: "Monero", slug: "monero", eligibilityTier: "core", assetClass: "native" },
  { id: "dai", tokenId: "rpt-0017", name: "Dai", slug: "dai", eligibilityTier: "core", assetClass: "stablecoin" },
  { id: "uniswap", tokenId: "rpt-0018", name: "Uniswap", slug: "uniswap", eligibilityTier: "core", assetClass: "token" },
  { id: "near", tokenId: "rpt-0019", name: "NEAR Protocol", slug: "near-protocol", eligibilityTier: "core", assetClass: "native" },
  { id: "aptos", tokenId: "rpt-0020", name: "Aptos", slug: "aptos", eligibilityTier: "core", assetClass: "native" },
  { id: "sui", tokenId: "rpt-0021", name: "Sui", slug: "sui", eligibilityTier: "core", assetClass: "native" },
  { id: "internet-computer", tokenId: "rpt-0022", name: "Internet Computer", slug: "internet-computer", eligibilityTier: "core", assetClass: "native" },
  { id: "aave", tokenId: "rpt-0023", name: "Aave", slug: "aave", eligibilityTier: "core", assetClass: "token" },
  { id: "shiba-inu", tokenId: "rpt-0024", name: "Shiba Inu", slug: "shiba-inu", eligibilityTier: "core", assetClass: "meme" },
  { id: "pepe", tokenId: "rpt-0025", name: "Pepe", slug: "pepe", eligibilityTier: "core", assetClass: "meme" },
  { id: "cosmos", tokenId: "rpt-0026", name: "Cosmos Hub", slug: "cosmos-hub", eligibilityTier: "core", assetClass: "native" },
  { id: "arbitrum", tokenId: "rpt-0027", name: "Arbitrum", slug: "arbitrum", eligibilityTier: "core", assetClass: "token" },
  { id: "optimism", tokenId: "rpt-0028", name: "Optimism", slug: "optimism", eligibilityTier: "core", assetClass: "token" },
  { id: "polygon-ecosystem-token", tokenId: "rpt-0029", name: "POL (ex-MATIC)", slug: "polygon", eligibilityTier: "core", assetClass: "token" },
  { id: "filecoin", tokenId: "rpt-0030", name: "Filecoin", slug: "filecoin", eligibilityTier: "core", assetClass: "native" },
  { id: "hedera-hashgraph", tokenId: "rpt-0031", name: "Hedera", slug: "hedera", eligibilityTier: "core", assetClass: "native" },
  { id: "vechain", tokenId: "rpt-0032", name: "VeChain", slug: "vechain", eligibilityTier: "core", assetClass: "native" },
  { id: "algorand", tokenId: "rpt-0033", name: "Algorand", slug: "algorand", eligibilityTier: "core", assetClass: "native" },
  { id: "the-graph", tokenId: "rpt-0034", name: "The Graph", slug: "the-graph", eligibilityTier: "core", assetClass: "token" },
  { id: "injective-protocol", tokenId: "rpt-0035", name: "Injective", slug: "injective", eligibilityTier: "core", assetClass: "native" },
  { id: "render-token", tokenId: "rpt-0036", name: "Render", slug: "render", eligibilityTier: "core", assetClass: "token" },
];
