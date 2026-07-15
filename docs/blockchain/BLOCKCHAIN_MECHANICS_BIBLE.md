# Blockchain Mechanics Bible

Status: source-backed design foundation — gameplay frozen

Canonical data: `public/data/blockchain/primitives.json`

Sources: `public/data/blockchain/sources.json`

Last reviewed: 2026-07-15

## Design contract

This bible translates protocol mechanisms into potential gameplay without changing the current Rush Pi game. A mechanic is eligible only when the player action preserves a real causal relationship: authorize before changing state, satisfy a threshold before finalizing, spend an unspent output only once, or verify a proof before accepting a claim.

The visual metaphor may compress the mechanism. It may not reverse causality, hide a critical security assumption, or imply a current network behavior not established by its sources.

## Terms that must remain distinct

| Term | Working definition | Not interchangeable with |
|---|---|---|
| DLT | A distributed ledger whose replicas apply shared rules; it may use a blockchain or another data structure. | Blockchain. |
| Blockchain | A ledger architecture that links ordered blocks, commonly through hashes. | Every DLT or every token. |
| Consensus | The protocol used by participants to agree on ordering or state despite faults. | Transaction execution, a stablecoin, or a wallet. |
| Account model | State is addressed under accounts and mutated by ordered authorized actions. | UTXO. |
| UTXO model | Discrete outputs are consumed once and replaced with new outputs. | Account balances stored as one mutable number. |
| Execution | Deterministic application of transaction or program rules to prior state. | Consensus, although consensus orders or certifies its inputs/results. |
| Smart contract | Program logic stored and executed by a supported state machine. | A token or a blockchain by itself. |
| Token | A protocol- or contract-defined unit or object. | The full technology, governance, value, or identity of its network. |
| Stablecoin | A token design that targets a reference value using a specific backing, redemption, collateral, or control mechanism. | Consensus or a guarantee of stability. |
| DeFi | Financial application mechanisms implemented with smart contracts or protocols. | A blockchain category or an investment recommendation. |
| Oracle | A system that delivers and verifies external observations or computation for on-chain use. | Objective truth or base-layer consensus. |
| Bridge | A system that transfers or represents messages/assets across separate systems under explicit verification assumptions. | An independent chain by default. |
| Layer 2 | A protocol that executes away from a base layer while deriving defined security or settlement from it. | Any sidechain or bridge. |
| Rollup | A Layer 2 family that posts data/commitments and settles batches using fault or validity proofs. | One universal implementation. |
| Appchain | An application-specific chain or state machine with purpose-chosen rules. | A smart contract deployed to every shared chain. |
| Governance | The proposal, voting, delegation, delay, and execution process that changes shared rules. | Token ownership alone or guaranteed legitimacy. |
| Decentralized storage | Distributed data storage/retrieval, sometimes with cryptographic storage proofs and incentives. | Automatic confidentiality or guaranteed availability. |
| Identity | Identifiers, controllers, verification methods, credentials, issuers, and policies. | A wallet address, KYC, or verified personhood by itself. |
| Privacy | Control or reduction of disclosed information through protocol and application design. | An absolute anonymity promise. |

Therefore:

- a meme token is not a type of blockchain;
- a stablecoin is not consensus;
- an AMM is not a blockchain;
- a bridge is not assumed to be a chain;
- a token does not necessarily represent its host network's architecture;
- zero-knowledge validity does not automatically make a rollup private.

## The 40 primitive families

The JSON record is canonical for inputs, outputs, actors, transitions, failures, assumptions, animation states, modes, templates, accuracy, and sources. This table is the editorial index.

