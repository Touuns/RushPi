# Blockchain mechanic to mode mapping

Status: design mapping — no game integration

Canonical data: `public/data/blockchain/mode-mapping.json`

Last reviewed: 2026-07-15

## Compatibility test

A primitive is compatible only when the mode can preserve its causal lesson, show a meaningful failure, and disclose the necessary simplification within that mode's attention budget. “Incompatible” is an intentional design decision, not missing work.

- Daily supports one short active classification, collection, ordering, scarcity, or resource-choice rule. It may use fictional assets but no live market price, investment, yield, or profit framing.
- Pi Lab supports concepts, demonstrations, guided exercises, a comprehension check, and one-sentence recap.
- Survival supports one progressive, briefable rule involving adaptation, network state, finality, congestion, privacy, or interoperability. The briefing freezes all consequences.
- Campaign supports complete missions with puzzles, routing, validation, sequences, and resource management.

## Matrix

`✓` means compatible; `—` means deliberately incompatible. Explanations for all 160 mode decisions are stored in the canonical JSON.

| Primitive | Daily | Pi Lab | Survival | Campaign |
|---|:---:|:---:|:---:|:---:|
| Distributed ledger basics | — | ✓ | ✓ | ✓ |
| Blocks and chained hashes | ✓ | ✓ | ✓ | ✓ |
| Transactions and signatures | ✓ | ✓ | ✓ | ✓ |
| Wallets and key ownership | — | ✓ | ✓ | ✓ |
| UTXO model | — | ✓ | — | ✓ |
| Account model | ✓ | ✓ | ✓ | ✓ |
| Proof of Work | — | ✓ | ✓ | ✓ |
| Proof of Stake | — | ✓ | ✓ | ✓ |
| Byzantine Fault Tolerance | — | ✓ | ✓ | ✓ |
| Federated Byzantine Agreement | — | ✓ | ✓ | ✓ |
| Quorum slices | — | ✓ | — | ✓ |
| Trust graphs | — | ✓ | ✓ | ✓ |
| Smart contracts | ✓ | ✓ | ✓ | ✓ |
| Gas and execution cost | ✓ | ✓ | ✓ | ✓ |
| Atomic execution | ✓ | ✓ | ✓ | ✓ |
| Parallel execution | — | ✓ | ✓ | ✓ |
| Deterministic finality | ✓ | ✓ | ✓ | ✓ |
| Probabilistic finality | — | ✓ | ✓ | ✓ |
| Mempools | ✓ | ✓ | ✓ | ✓ |
| Fees and congestion | ✓ | ✓ | ✓ | ✓ |
| Sharding | — | ✓ | ✓ | ✓ |
| Optimistic rollups | — | ✓ | ✓ | ✓ |
| ZK rollups | — | ✓ | ✓ | ✓ |
| Zero-knowledge proofs | — | ✓ | ✓ | ✓ |
| Shielded transactions | — | ✓ | ✓ | ✓ |
| Cross-chain messaging | — | ✓ | ✓ | ✓ |
| Shared security | — | ✓ | ✓ | ✓ |
| Appchains | — | ✓ | — | ✓ |
| Inter-Blockchain Communication | — | ✓ | ✓ | ✓ |
| Object-centric ownership | — | ✓ | ✓ | ✓ |
| Extended UTXO | — | ✓ | — | ✓ |
| DAG ledgers | — | ✓ | ✓ | ✓ |
| Repeated-sampling consensus | — | ✓ | ✓ | ✓ |
| Oracles | ✓ | ✓ | ✓ | ✓ |
| AMMs and liquidity | — | ✓ | — | ✓ |
| Stablecoin mechanisms | — | ✓ | — | ✓ |
| Governance and DAOs | — | ✓ | — | ✓ |
| Decentralized storage | — | ✓ | ✓ | ✓ |
| Identity and KYC layers | — | ✓ | — | ✓ |
| Social-trust-based participation | — | ✓ | — | ✓ |

## Deliberate exclusions

### From Daily

Complex consensus, privacy, identity, appchain, interoperability, and financial-mechanism lessons are excluded when a short reflex loop would teach a misleading proxy. Examples: tapping faster is not mining, collecting friends is not quorum safety, and choosing a rising arrow is not protocol validity.

### From Survival

UTXO/eUTXO assembly, full quorum-slice enumeration, architecture configuration, identity review, governance, AMMs, and stablecoin mechanisms need deliberate inspection. They should not be rushed under runner pressure. Stable Grid is explicitly about quorum coherence and finality, not stablecoins.

### From Campaign

All primitives can support Campaign only as source material for a carefully scoped mission. Compatibility does not mean each primitive needs a chapter, nor that chain names become decorative themes.

## Change control

A future mapping change must update both the JSON explanation and the relevant mode design. It also requires checking cognitive load, reduced-motion behavior, localization, source status, and failure semantics.
