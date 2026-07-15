# Campaign chapter matrix

Status: 13 source-backed chapter proposals

Canonical data: `public/data/blockchain/campaign-chapters.json`

Last reviewed: 2026-07-15

## Candidate comparison

| Chapter | Chain or family | Technology type | Template | Player actions | Win condition | Main failure | Target | Season 1 |
|---|---|---|---|---|---|---|---:|:---:|
| Pi Ecosystem Gateway | Pi developer ecosystem | current documented app, authentication, permission, and verification boundaries | Network Routing | select minimum permissions, route client auth, verify server-side, return state | fictional action is server-verified and returns through the correct context | client secret, excessive permission, unverified animation, or Testnet/Mainnet mix | 4 min | 1 |
| Bitcoin UTXO Vault | Bitcoin | PoW UTXO chain | Chain Maze | select values 2/3/5, reserve output 6 plus fee 1, calculate change, exit | inputs total at least 7, output and fee created, change coherent | insufficient 2+3, spent output, or premature exit | 3.5 min | 2 |
| Ethereum Gas Labyrinth | Ethereum | account-based contract execution | Chain Maze | compare direct and gas-cell routes, call contracts, preserve budget, exit | both calls succeed with at least one unit remaining | out of gas, revert, or premature exit | 4 min | 3 |
| Stellar Path Payment | Stellar | payment ledger and path operations | Network Routing | inspect, route, bound, commit | fictional destination amount meets bound atomically | unavailable edge or bound failure | 4.5 min | 4 |
| Solana Atomic Grid | Solana | account-explicit parallel execution | Sequence/Atomic Mission | inspect dependencies, parallelize, serialize, commit | deterministic target state without write conflict | conflicting writes or incomplete sequence | 5 min | 5 |
| Avalanche Sampling Trial | Avalanche | repeated-sampling consensus | Validation Challenge | sample, count, update, wait | valid preference reaches consecutive confidence | acceptance after one sample | 4.5 min | 6 |
| Cosmos IBC Relay Run | Cosmos | sovereign appchains and IBC | Hybrid Runner / Relay Mission | collect packet, preserve order, validate proof, choose route, acknowledge | one packet verifies once and is acknowledged before timeout | replay, sequence, proof, route, or timeout failure | 5.5 min | 7 |
| Multichain Finale | multiple protocol families | fictional transport, routing, proof, ordering, and boundary composition | Hybrid Runner / Routing / Validation | transport packet, select verifier, check proof/order/destination, close boundaries | packet reaches its compatible verifier and every boundary check passes | wrong verifier, transport mistaken for verification, or missing evidence | 7 min | 8 |
| Federated Trust Archive | Stellar plus historical Pi architecture | historical/general SCP, FBA, quorum, and evidence-scope concepts | Network Routing | label archive, connect slices, test overlap, reject unsupported shortcut | generic quorums intersect and every Pi-specific card remains historical | disjoint quorum or historical Pi claim marked current | 5 min | — |
| Polkadot XCM Route | Polkadot | shared-security parachains and XCM | Network Routing | select context, compose, validate, execute | permitted instruction reaches the intended context | wrong destination or unsupported instruction | 5.5 min | — |
| Cardano eUTXO Workshop | Cardano | programmable eUTXO | Resource Puzzle | select inputs, match data, inspect context, submit | all validators pass atomically | datum, redeemer, spent input, or conservation failure | 6 min | — |
| Zcash Shielded Proof | Zcash | shielded UTXO privacy | Validation Challenge | commit, check nullifier, assemble inputs, verify | fictional proof verifies without disclosure | repeated nullifier or mismatched proof | 5 min | — |
| Filecoin Storage Proof | Filecoin | verifiable decentralized storage | Resource Puzzle | place, seal, allocate, prove, retrieve | proofs pass and retrieval matches content ID | missed proof or unavailable/mismatched data | 6 min | — |

## Template distribution

Season 1 uses:

- Network Routing: 2;
- Chain Maze: 2;
- Sequence/Atomic Mission: 1;
- Validation Challenge: 1;
- Hybrid Runner: 2;
- Runner Mission: 0;
- Resource Puzzle: 0 in Season 1, with two complete later candidates.

No template family appears more than twice. Six missions are non-runner. The two hybrid runners apply transport, order, proof, route, timeout, acknowledgement, and boundary mechanics rather than changing only color or scenery. All eight missions apply at least one Pi Lab concept.

## Pi Lab dependency

| Chapter | Prior Pi Lab module |
|---|---|
| Pi Ecosystem Gateway | `lab-pi-apps-browser-auth`, `lab-wallet-testnet-mainnet`, `lab-user-to-app-payment`, `lab-app-to-user-verification` |
| Bitcoin UTXO Vault | `lab-utxo-vs-account`, `lab-confirmation-and-finality` |
| Ethereum Gas Labyrinth | `lab-contracts-and-gas` |
| Stellar Path Payment | `lab-confirmation-and-finality`, plus atomicity from the execution lesson |
| Solana Atomic Grid | state-model and atomic execution concepts from Levels 1 and 4 |
| Avalanche Sampling Trial | `lab-pow-vs-pos`, `lab-confirmation-and-finality` |
| Cosmos IBC Relay Run | `lab-rollups-privacy-interop` |
| Multichain Finale | client/server boundaries from Level 2 and `lab-rollups-privacy-interop` |

Federated Trust Archive remains outside Season 1 and depends on `lab-pi-nodes-and-claim-status`, `lab-quorum-slices-and-overlap`, and `lab-pi-participation-vs-validation`. Its visible historical/general warning is mandatory.

Later chapters depend on the same curriculum vocabulary and must not silently introduce protocol-specific detail beyond their briefing.

## Logical success audit

Each success maps to a real operation class:

- least-privilege permission selection plus client/backend verification boundaries;
- valid UTXO input selection;
- gas-bounded contract execution;
- bounded atomic path payment;
- deterministic conflict-aware scheduling;
- repeated-sampling confidence;
- ordered proof-checked packet transport plus acknowledgement;
- transport, routing, proof, order, destination, and explicit verifier boundaries;
- historical evidence classification plus generic quorum intersection in the optional archive;
- cross-consensus instruction routing;
- eUTXO script validation;
- shielded proof verification;
- storage proof plus separate retrieval validation.

No success is “reach a differently colored finish line.”

## Asset and animation scope

All chapters use original geometric mechanics from `public/assets/rushpi/mechanics/`. Runtime text supplies chain names and explanations. No chapter requires an official protocol logo. Motion conveys anticipation and feedback only; static states remain complete.