| # | ID | Family | Category | Gameplay verb | Difficulty | Simplification |
|---:|---|---|---|---|---|---|
| 1 | `distributed-ledger-basics` | Distributed ledger basics | foundations | synchronize | introductory | moderate |
| 2 | `blocks-and-chained-hashes` | Blocks and chained hashes | data structures | link | introductory | moderate |
| 3 | `transactions-and-signatures` | Transactions and signatures | transactions | authorize | introductory | moderate |
| 4 | `wallets-and-key-ownership` | Wallets and key ownership | identity and control | protect | introductory | moderate |
| 5 | `utxo-model` | UTXO model | state models | combine | intermediate | moderate |
| 6 | `account-model` | Account model | state models | update | introductory | moderate |
| 7 | `proof-of-work` | Proof of Work | consensus | search | intermediate | high |
| 8 | `proof-of-stake` | Proof of Stake | consensus | attest | intermediate | high |
| 9 | `byzantine-fault-tolerance` | Byzantine Fault Tolerance | consensus | coordinate | advanced | high |
| 10 | `federated-byzantine-agreement` | Federated Byzantine Agreement | consensus | federate | advanced | high |
| 11 | `quorum-slices` | Quorum slices | consensus | compose | advanced | high |
| 12 | `trust-graphs` | Trust graphs | consensus | connect | advanced | high |
| 13 | `smart-contracts` | Smart contracts | execution | execute | intermediate | moderate |
| 14 | `gas-and-execution-cost` | Gas and execution cost | execution | budget | introductory | high |
| 15 | `atomic-execution` | Atomic execution | execution | bundle | intermediate | moderate |
| 16 | `parallel-execution` | Parallel execution | execution | schedule | advanced | high |
| 17 | `deterministic-finality` | Deterministic finality | finality | finalize | intermediate | moderate |
| 18 | `probabilistic-finality` | Probabilistic finality | finality | confirm | intermediate | high |
| 19 | `mempools` | Mempools | transaction lifecycle | queue | intermediate | high |
| 20 | `fees-and-congestion` | Fees and congestion | transaction lifecycle | prioritize | introductory | high |
| 21 | `sharding` | Sharding | scaling | partition | advanced | high |
| 22 | `optimistic-rollups` | Optimistic rollups | scaling | challenge | advanced | high |
| 23 | `zk-rollups` | ZK rollups | scaling | prove | advanced | high |
| 24 | `zero-knowledge-proofs` | Zero-knowledge proofs | cryptography | demonstrate | advanced | high |
| 25 | `shielded-transactions` | Shielded transactions | privacy | shield | advanced | high |
| 26 | `cross-chain-messaging` | Cross-chain messaging | interoperability | relay | advanced | high |
| 27 | `shared-security` | Shared security | interoperability | anchor | advanced | high |
| 28 | `appchains` | Appchains | architecture | configure | advanced | high |
| 29 | `inter-blockchain-communication` | Inter-Blockchain Communication | interoperability | handshake | advanced | high |
| 30 | `object-centric-ownership` | Object-centric ownership | state models | transfer | intermediate | high |
| 31 | `extended-utxo` | Extended UTXO | state models | validate | advanced | high |
| 32 | `dag-ledgers` | DAG-based ledgers | data structures | weave | advanced | high |
| 33 | `repeated-sampling-consensus` | Repeated-sampling consensus | consensus | sample | advanced | high |
| 34 | `oracles` | Oracles | external data | verify | intermediate | high |
| 35 | `amms-and-liquidity` | AMMs and liquidity | market mechanisms | balance | advanced | high |
| 36 | `stablecoin-mechanisms` | Stablecoin mechanisms | market mechanisms | stabilize | advanced | high |
| 37 | `governance-and-daos` | Governance and DAOs | coordination | govern | intermediate | high |
| 38 | `decentralized-storage` | Decentralized storage | storage | preserve | intermediate | high |
| 39 | `identity-and-kyc-layers` | Identity and KYC layers | identity and control | attest | intermediate | high |
| 40 | `social-trust-based-participation` | Social-trust-based participation | identity and control | diversify | advanced | high |

## Translation rules by system layer

### State and authorization

Transactions, signatures, wallets, UTXOs, accounts, eUTXOs, and objects are represented through explicit ownership, valid inputs, one-time consumption, counters, and version checks. No mechanic requests a real key or seed. A wallet shell represents authorization control, not a container holding literal coins.

### Agreement and finality

Proof of Work, Proof of Stake, BFT, FBA, quorum slices, trust graphs, and repeated sampling use distinct verbs and failure states. No generic “consensus meter” may be reskinned across these mechanisms. Deterministic and probabilistic finality use visibly different states: a certificate or finality seal versus confirmation depth and reorganization risk.

### Execution and scaling

Smart contracts, gas, atomic execution, parallel execution, sharding, and rollups expose resource, dependency, rollback, proof, and settlement relationships. Fixed counters are teaching units, not current fees. Rollup validity, data availability, sequencer ordering, and base-layer finality remain separate concepts.

### Interoperability and services

Cross-chain messaging, shared security, appchains, IBC, oracles, and storage must show the verifier or security provider. A courier cannot create authenticity merely by delivering a packet. A storage proof does not automatically prove rapid retrieval or confidentiality. An oracle report must show source, aggregation, and freshness limits.

### Privacy, identity, and economic mechanisms

ZK proofs, shielded transfers, credentials, AMMs, stablecoins, and governance require the strongest disclaimers. The game uses fictional data and assets only. It never simulates profit, yield, token price, guaranteed stability, or real KYC. DIDs prove control under a method; issuers and policy are separate from the identifier.

## Failure is part of the lesson

Every mechanic has an explicit win and failure condition. Failure should name the broken relationship, not merely subtract health:

- “input already spent,” not “bad coin”;
- “signature does not authorize this payload,” not “wrong wallet”;
- “provisional result was trusted before validation,” not “network slow”;
- “quorums can split,” not “trust too low”;
- “proof does not match public inputs,” not “privacy failed”;
- “message timed out before acknowledgement,” not “bridge broken.”

The recap converts that causal failure into one short transferable rule.

## Pi boundary

Pi learning material uses this bible's FBA, quorum, trust-graph, authentication, and payment primitives only with status labels. The original whitepaper supports historical architecture discussion. Current SDK and Platform API documentation support present application flows. Neither source justifies the statement that tapping a daily button validates blocks. That statement is prohibited.

## Source and review discipline

See `ACCURACY_AND_SOURCE_POLICY.md`. The source catalog contains 48 official primary records reviewed on 2026-07-15. A source ID is evidence only for the topics and scope described in its catalog notes. Human protocol review remains mandatory before player release.
