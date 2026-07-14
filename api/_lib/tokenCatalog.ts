/**
 * Approved token catalog (Phase 11A). SERVER-SIDE WHITELIST: the market
 * endpoints only ever request these CoinGecko IDs — a client can never choose
 * arbitrary IDs (no open CoinGecko proxy). IDs were validated against
 * /coins/markets (all 36 return a finite price + HTTPS image).
 *
 * CoinGecko ID is the functional primary key; symbols are display-only and can
 * collide. Category + enabled flags are groundwork for future phases (Daily
 * Token Rush / blockchain Campaign) — nothing uses them in gameplay yet.
 */
export type TokenCategory =
  | "store-of-value"
  | "smart-contract"
  | "payments"
  | "layer-2"
  | "interoperability"
  | "stablecoin"
  | "meme"
  | "privacy"
  | "defi";

export interface TokenCatalogEntry {
  id: string;
  preferredSymbol: string;
  category: TokenCategory;
  enabledForDaily: boolean;
  enabledForCampaign: boolean;
}

const entry = (
  id: string,
  preferredSymbol: string,
  category: TokenCategory,
): TokenCatalogEntry => ({
  id,
  preferredSymbol,
  category,
  enabledForDaily: true,
  enabledForCampaign: true,
});

export const TOKEN_CATALOG: TokenCatalogEntry[] = [
  entry("bitcoin", "BTC", "store-of-value"),
  entry("ethereum", "ETH", "smart-contract"),
  entry("ripple", "XRP", "payments"),
  entry("tether", "USDT", "stablecoin"),
  entry("binancecoin", "BNB", "smart-contract"),
  entry("solana", "SOL", "smart-contract"),
  entry("usd-coin", "USDC", "stablecoin"),
  entry("dogecoin", "DOGE", "meme"),
  entry("cardano", "ADA", "smart-contract"),
  entry("tron", "TRX", "smart-contract"),
  entry("stellar", "XLM", "payments"),
  entry("chainlink", "LINK", "interoperability"),
  entry("avalanche-2", "AVAX", "smart-contract"),
  entry("litecoin", "LTC", "store-of-value"),
  entry("polkadot", "DOT", "interoperability"),
  entry("monero", "XMR", "privacy"),
  entry("dai", "DAI", "stablecoin"),
  entry("uniswap", "UNI", "defi"),
  entry("near", "NEAR", "smart-contract"),
  entry("aptos", "APT", "smart-contract"),
  entry("sui", "SUI", "smart-contract"),
  entry("internet-computer", "ICP", "smart-contract"),
  entry("aave", "AAVE", "defi"),
  entry("shiba-inu", "SHIB", "meme"),
  entry("pepe", "PEPE", "meme"),
  entry("cosmos", "ATOM", "interoperability"),
  entry("arbitrum", "ARB", "layer-2"),
  entry("optimism", "OP", "layer-2"),
  entry("polygon-ecosystem-token", "POL", "layer-2"),
  entry("filecoin", "FIL", "smart-contract"),
  entry("hedera-hashgraph", "HBAR", "smart-contract"),
  entry("vechain", "VET", "smart-contract"),
  entry("algorand", "ALGO", "smart-contract"),
  entry("the-graph", "GRT", "defi"),
  entry("injective-protocol", "INJ", "defi"),
  entry("render-token", "RENDER", "defi"),
];

/** Comma-separated, stable-order id list for the /coins/markets request. */
export function approvedIdsParam(): string {
  return TOKEN_CATALOG.map((t) => t.id).join(",");
}
