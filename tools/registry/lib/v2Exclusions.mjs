// Deterministic exclusion classifier for the V2 catalog PROPOSAL
// (Phase 12C-1B1). Given a frozen provider-capture row that was NOT selected,
// returns a controlled reason code + a short neutral explanation, and, where
// applicable, the underlying asset id (for wrapped/duplicate forms) and an
// evidence reference (for manually reviewed / ambiguous decisions).
//
// No network access, no current time — pure function of the frozen row, so the
// exclusions artifact is byte-identical across builds. Reason codes are the
// controlled vocabulary from the phase brief; nothing here labels a project a
// scam — uncertain identity uses the neutral `identity-not-sufficiently-verified`.

export const REASON_CODES = new Set([
  "wrapped-or-bridged",
  "duplicate-underlying",
  "leveraged-or-derivative",
  "inactive-or-abandoned",
  "missing-market-data",
  "identity-not-sufficiently-verified",
  "unsupported-asset-form",
  "lower-priority-capacity-cutoff",
  "diversity-substitution",
]);

// Explicit, manually reviewed decisions keyed by CoinGecko id. These override
// the rule-based buckets below. underlyingAssetId is set when the exclusion is
// caused by wrapping/duplication of another asset.
const OVERRIDES = {
  // Wrapped / bridged / duplicate representations of an underlying asset.
  "dai-on-pulsechain": { reasonCode: "duplicate-underlying", underlyingAssetId: "dai", note: "PulseChain representation of DAI — duplicate of the underlying asset." },
  "xdai": { reasonCode: "duplicate-underlying", underlyingAssetId: "dai", note: "Gnosis Chain bridged representation of DAI." },
  "alloy-tether": { reasonCode: "wrapped-or-bridged", underlyingAssetId: "tether", note: "Alloy (aUSDT) is a wrapped representation of Tether." },
  "wrappedm-by-m0": { reasonCode: "wrapped-or-bridged", underlyingAssetId: null, note: "Wrapped representation of the M0 token." },
  "lido-earn-eth": { reasonCode: "wrapped-or-bridged", underlyingAssetId: "ethereum", note: "Staking-receipt wrapper over ETH, not an independent asset." },
  "spark-usdc": { reasonCode: "wrapped-or-bridged", underlyingAssetId: "usd-coin", note: "Yield-bearing receipt wrapper over USDC." },
  // Tokenized RWA products / equity derivatives (identity tracks a real-world
  // instrument), missed by the generic buckets because their names are opaque.
  "figure-heloc": { reasonCode: "unsupported-asset-form", underlyingAssetId: null, note: "Tokenized home-equity line of credit (RWA security), not a crypto-native asset." },
  "hastra-prime": { reasonCode: "unsupported-asset-form", underlyingAssetId: null, note: "Tokenized RWA yield product, not a crypto-native asset." },
  "alpha-bulgaria-warrants": { reasonCode: "leveraged-or-derivative", underlyingAssetId: null, note: "Tokenized warrants — an equity derivative, not a crypto-native asset." },
  // Inactive / superseded.
  "terra-luna": { reasonCode: "inactive-or-abandoned", underlyingAssetId: null, note: "Terra Luna Classic — collapsed/legacy network, not an active selection." },
  "frax": { reasonCode: "inactive-or-abandoned", underlyingAssetId: "frax-usd", note: "Legacy Frax Dollar, superseded by Frax USD (frxUSD)." },
  // Identity/status not verifiable to catalog confidence within scope.
  "pi-network": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Open transferability/mainnet status not verifiable from primary sources.", evidenceReference: "official-project-status-review" },
  "diem": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Name collides with the discontinued Diem project; current identity unresolved.", evidenceReference: "provider-metadata-review" },
  "a7a5": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Opaque identity; project cannot be confidently resolved." },
  "adi-token": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Ambiguous ticker/identity, not confidently resolved." },
  "bianrensheng": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Non-canonical name/symbol; identity not confidently resolved." },
  "would": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Identity not confidently resolved." },
  "coco-2": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Identity not confidently resolved." },
  "smilek": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Identity not confidently resolved." },
  "antfun": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Identity not confidently resolved." },
  "asset": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Symbol/name mismatch (ASSET/REAL); identity not confidently resolved." },
  "up-2": { reasonCode: "identity-not-sufficiently-verified", underlyingAssetId: null, note: "Identity not confidently resolved." },
};

function matchAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

// Tokenized equities / ETFs / equity-index baskets.
function isTokenizedEquity(id, name) {
  return (
    matchAny(id, [/xstock/, /bstock/, /tokenized-stock/, /tokenized-etf/, /ondo-tokenized/, /-ssi$/]) ||
    matchAny(name, [/xstock/i, /bstock/i, /tokenized stock/i, /tokenized etf/i, /tokenized\)/i, /\.ssi\b/i])
  );
}

