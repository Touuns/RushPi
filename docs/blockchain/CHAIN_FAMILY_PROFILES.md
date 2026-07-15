# Chain and protocol-family profiles

Status: research-backed design profiles — no endorsement or gameplay integration

Canonical data: `public/data/blockchain/chain-families.json`

Last reviewed: 2026-07-15

## Reading rule

The entries below are deliberately heterogeneous. Bitcoin, Ethereum, and Cardano are blockchains; Cosmos is an ecosystem and application-chain stack; Chainlink is an oracle/cross-chain service family; optimistic and ZK rollups are architecture families; Hedera's native Hashgraph ledger is not a chain of blocks. Classification is therefore a required field, not decorative copy.

Names identify subjects of technical study. No protocol logo is bundled, and inclusion is not sponsorship, partnership, investment guidance, or a ranking.

## Comparative matrix

| ID | Classification | Native state/execution focus | Consensus or security focus | Finality focus | Primary game opportunities |
|---|---|---|---|---|---|
| `pi-network` | Public L1 ecosystem; current low-level details partially documented | Pi Browser, SDK, Platform API, auth and payment workflows | Historical SCP/FBA lineage; current parameters need verification | Do not invent current thresholds or timing | claim classification, safe app auth, historical quorum concepts |
| `bitcoin` | Public PoW blockchain | UTXO and transaction scripts | accumulated proof of work | probabilistic confirmations | UTXO vault, hash links, branch confidence |
| `ethereum` | Public PoS programmable blockchain | accounts, EVM, gas, contracts | proof of stake and checkpoint finality | inclusion versus finalization | gas maze, nonce order, atomic calls, rollup settlement |
| `solana` | Public PoS smart-contract blockchain | programs and explicit data accounts | PoS with Proof of History clock component | commitment levels | conflict-aware parallel scheduling |
| `stellar` | Public payment ledger | accounts, operations, path payments | SCP / FBA and quorum sets | externalized ledgers | quorum slices, safe trust graphs, routing |
| `avalanche` | Public multi-chain platform | VM- and chain-specific | repeated random subsampling | confidence thresholds | sampling loop, DAG causality, network configuration |
| `polkadot` | Shared-security multichain protocol | parachain-specific state machines | relay-chain validation and shared security | relay-secured commitments | candidate validation, availability, XCM |
| `cosmos` | Sovereign appchain ecosystem and stack | modular application state machines | chain-specific CometBFT in this profile | BFT chain finality | appchain builder, IBC packets and timeouts |
| `cardano` | Public PoS programmable blockchain | eUTXO, data, redeemers, scripts | Ouroboros family | chain-selection confidence | eUTXO assembly and local validation |
| `zcash` | Public privacy-preserving UTXO-family chain | transparent and shielded pools | PoW lineage | probabilistic confirmations | notes, commitments, nullifiers, proofs |
| `monero` | Public privacy-focused blockchain | one-time outputs and privacy protocols | PoW | probabilistic confirmations | decoy-set concepts and metadata risk |
| `algorand` | Public pure-PoS blockchain | accounts and atomic groups | cryptographic sortition and committees | deterministic under assumptions | private committee selection and finality |
| `near` | Public sharded PoS smart-contract chain | accounts, actions, receipts, contracts | Nightshade sharding plus PoS | protocol finality | receipt routing and shard workload |
| `sui` | Public object-centric PoS chain | owned/shared objects and Move | ownership-sensitive coordination | certified outcomes | versions, transfers, parallel object lanes |
| `aptos` | Public Move-based PoS chain | accounts, Move, Block-STM | AptosBFT family | BFT commit | speculative parallel execution and retries |
| `xrp-ledger` | Public payment ledger | accounts and protocol transaction types | trusted-validator BFT-style agreement | validated ledgers | provisional versus final results, canonical order |
| `hedera` | Public Hashgraph DLT | native services plus EVM service | event gossip and virtual voting concepts | consensus ordering | DAG gossip and timestamp ordering |
| `filecoin` | Public verifiable-storage blockchain | deals, actors, sectors and proofs | Expected Consensus and storage power | heaviest history plus policy | storage challenge defense and retrieval distinction |
| `arweave` | Public permanent-data blockchain | data transactions and recall chunks | storage-oriented PoW lineage | heaviest valid history | proof of access and gateway-role distinction |
| `chainlink` | Oracle and cross-chain service family | reports, requests, service contracts | service-specific oracle network | source/destination-chain dependent | fictional data aggregation, freshness, relay guards |
| `optimistic-rollup-family` | Fault-proof Layer 2 family | off-chain VM and batches | base-layer settlement plus honest challenge | soft confirmation then challenge/base settlement | inspect batches, challenge assertions |
| `zk-rollup-family` | Validity-proof Layer 2 family | off-chain VM, circuit, prover, verifier | base-layer verification and settlement | proof acceptance plus base finality | public-input assembly and proof verification |

