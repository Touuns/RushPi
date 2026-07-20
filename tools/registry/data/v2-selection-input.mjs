// Hand-authored curation input for the V2 250-token catalog PROPOSAL
// (Phase 12C-1B1). This file lists the NEW entries (beyond the 36 frozen V1
// tokens) selected from the CoinGecko top-500 capture. It carries NO tokenId:
// gen-v2-metadata.mjs freezes explicit literal tokenIds (rpt-0037+) into
// data/v2-metadata.mjs, which is the committed source of truth the build reads.
// tokenIds are therefore authored literals, never derived at runtime.
//
// Selection policy (see README):
//  1. all 36 V1 assets are preserved verbatim (not listed here);
//  2. a strong rank-based crypto-native foundation from the top 500;
//  3. prohibited/duplicate asset forms removed (wrapped, bridged, LP,
//     leveraged, tokenized stocks/funds, tokenized commodities, duplicates);
//  4. a controlled number of diversity picks from ranks 251-500 to widen
//     category coverage rather than mirroring the raw market-cap ranking.
//
// category uses the V2 canonical registry enum (registry-only; the legacy
// runtime TokenCategory is untouched). assetClass uses the existing contract.
// `id` is the CoinGecko provider id from the frozen capture.
export const V2_NEW_SELECTIONS = [
  // --- Core foundation (large, stable, high identity confidence) ---
  { id: "hyperliquid", name: "Hyperliquid", symbol: "HYPE", slug: "hyperliquid", category: "defi", assetClass: "native", tier: "core" },
  { id: "the-open-network", name: "Toncoin", symbol: "TON", slug: "toncoin", category: "smart-contract", assetClass: "native", tier: "core", aliases: ["GRAM"] },
  { id: "bitcoin-cash", name: "Bitcoin Cash", symbol: "BCH", slug: "bitcoin-cash", category: "payments", assetClass: "native", tier: "core" },
  { id: "zcash", name: "Zcash", symbol: "ZEC", slug: "zcash", category: "privacy", assetClass: "native", tier: "core" },
  { id: "bittensor", name: "Bittensor", symbol: "TAO", slug: "bittensor", category: "ai", assetClass: "native", tier: "core" },
  { id: "ondo-finance", name: "Ondo", symbol: "ONDO", slug: "ondo", category: "rwa", assetClass: "token", tier: "core" },

  // --- Established: exchange tokens ---
  { id: "leo-token", name: "LEO Token", symbol: "LEO", slug: "unus-sed-leo", category: "exchange", assetClass: "token", tier: "established" },
  { id: "okb", name: "OKB", symbol: "OKB", slug: "okb", category: "exchange", assetClass: "token", tier: "established" },
  { id: "kucoin-shares", name: "KuCoin", symbol: "KCS", slug: "kucoin", category: "exchange", assetClass: "token", tier: "established" },
  { id: "gatechain-token", name: "Gate", symbol: "GT", slug: "gate", category: "exchange", assetClass: "token", tier: "established" },
  { id: "bitget-token", name: "Bitget Token", symbol: "BGB", slug: "bitget-token", category: "exchange", assetClass: "token", tier: "established" },
  { id: "whitebit", name: "WhiteBIT Coin", symbol: "WBT", slug: "whitebit", category: "exchange", assetClass: "token", tier: "established" },

  // --- Established: layer-1 / smart-contract ---
  { id: "crypto-com-chain", name: "Cronos", symbol: "CRO", slug: "cronos", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "ethereum-classic", name: "Ethereum Classic", symbol: "ETC", slug: "ethereum-classic", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "kaspa", name: "Kaspa", symbol: "KAS", slug: "kaspa", category: "store-of-value", assetClass: "native", tier: "established" },
  { id: "sei-network", name: "Sei", symbol: "SEI", slug: "sei", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "blockstack", name: "Stacks", symbol: "STX", slug: "stacks", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "tezos", name: "Tezos", symbol: "XTZ", slug: "tezos", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "elrond-erd-2", name: "MultiversX", symbol: "EGLD", slug: "multiversx", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "berachain-bera", name: "Berachain", symbol: "BERA", slug: "berachain", category: "smart-contract", assetClass: "native", tier: "established" },
  { id: "mantle", name: "Mantle", symbol: "MNT", slug: "mantle", category: "layer-2", assetClass: "token", tier: "established" },

  // --- Established: infrastructure / interoperability ---
  { id: "celestia", name: "Celestia", symbol: "TIA", slug: "celestia", category: "infrastructure", assetClass: "native", tier: "established" },
  { id: "quant-network", name: "Quant", symbol: "QNT", slug: "quant", category: "interoperability", assetClass: "token", tier: "established" },
  { id: "layerzero", name: "LayerZero", symbol: "ZRO", slug: "layerzero", category: "interoperability", assetClass: "token", tier: "established" },
  { id: "eigenlayer", name: "EigenLayer", symbol: "EIGEN", slug: "eigenlayer", category: "infrastructure", assetClass: "token", tier: "established", aliases: ["EigenCloud"] },

  // --- Established: defi / oracle / liquid-staking ---
  { id: "morpho", name: "Morpho", symbol: "MORPHO", slug: "morpho", category: "defi", assetClass: "token", tier: "established" },
  { id: "ethena", name: "Ethena", symbol: "ENA", slug: "ethena", category: "defi", assetClass: "token", tier: "established" },
  { id: "pendle", name: "Pendle", symbol: "PENDLE", slug: "pendle", category: "defi", assetClass: "token", tier: "established" },
  { id: "curve-dao-token", name: "Curve DAO", symbol: "CRV", slug: "curve-dao", category: "defi", assetClass: "token", tier: "established" },
  { id: "pancakeswap-token", name: "PancakeSwap", symbol: "CAKE", slug: "pancakeswap", category: "defi", assetClass: "token", tier: "established" },
  { id: "jupiter-exchange-solana", name: "Jupiter", symbol: "JUP", slug: "jupiter", category: "defi", assetClass: "token", tier: "established" },
  { id: "lido-dao", name: "Lido DAO", symbol: "LDO", slug: "lido-dao", category: "liquid-staking", assetClass: "token", tier: "established" },
  { id: "pyth-network", name: "Pyth Network", symbol: "PYTH", slug: "pyth-network", category: "oracle", assetClass: "token", tier: "established" },

  // --- Established: ai ---
  { id: "fetch-ai", name: "Artificial Superintelligence Alliance", symbol: "FET", slug: "asi-alliance", category: "ai", assetClass: "token", tier: "established" },
  { id: "virtual-protocol", name: "Virtuals Protocol", symbol: "VIRTUAL", slug: "virtuals-protocol", category: "ai", assetClass: "token", tier: "established" },
  { id: "worldcoin-wld", name: "Worldcoin", symbol: "WLD", slug: "worldcoin", category: "ai", assetClass: "token", tier: "established" },

  // --- Established: gaming / social ---
  { id: "immutable-x", name: "Immutable", symbol: "IMX", slug: "immutable", category: "gaming", assetClass: "token", tier: "established" },
  { id: "axie-infinity", name: "Axie Infinity", symbol: "AXS", slug: "axie-infinity", category: "gaming", assetClass: "token", tier: "established" },
  { id: "the-sandbox", name: "The Sandbox", symbol: "SAND", slug: "the-sandbox", category: "gaming", assetClass: "token", tier: "established" },
  { id: "decentraland", name: "Decentraland", symbol: "MANA", slug: "decentraland", category: "gaming", assetClass: "token", tier: "established" },

  // --- Established: memes ---
  { id: "bonk", name: "Bonk", symbol: "BONK", slug: "bonk", category: "meme", assetClass: "meme", tier: "established" },
  { id: "dogwifcoin", name: "dogwifhat", symbol: "WIF", slug: "dogwifhat", category: "meme", assetClass: "meme", tier: "established" },
  { id: "pudgy-penguins", name: "Pudgy Penguins", symbol: "PENGU", slug: "pudgy-penguins", category: "meme", assetClass: "token", tier: "established" },

  // --- Established: stablecoins (major) ---
  { id: "ethena-usde", name: "Ethena USDe", symbol: "USDE", slug: "ethena-usde", category: "stablecoin", assetClass: "stablecoin", tier: "established" },
  { id: "paypal-usd", name: "PayPal USD", symbol: "PYUSD", slug: "paypal-usd", category: "stablecoin", assetClass: "stablecoin", tier: "established" },

  // --- Discovery: privacy ---
  { id: "dash", name: "Dash", symbol: "DASH", slug: "dash", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "decred", name: "Decred", symbol: "DCR", slug: "decred", category: "store-of-value", assetClass: "native", tier: "discovery" },
  { id: "beldex", name: "Beldex", symbol: "BDX", slug: "beldex", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "zano", name: "Zano", symbol: "ZANO", slug: "zano", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "zencash", name: "Horizen", symbol: "ZEN", slug: "horizen", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "pirate-chain", name: "Pirate Chain", symbol: "ARRR", slug: "pirate-chain", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "oasis-network", name: "Oasis", symbol: "ROSE", slug: "oasis", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "mimblewimblecoin", name: "MimbleWimbleCoin", symbol: "MWC", slug: "mimblewimblecoin", category: "privacy", assetClass: "native", tier: "discovery" },
  { id: "verus-coin", name: "Verus", symbol: "VRSC", slug: "verus", category: "privacy", assetClass: "native", tier: "discovery" },

  // --- Discovery: store-of-value / payments ---
  { id: "bitcoin-cash-sv", name: "Bitcoin SV", symbol: "BSV", slug: "bitcoin-sv", category: "store-of-value", assetClass: "native", tier: "discovery" },
  { id: "ecash", name: "eCash", symbol: "XEC", slug: "ecash", category: "payments", assetClass: "native", tier: "discovery" },
  { id: "digibyte", name: "DigiByte", symbol: "DGB", slug: "digibyte", category: "payments", assetClass: "native", tier: "discovery" },
  { id: "nano", name: "Nano", symbol: "XNO", slug: "nano", category: "payments", assetClass: "native", tier: "discovery" },
  { id: "telcoin", name: "Telcoin", symbol: "TEL", slug: "telcoin", category: "payments", assetClass: "token", tier: "discovery" },
  { id: "keeta", name: "Keeta", symbol: "KTA", slug: "keeta", category: "payments", assetClass: "native", tier: "discovery" },
  { id: "velo", name: "Velo", symbol: "VELO", slug: "velo", category: "payments", assetClass: "token", tier: "discovery" },
  { id: "zebec-network", name: "Zebec Network", symbol: "ZBCN", slug: "zebec-network", category: "payments", assetClass: "token", tier: "discovery" },

  // --- Discovery: smart-contract / layer-1 ---
  { id: "flow", name: "Flow", symbol: "FLOW", slug: "flow", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "mina-protocol", name: "Mina Protocol", symbol: "MINA", slug: "mina", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "kava", name: "Kava", symbol: "KAVA", slug: "kava", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "zilliqa", name: "Zilliqa", symbol: "ZIL", slug: "zilliqa", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "qtum", name: "Qtum", symbol: "QTUM", slug: "qtum", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "neo", name: "NEO", symbol: "NEO", slug: "neo", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "ontology", name: "Ontology", symbol: "ONT", slug: "ontology", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "conflux-token", name: "Conflux", symbol: "CFX", slug: "conflux", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "astar", name: "Astar", symbol: "ASTR", slug: "astar", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "sonic-3", name: "Sonic", symbol: "S", slug: "sonic", category: "smart-contract", assetClass: "native", tier: "discovery", aliases: ["FTM", "Fantom"] },
  { id: "monad", name: "Monad", symbol: "MON", slug: "monad", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "plasma", name: "Plasma", symbol: "XPL", slug: "plasma", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "kaia", name: "Kaia", symbol: "KAIA", slug: "kaia", category: "smart-contract", assetClass: "native", tier: "discovery", aliases: ["KLAY", "Klaytn"] },
  { id: "flare-networks", name: "Flare", symbol: "FLR", slug: "flare", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "xdce-crowd-sale", name: "XDC Network", symbol: "XDC", slug: "xdc-network", category: "infrastructure", assetClass: "native", tier: "discovery" },
  { id: "nervos-network", name: "Nervos Network", symbol: "CKB", slug: "nervos", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "vaulta", name: "Vaulta", symbol: "A", slug: "vaulta", category: "smart-contract", assetClass: "native", tier: "discovery", aliases: ["EOS"] },
  { id: "gnosis", name: "Gnosis", symbol: "GNO", slug: "gnosis", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "aelf", name: "Aelf", symbol: "ELF", slug: "aelf", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "metal-blockchain", name: "Metal Blockchain", symbol: "METAL", slug: "metal-blockchain", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "concordium", name: "Concordium", symbol: "CCD", slug: "concordium", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "qubic-network", name: "Qubic", symbol: "QUBIC", slug: "qubic", category: "smart-contract", assetClass: "native", tier: "discovery" },
  { id: "quantum-resistant-ledger", name: "Quantum Resistant Ledger", symbol: "QRL", slug: "qrl", category: "infrastructure", assetClass: "native", tier: "discovery" },
  { id: "pharos-network", name: "Pharos", symbol: "PROS", slug: "pharos", category: "smart-contract", assetClass: "native", tier: "discovery" },

  // --- Discovery: interoperability / bridges ---
  { id: "kusama", name: "Kusama", symbol: "KSM", slug: "kusama", category: "interoperability", assetClass: "native", tier: "discovery" },
  { id: "zetachain", name: "ZetaChain", symbol: "ZETA", slug: "zetachain", category: "interoperability", assetClass: "native", tier: "discovery" },
  { id: "axelar", name: "Axelar", symbol: "AXL", slug: "axelar", category: "interoperability", assetClass: "token", tier: "discovery" },
  { id: "wormhole", name: "Wormhole", symbol: "W", slug: "wormhole", category: "interoperability", assetClass: "token", tier: "discovery" },
  { id: "debridge", name: "deBridge", symbol: "DBR", slug: "debridge", category: "interoperability", assetClass: "token", tier: "discovery" },
  { id: "synapse-2", name: "Synapse", symbol: "SYN", slug: "synapse", category: "interoperability", assetClass: "token", tier: "discovery" },

  // --- Discovery: layer-2 ---
  { id: "movement", name: "Movement", symbol: "MOVE", slug: "movement", category: "layer-2", assetClass: "native", tier: "discovery" },
  { id: "linea", name: "Linea", symbol: "LINEA", slug: "linea", category: "layer-2", assetClass: "token", tier: "discovery" },
  { id: "zksync", name: "ZKsync", symbol: "ZK", slug: "zksync", category: "layer-2", assetClass: "token", tier: "discovery" },
  { id: "starknet", name: "Starknet", symbol: "STRK", slug: "starknet", category: "layer-2", assetClass: "token", tier: "discovery" },
  { id: "altlayer", name: "AltLayer", symbol: "ALT", slug: "altlayer", category: "layer-2", assetClass: "token", tier: "discovery" },
  { id: "espresso", name: "Espresso", symbol: "ESP", slug: "espresso", category: "infrastructure", assetClass: "token", tier: "discovery" },

  // --- Discovery: gaming / social ---
  { id: "ronin", name: "Ronin", symbol: "RON", slug: "ronin", category: "gaming", assetClass: "native", tier: "discovery" },
  { id: "beam-2", name: "Beam", symbol: "BEAM", slug: "beam-gaming", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "gala", name: "GALA", symbol: "GALA", slug: "gala", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "enjincoin", name: "Enjin Coin", symbol: "ENJ", slug: "enjin", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "wemix-token", name: "WEMIX", symbol: "WEMIX", slug: "wemix", category: "gaming", assetClass: "native", tier: "discovery" },
  { id: "superfarm", name: "SuperVerse", symbol: "SUPER", slug: "superverse", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "nexpace", name: "Nexpace", symbol: "NXPC", slug: "nexpace", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "funfair", name: "FUNToken", symbol: "FUN", slug: "funtoken", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "rollbit-coin", name: "Rollbit Coin", symbol: "RLB", slug: "rollbit", category: "gaming", assetClass: "token", tier: "discovery" },
  { id: "chiliz", name: "Chiliz", symbol: "CHZ", slug: "chiliz", category: "social", assetClass: "native", tier: "discovery" },
  { id: "apecoin", name: "ApeCoin", symbol: "APE", slug: "apecoin", category: "social", assetClass: "token", tier: "discovery" },
  { id: "basic-attention-token", name: "Basic Attention", symbol: "BAT", slug: "basic-attention", category: "social", assetClass: "token", tier: "discovery" },
  { id: "ethereum-name-service", name: "Ethereum Name Service", symbol: "ENS", slug: "ethereum-name-service", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "blur", name: "Blur", symbol: "BLUR", slug: "blur", category: "social", assetClass: "token", tier: "discovery" },
  { id: "holoworld", name: "Holoworld", symbol: "HOLO", slug: "holoworld", category: "ai", assetClass: "token", tier: "discovery" },

  // --- Discovery: defi ---
  { id: "raydium", name: "Raydium", symbol: "RAY", slug: "raydium", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "aerodrome-finance", name: "Aerodrome Finance", symbol: "AERO", slug: "aerodrome", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "pump-fun", name: "Pump.fun", symbol: "PUMP", slug: "pump-fun", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "sky", name: "Sky", symbol: "SKY", slug: "sky", category: "defi", assetClass: "token", tier: "discovery", aliases: ["MKR", "Maker"] },
  { id: "compound-governance-token", name: "Compound", symbol: "COMP", slug: "compound", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "1inch", name: "1INCH", symbol: "1INCH", slug: "1inch", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "0x", name: "0x Protocol", symbol: "ZRX", slug: "0x-protocol", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "sushi", name: "Sushi", symbol: "SUSHI", slug: "sushi", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "yearn-finance", name: "yearn.finance", symbol: "YFI", slug: "yearn-finance", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "convex-finance", name: "Convex Finance", symbol: "CVX", slug: "convex-finance", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "havven", name: "Synthetix", symbol: "SNX", slug: "synthetix", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "gmx", name: "GMX", symbol: "GMX", slug: "gmx", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "dydx-chain", name: "dYdX", symbol: "DYDX", slug: "dydx", category: "defi", assetClass: "native", tier: "discovery" },
  { id: "thorchain", name: "THORChain", symbol: "RUNE", slug: "thorchain", category: "defi", assetClass: "native", tier: "discovery" },
  { id: "cow-protocol", name: "CoW Protocol", symbol: "COW", slug: "cow-protocol", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "instadapp", name: "Fluid", symbol: "FLUID", slug: "fluid", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "syrup", name: "Maple Finance", symbol: "SYRUP", slug: "maple-finance", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "venus", name: "Venus", symbol: "XVS", slug: "venus", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "reserve-rights-token", name: "Reserve Rights", symbol: "RSR", slug: "reserve-rights", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "kamino", name: "Kamino", symbol: "KMNO", slug: "kamino", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "orca", name: "Orca", symbol: "ORCA", slug: "orca", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "dexe", name: "DeXe", symbol: "DEXE", slug: "dexe", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "swissborg", name: "SwissBorg", symbol: "BORG", slug: "swissborg", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "nexo", name: "NEXO", symbol: "NEXO", slug: "nexo", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "nxm", name: "Nexus Mutual", symbol: "NXM", slug: "nexus-mutual", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "meteora", name: "Meteora", symbol: "MET", slug: "meteora", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "vvs-finance", name: "VVS Finance", symbol: "VVS", slug: "vvs-finance", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "deep", name: "DeepBook", symbol: "DEEP", slug: "deepbook", category: "defi", assetClass: "token", tier: "discovery" },

  // --- Discovery: oracle ---
  { id: "redstone-oracles", name: "RedStone", symbol: "RED", slug: "redstone", category: "oracle", assetClass: "token", tier: "discovery" },
  { id: "tellor", name: "Tellor Tributes", symbol: "TRB", slug: "tellor", category: "oracle", assetClass: "token", tier: "discovery" },

  // --- Discovery: liquid-staking ---
  { id: "jito-governance-token", name: "Jito", symbol: "JTO", slug: "jito", category: "liquid-staking", assetClass: "token", tier: "discovery" },
  { id: "ether-fi", name: "Ether.fi", symbol: "ETHFI", slug: "ether-fi", category: "liquid-staking", assetClass: "token", tier: "discovery" },
  { id: "babylon", name: "Babylon", symbol: "BABY", slug: "babylon", category: "liquid-staking", assetClass: "token", tier: "discovery" },
  { id: "lombard-protocol", name: "Lombard", symbol: "BARD", slug: "lombard", category: "liquid-staking", assetClass: "token", tier: "discovery" },

  // --- Discovery: ai ---
  { id: "numeraire", name: "Numeraire", symbol: "NMR", slug: "numeraire", category: "ai", assetClass: "token", tier: "discovery" },
  { id: "kaito", name: "KAITO", symbol: "KAITO", slug: "kaito", category: "ai", assetClass: "token", tier: "discovery" },
  { id: "arkham", name: "Arkham", symbol: "ARKM", slug: "arkham", category: "ai", assetClass: "token", tier: "discovery" },
  { id: "allora", name: "Allora", symbol: "ALLO", slug: "allora", category: "ai", assetClass: "token", tier: "discovery" },
  { id: "bio-protocol", name: "Bio Protocol", symbol: "BIO", slug: "bio-protocol", category: "ai", assetClass: "token", tier: "discovery" },
  { id: "cortex-2", name: "Cortex", symbol: "CX", slug: "cortex", category: "ai", assetClass: "token", tier: "discovery" },

  // --- Discovery: depin / data-storage ---
  { id: "grass", name: "Grass", symbol: "GRASS", slug: "grass", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "akash-network", name: "Akash Network", symbol: "AKT", slug: "akash", category: "depin", assetClass: "native", tier: "discovery" },
  { id: "aethir", name: "Aethir", symbol: "ATH", slug: "aethir", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "io", name: "io.net", symbol: "IO", slug: "io-net", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "aioz-network", name: "AIOZ Network", symbol: "AIOZ", slug: "aioz", category: "depin", assetClass: "native", tier: "discovery" },
  { id: "geodnet", name: "Geodnet", symbol: "GEOD", slug: "geodnet", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "livepeer", name: "Livepeer", symbol: "LPT", slug: "livepeer", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "golem", name: "Golem", symbol: "GLM", slug: "golem", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "holotoken", name: "Holo", symbol: "HOT", slug: "holo", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "jasmycoin", name: "JasmyCoin", symbol: "JASMY", slug: "jasmy", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "theta-token", name: "Theta Network", symbol: "THETA", slug: "theta", category: "depin", assetClass: "native", tier: "discovery" },
  { id: "theta-fuel", name: "Theta Fuel", symbol: "TFUEL", slug: "theta-fuel", category: "depin", assetClass: "native", tier: "discovery" },
  { id: "peaq-2", name: "peaq", symbol: "PEAQ", slug: "peaq", category: "depin", assetClass: "native", tier: "discovery" },
  { id: "gmt-token", name: "GoMining Token", symbol: "GOMINING", slug: "gomining", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "xyo-network", name: "XYO Network", symbol: "XYO", slug: "xyo", category: "depin", assetClass: "token", tier: "discovery" },
  { id: "arweave", name: "Arweave", symbol: "AR", slug: "arweave", category: "data-storage", assetClass: "native", tier: "discovery" },
  { id: "walrus-2", name: "Walrus", symbol: "WAL", slug: "walrus", category: "data-storage", assetClass: "token", tier: "discovery" },

  // --- Discovery: infrastructure ---
  { id: "origintrail", name: "OriginTrail", symbol: "TRAC", slug: "origintrail", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "rif-token", name: "Rootstock Infrastructure Framework", symbol: "RIF", slug: "rootstock-rif", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "ravencoin", name: "Ravencoin", symbol: "RVN", slug: "ravencoin", category: "infrastructure", assetClass: "native", tier: "discovery" },
  { id: "trust-wallet-token", name: "Trust Wallet", symbol: "TWT", slug: "trust-wallet", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "bittorrent", name: "BitTorrent", symbol: "BTT", slug: "bittorrent", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "chain-2", name: "Onyxcoin", symbol: "XCN", slug: "onyxcoin", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "safe", name: "Safe", symbol: "SAFE", slug: "safe-wallet", category: "infrastructure", assetClass: "token", tier: "discovery" },

  // --- Discovery: rwa ---
  { id: "centrifuge-2", name: "Centrifuge", symbol: "CFG", slug: "centrifuge", category: "rwa", assetClass: "token", tier: "discovery" },
  { id: "polymesh", name: "Polymesh", symbol: "POLYX", slug: "polymesh", category: "rwa", assetClass: "native", tier: "discovery" },
  { id: "plume", name: "Plume", symbol: "PLUME", slug: "plume", category: "rwa", assetClass: "native", tier: "discovery" },
  { id: "creditcoin-2", name: "Creditcoin", symbol: "CTC", slug: "creditcoin", category: "rwa", assetClass: "native", tier: "discovery" },

  // --- Discovery: memes ---
  { id: "floki", name: "FLOKI", symbol: "FLOKI", slug: "floki", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "spx6900", name: "SPX6900", symbol: "SPX", slug: "spx6900", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "fartcoin", name: "Fartcoin", symbol: "FARTCOIN", slug: "fartcoin", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "popcat", name: "Popcat", symbol: "POPCAT", slug: "popcat", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "based-brett", name: "Brett", symbol: "BRETT", slug: "brett", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "turbo", name: "Turbo", symbol: "TURBO", slug: "turbo", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "official-trump", name: "Official Trump", symbol: "TRUMP", slug: "official-trump", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "baby-doge-coin", name: "Baby Doge Coin", symbol: "BABYDOGE", slug: "baby-doge", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "degen-base", name: "Degen", symbol: "DEGEN", slug: "degen", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "toshi", name: "Toshi", symbol: "TOSHI", slug: "toshi", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "peanut-2-2", name: "Peanut", symbol: "PEANUT", slug: "peanut", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "non-playable-coin", name: "Non-Playable Coin", symbol: "NPC", slug: "non-playable-coin", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "dog-go-to-the-moon-rune", name: "Dog (Bitcoin)", symbol: "DOG", slug: "dog-go-to-the-moon", category: "meme", assetClass: "meme", tier: "discovery" },
  { id: "ordinals", name: "ORDI", symbol: "ORDI", slug: "ordinals", category: "meme", assetClass: "token", tier: "discovery" },

  // --- Discovery: stablecoins (secondary) ---
  { id: "usds", name: "USDS", symbol: "USDS", slug: "usds", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "usdd", name: "USDD", symbol: "USDD", slug: "usdd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "first-digital-usd", name: "First Digital USD", symbol: "FDUSD", slug: "first-digital-usd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "true-usd", name: "TrueUSD", symbol: "TUSD", slug: "trueusd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "ripple-usd", name: "Ripple USD", symbol: "RLUSD", slug: "ripple-usd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "gho", name: "GHO", symbol: "GHO", slug: "gho", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "crvusd", name: "crvUSD", symbol: "CRVUSD", slug: "crvusd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "euro-coin", name: "EURC", symbol: "EURC", slug: "eurc", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "usual-usd", name: "Usual USD", symbol: "USD0", slug: "usual-usd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },
  { id: "frax-usd", name: "Frax USD", symbol: "FRXUSD", slug: "frax-usd", category: "stablecoin", assetClass: "stablecoin", tier: "discovery" },

  // --- Discovery: additional exchange / ecosystem tokens ---
  { id: "htx-dao", name: "HTX DAO", symbol: "HTX", slug: "htx-dao", category: "exchange", assetClass: "token", tier: "discovery" },
  { id: "mx-token", name: "MX", symbol: "MX", slug: "mx-token", category: "exchange", assetClass: "token", tier: "discovery" },
  { id: "tokenize-xchange", name: "Tokenize Xchange", symbol: "TKX", slug: "tokenize-xchange", category: "exchange", assetClass: "token", tier: "discovery" },
  { id: "btse-token", name: "BTSE Token", symbol: "BTSE", slug: "btse", category: "exchange", assetClass: "token", tier: "discovery" },
  { id: "bitkub-coin", name: "KUB Coin", symbol: "KUB", slug: "bitkub", category: "exchange", assetClass: "native", tier: "discovery" },
  { id: "safepal", name: "SafePal", symbol: "SFP", slug: "safepal", category: "infrastructure", assetClass: "token", tier: "discovery" },
  { id: "sun-token", name: "Sun Token", symbol: "SUN", slug: "sun-token", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "just", name: "JUST", symbol: "JST", slug: "just", category: "defi", assetClass: "token", tier: "discovery" },
  { id: "gas", name: "Gas", symbol: "GAS", slug: "neo-gas", category: "smart-contract", assetClass: "token", tier: "discovery" },
];
