# Campaign chapter matrix

Status: 12 source-backed chapter proposals

Canonical data: `public/data/blockchain/campaign-chapters.json`

Last reviewed: 2026-07-15

## Candidate comparison

| Chapter | Chain or family | Technology type | Template | Player actions | Win condition | Main failure | Target | Season 1 |
|---|---|---|---|---|---|---|---:|:---:|
| Pi Trust Network | Pi, Stellar | historical SCP/FBA concepts plus evidence status | Network Routing | classify, connect, test overlap | every claim is labeled and every modeled quorum intersects | disjoint quorum or historical claim marked current | 4 min | 1 |
| Bitcoin UTXO Vault | Bitcoin | PoW UTXO chain | Chain Maze | collect, avoid spent output, transact, exit | target 5, transaction confirmed, exit reached | double spend or premature exit | 3.5 min | 2 |
| Ethereum Gas Labyrinth | Ethereum | account-based contract execution | Chain Maze | budget, call contracts, collect gas, exit | both calls succeed with one cell remaining | revert or out of gas | 4 min | 3 |
| Stellar Path Payment | Stellar | payment ledger and path operations | Network Routing | inspect, route, bound, commit | fictional destination amount meets bound atomically | unavailable edge or bound failure | 4.5 min | 4 |
| Solana Atomic Grid | Solana | account-explicit parallel execution | Sequence/Atomic Mission | inspect dependencies, parallelize, serialize, commit | deterministic target state without write conflict | conflicting writes or incomplete sequence | 5 min | 5 |
| Avalanche Sampling Trial | Avalanche | repeated-sampling consensus | Validation Challenge | sample, count, update, wait | valid preference reaches consecutive confidence | acceptance after one sample | 4.5 min | 6 |
| Cosmos IBC Relay | Cosmos | sovereign appchains and IBC | Validation Challenge | connect, relay proof, preserve order, acknowledge | packets verify once and resolve before timeout | invalid proof, replay, sequence, or timeout | 5.5 min | 7 |
| Pi Multichain Finale | Pi plus rollup and IBC families | evidence-aware app composition | Sequence/Atomic Mission | authenticate fictionally, route proofs, verify packet, classify claims | every boundary and verifier is correct | client secret, wrong verifier, or false current claim | 7 min | 8 |
| Polkadot XCM Route | Polkadot | shared-security parachains and XCM | Network Routing | select context, compose, validate, execute | permitted instruction reaches the intended context | wrong destination or unsupported instruction | 5.5 min | — |
| Cardano eUTXO Workshop | Cardano | programmable eUTXO | Resource Puzzle | select inputs, match data, inspect context, submit | all validators pass atomically | datum, redeemer, spent input, or conservation failure | 6 min | — |
| Zcash Shielded Proof | Zcash | shielded UTXO privacy | Validation Challenge | commit, check nullifier, assemble inputs, verify | fictional proof verifies without disclosure | repeated nullifier or mismatched proof | 5 min | — |
| Filecoin Storage Proof | Filecoin | verifiable decentralized storage | Resource Puzzle | place, seal, allocate, prove, retrieve | proofs pass and retrieval matches content ID | missed proof or unavailable/mismatched data | 6 min | — |

## Template distribution

Season 1 uses:

- Network Routing: 2;
- Chain Maze: 2;
- Sequence/Atomic Mission: 2;
- Validation Challenge: 2;
- Runner Mission: 0;
- Resource Puzzle: 0 in Season 1, with two complete later candidates.

No template appears more than twice. All eight missions are non-runner and all apply at least one Pi Lab concept.

## Pi Lab dependency

| Chapter | Prior Pi Lab module |
|---|---|
| Pi Trust Network | `lab-pi-nodes-and-claim-status`, `lab-quorum-slices-and-overlap`, `lab-pi-participation-vs-validation` |
| Bitcoin UTXO Vault | `lab-utxo-vs-account`, `lab-confirmation-and-finality` |
| Ethereum Gas Labyrinth | `lab-contracts-and-gas` |
| Stellar Path Payment | `lab-confirmation-and-finality`, plus atomicity from the execution lesson |
| Solana Atomic Grid | state-model and atomic execution concepts from Levels 1 and 4 |
| Avalanche Sampling Trial | `lab-pow-vs-pos`, `lab-confirmation-and-finality` |
| Cosmos IBC Relay | `lab-rollups-privacy-interop` |
| Pi Multichain Finale | all four Pi-specific Level 2 modules, `lab-pi-nodes-and-claim-status`, and `lab-rollups-privacy-interop` |

Later chapters depend on the same curriculum vocabulary and must not silently introduce protocol-specific detail beyond their briefing.

## Logical success audit

Each success maps to a real operation class:

- evidence classification plus quorum intersection;
- valid UTXO input selection;
- gas-bounded contract execution;
- bounded atomic path payment;
- deterministic conflict-aware scheduling;
- repeated-sampling confidence;
- proof-verified packet delivery;
- explicit client/server and verifier boundaries;
- cross-consensus instruction routing;
- eUTXO script validation;
- shielded proof verification;
- storage proof plus separate retrieval validation.

No success is “reach a differently colored finish line.”

## Asset and animation scope

All chapters use original geometric mechanics from `public/assets/rushpi/mechanics/`. Runtime text supplies chain names and explanations. No chapter requires an official protocol logo. Motion conveys anticipation and feedback only; static states remain complete.