The JSON profiles add transaction, fee, interoperability, privacy, unsuitable-simplification, source, and unresolved-question fields for all 22 entries.

## Pi Network: layered technical profile

Pi requires a stricter evidence split because the original whitepaper states that parts may not be fully current.

### Current official layer

- Open Network launched in February 2025 and enables external connectivity (`pi-open-network-launch`).
- Pi provides a developer platform for Pi Browser apps (`pi-developers`).
- The current SDK documents initialization, authentication, and user-to-app payment creation (`pi-sdk-core`).
- Current server API guidance documents server-side verification and completion of payment flows; privileged credentials must remain off the client (`pi-platform-api`).
- Testnet and Mainnet are separate environments, but older “Enclosed/Open” wording must be reconciled with the later Open Network launch (`pi-mainnet-testnet`, `pi-open-network-launch`).

### Historical official layer

- The original whitepaper describes an SCP/FBA lineage, quorum concepts, security circles, and social-trust participation (`pi-whitepaper-original`).
- Those statements are suitable for a history-and-concepts lesson, not proof of live node configuration or current reward/consensus behavior.

### Proposed game layer

- Authentication exercises may teach client/server trust boundaries with fictional accounts.
- Payment exercises may teach a request → user approval → server verification → completion lifecycle using fictional units, without initiating payments.
- Quorum and trust-graph puzzles may teach general SCP/FBA concepts if the screen labels them “historical architecture concept” or “simplified model.”
- A claim-sorting exercise should ask players to separate current developer facts, historical design statements, and unresolved claims.

### Needs-verification layer

The reviewed public sources do not justify implementation-level claims about current Pi consensus messages, quorum-set parameters, node-selection rules, finality thresholds, or the current operational role of security circles. These remain unresolved and cannot drive a “current Pi simulator.”

### Participation, rewards, wallet, node, and consensus are separate

Daily mobile participation is a user-facing app activity. Rewards are a policy/economic concept. Wallet and payment flows authorize user actions. Node software participates in network infrastructure. Consensus orders or accepts network state. One should never be substituted for another.

Specifically, Rush Pi must never state or imply that tapping a daily button:

- validates a block;
- performs proof of work;
- signs a consensus vote;
- confirms a transaction;
- directly proves node availability;
- guarantees any reward or value.

## High-risk comparison traps

1. “Fast” and “cheap” are volatile product claims; use architecture, not marketing rankings or current amounts.
2. BFT, FBA, PoS, repeated sampling, and Hashgraph consensus cannot share one reskinned threshold game.
3. UTXO, eUTXO, accounts, Solana data accounts, and Sui objects expose different dependencies.
4. Privacy proofs, validity proofs, and rollup proofs solve different problems.
5. IBC, XCM, CCIP, bridges, and rollup message paths carry distinct verification assumptions.
6. Shared security reduces a specific bootstrapping burden; it does not make applications, contracts, sequencers, bridges, or governance automatically safe.
7. Storage proof, data availability, retrieval speed, persistence, and confidentiality are separate properties.

## Editorial use

Before a profile inspires a player-facing chapter, the chapter must choose a primitive and a causal lesson first. A chain name then supplies a concrete architecture example. Decorative chain-themed stages without a mechanism are outside this foundation.