// Tokenized funds: T-bills, money-market, CLO/credit, digital-liquidity,
// reinsurance, digital-interest — tokenized securities, not crypto-native.
function isTokenizedFund(id, name, symbol) {
  const fundSymbols = new Set([
    "BUIDL", "USYC", "USDY", "OUSG", "VBILL", "JTRSY", "JAAA", "USTB", "USTBL",
    "THBILL", "ACRED", "ACRDX", "STAC", "FDIT", "FIUSD", "FILQ-A", "MF-ONE",
    "MTBILL", "MHYPER", "MGLOBAL", "YLDS", "BCAP", "EUTBL", "EURSAFO", "SAFO", "FIDD",
  ]);
  if (fundSymbols.has(symbol)) return true;
  if (matchAny(id, [/^midas-/, /^janus-henderson/, /^spiko-/, /^anemoy-/, /^superstate-/, /securitize/, /liquidity-fund/, /treasury-fund/, /credit-securitize/])) return true;
  return matchAny(name, [
    /treasury/i, /t-bill/i, /\btbill\b/i, /money market/i, /clo fund/i,
    /government securit/i, /digital liquidity/i, /liquidity fund/i, /securitize/i,
    /institutional digital/i, /overnight swap/i, /credit fund/i, /reinsurance/i,
    /digital interest/i, /digital dollar/i,
  ]);
}

// Tradable private-credit receivables (PC0000xx / "... SSTN|SSTL|SSL").
function isTokenizedReceivable(id, symbol) {
  return /^PC\d{3,}/i.test(symbol) || /^tradable-/.test(id) || /-sstn$|-sstl$|-ssl$|-ssl-\d+$/.test(id) || /^na-.*receivables/.test(id);
}

// Tokenized commodities (gold/silver/precious metals) — identity tracks an
// external real-world asset price.
function isTokenizedCommodity(name, symbol) {
  const commoditySymbols = new Set(["XAUT", "PAXG", "KAU", "KAG", "XAUM", "PGOLD", "PMUSD"]);
  if (commoditySymbols.has(symbol)) return true;
  return matchAny(name, [/\bgold\b/i, /\bsilver\b/i, /precious metal/i]);
}

// Fiat-pegged stablecoins beyond the curated stablecoin allocation.
function isFiatPeggedStable(name, symbol) {
  const stableSymbols = new Set([
    "USD1", "USDG", "USDF", "BFUSD", "USDGO", "STABLE", "USX", "USDTB", "AUSD",
    "GUSD", "EURCV", "AVUSD", "USDAT", "UUSD", "USDA", "USDX", "USDAI", "USDU",
    "DUSD", "IUSD", "CUSD", "CGUSD", "NUSD", "FEUSD", "FXUSD", "FXSAVE", "MSUSD",
    "JUPUSD", "APXUSD", "APYUSD", "USDON", "STAU", "BRLV", "BRZ", "JPYC", "DOLA",
    "ZCHF", "REUSD", "U", "USDKG", "SUSDC",
  ]);
  if (stableSymbols.has(symbol)) return true;
  return matchAny(name, [/\busd\b/i, /dollar/i, /stable/i, /\beur\b/i]);
}

/**
 * Classify one excluded provider-capture row.
 * @param {{id:string,name:string,symbol:string,marketCapRank:number|null,marketCap:number|null}} row
 * @returns {{reasonCode:string,explanation:string,underlyingAssetId:string|null,evidenceReference:string|null}}
 */
export function classifyExclusion(row) {
  const id = row.id;
  const name = row.name ?? "";
  const symbol = (row.symbol ?? "").toUpperCase();

  if (Object.prototype.hasOwnProperty.call(OVERRIDES, id)) {
    const o = OVERRIDES[id];
    return {
      reasonCode: o.reasonCode,
      explanation: o.note,
      underlyingAssetId: o.underlyingAssetId ?? null,
      evidenceReference: o.evidenceReference ?? null,
    };
  }

  if (isTokenizedEquity(id, name)) {
    return { reasonCode: "unsupported-asset-form", explanation: "Tokenized equity/ETF (security); out of scope for a crypto-native catalog.", underlyingAssetId: null, evidenceReference: null };
  }
  if (isTokenizedReceivable(id, symbol)) {
    return { reasonCode: "unsupported-asset-form", explanation: "Tokenized private-credit receivable (security); not a crypto-native asset.", underlyingAssetId: null, evidenceReference: null };
  }
  if (isTokenizedFund(id, name, symbol)) {
    return { reasonCode: "unsupported-asset-form", explanation: "Tokenized fund / money-market / credit security share; not a crypto-native asset.", underlyingAssetId: null, evidenceReference: null };
  }
  if (isTokenizedCommodity(name, symbol)) {
    return { reasonCode: "unsupported-asset-form", explanation: "Tokenized commodity; identity tracks an external real-world asset price.", underlyingAssetId: null, evidenceReference: null };
  }
  if (isFiatPeggedStable(name, symbol)) {
    return { reasonCode: "lower-priority-capacity-cutoff", explanation: "Additional fiat-pegged stablecoin beyond the curated stablecoin allocation.", underlyingAssetId: null, evidenceReference: null };
  }
  if (row.marketCap === null || row.marketCapRank === null) {
    return { reasonCode: "missing-market-data", explanation: "No reliable current market data in the provider snapshot.", underlyingAssetId: null, evidenceReference: null };
  }
  // Default: a candidate not selected under the fixed 250-entry capacity. This
  // is a neutral non-selection, not a quality judgement.
  return { reasonCode: "lower-priority-capacity-cutoff", explanation: "Not selected under the fixed 250-entry capacity / lower selection priority.", underlyingAssetId: null, evidenceReference: null };
}
