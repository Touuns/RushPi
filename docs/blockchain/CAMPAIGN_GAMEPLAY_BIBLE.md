# Campaign Gameplay Bible

Status: design foundation — no Campaign integration

Canonical data: `public/data/blockchain/campaign-chapters.json`

Last reviewed: 2026-07-15

## Campaign promise

Chain Journey applies mechanics learned in Pi Lab through varied, complete missions. A chapter succeeds only when the player performs a logically meaningful operation: preserve an application boundary, consume an unspent output once, preserve a gas budget, validate a proof, route an authenticated packet, or commit an atomic sequence.

A chain name never justifies a palette swap. Each chapter must change player decisions, failure semantics, HUD information, and final verification.

## Gameplay families

### Runner Mission

The existing run can support a chapter only when movement performs a protocol-related selection: accept valid transactions, reject malformed data, manage abstract capacity, cross confirmed blocks, or follow an authenticated route. Running alone is not the educational action.

### Hybrid Runner

A Hybrid Runner keeps Rush Pi's movement DNA but makes the run only one phase of a larger logical operation. The player must transport a uniquely identified abstract object, preserve ordering or capacity, stop at a validation checkpoint, choose a compatible route, and complete a verifier or acknowledgement step. A finish line without these state transitions is not a valid Hybrid Runner.

### Chain Maze

An original orthogonal directional maze. The orb continues until a boundary, wall, anchor, node, portal, or special rule stops it. Short maps combine route planning with a named state model or resource constraint. The foundation includes Bitcoin UTXO Vault and Ethereum Gas Labyrinth.

### Network Routing

Players connect nodes, validators, chains, messages, fictional liquidity paths, or quorum dependencies. Edges have explicit direction, capacity, proof, timeout, or intersection rules. A courier transports data; a verifier establishes authenticity.

### Validation Challenge

A focused trial verifies one nonce, signature, contract result, batch, proof, quorum, or finality condition. The player sees public inputs and the reason for acceptance or rejection.

### Resource Puzzle

Players allocate abstract gas, outputs, block capacity, reserve units, collateral ratios, storage sectors, or proof space. All values are fictional teaching units. No price, yield, profit, or investment outcome is simulated.

### Sequence/Atomic Mission

Players assemble instructions, calls, signatures, consensus phases, or message steps in a valid order. The sequence either commits as defined or exposes the exact failed precondition.

## Chapter construction rule

Each chapter includes:

1. one transferable concept already introduced in Pi Lab;
2. one named protocol or architecture example;
3. a player verb that mirrors the real mechanism;
4. an explicit win condition;
5. one or more causal failure conditions;
6. a mid-level evolution that extends rather than replaces the rule;
7. a final sequence that demonstrates understanding;
8. source IDs, evidence status, and simplification notes;
9. accessible static and reduced-motion states;
10. protocol-neutral assets with no official logos.

## Recommended Season 1

| Order | Chapter | Template | Central operation | Difficulty |
|---:|---|---|---|---|
| 1 | Pi Ecosystem Gateway | Network Routing | Preserve Pi Browser, client, backend, permission, and verified-result boundaries | introductory |
| 2 | Bitcoin UTXO Vault | Chain Maze | Select inputs totaling at least 7, create output 6, reserve fee 1, and expose change | introductory |
| 3 | Ethereum Gas Labyrinth | Chain Maze | Compare a short costly route with a longer gas-cell route under a 16-unit budget | intermediate |
| 4 | Stellar Path Payment | Network Routing | Build a bounded fictional path payment atomically | intermediate |
| 5 | Solana Atomic Grid | Sequence/Atomic Mission | Parallelize independent account work and serialize conflicts | intermediate |
| 6 | Avalanche Sampling Trial | Validation Challenge | Accumulate confidence through repeated samples | intermediate |
| 7 | Cosmos IBC Relay Run | Hybrid Runner / Relay Mission | Transport one abstract ordered packet through proof, route, timeout, and acknowledgement checks | advanced |
| 8 | Multichain Finale | Hybrid Runner / Routing / Validation | Transport, route, and verify an abstract packet across distinct technology boundaries | advanced |

Season 1 contains two Network Routing chapters, two Chain Maze chapters, one Sequence/Atomic Mission, one Validation Challenge, and two Hybrid Runners. Six of eight chapters are non-runners. Neither runner is a recolored race: chapter 7 preserves packet identity, order, proof, route, timeout, and acknowledgement; chapter 8 adds distinct transport, routing, and validation phases. Pi is structurally central through the original Rush Pi orb identity and chapter 1's current documented application workflow, not through unsupported protocol claims.

## Difficulty arc

### Chapters 1–2: visible state

The player sees every application lane, permission card, output, and failure. Missions teach that client/server boundaries are meaningful and state inputs can be used only under explicit rules.

### Chapters 3–4: resources and paths

The player adds abstract execution budget and multi-edge routing. A short path may be invalid; a valid path may need a bound or atomic commit.

### Chapters 5–6: coordination

The player schedules dependencies and waits for repeated evidence. Immediate action is no longer always correct.

### Chapters 7–8: composed security models

The player retains Rush Pi's motion language while distinguishing transport from verification, packet order from destination compatibility, and client, network, and verifier boundaries.

## Pi centrality and boundaries

Pi Ecosystem Gateway uses only current developer-platform material for Pi Browser context, SDK authentication, permissions, Testnet/Mainnet separation, Platform API boundaries, and server verification. It is a local state-machine exercise with no real user, identifier, payment, wallet, token, secret, authentication, or Pi access. It does not simulate Pi consensus.

Federated Trust Archive preserves the former quorum idea outside Season 1. It displays “historical/general consensus concept” and uses the historical Pi whitepaper only for lineage, alongside current Stellar material for the general SCP/FBA family. It never claims to reproduce current Pi consensus.

Multichain Finale keeps the player as the central original Rush Pi orb but removes Pi from the chapter's technology label. Its permanent notice states: “This fictional multichain simulation does not imply that Pi Network natively implements every protocol family represented.” The French notice carries the same meaning.

Neither chapter initiates authentication, payments, blockchain messages, proofs, or wallet actions. Daily app participation is never routed to block validation.

## Failure language

Failure copy names the broken invariant:

- “A server secret cannot enter the client lane.”
- “This output is already spent.”
- “The call exhausted its abstract gas budget.”
- “The path output is below the fictional bound.”
- “Two instructions write the same account simultaneously.”
- “One sample is not the required repeated confidence.”
- “The packet sequence or proof does not match this route.”
- “Transport completed, but verifier or acknowledgement checks remain open.”

Generic “network error,” “bad crypto,” and “you lost” messages are not acceptable educational feedback.

## Accessibility contract

- Every mission supports keyboard and touch; swipe is optional.
- Essential state uses shape, pattern, icon, border, and text, not color alone.
- Reduced motion switches immediately to static before/after states.
- Timed challenges provide an untimed learning mode.
- Memory mechanics retain an accessible reference.
- Reset and undo are present wherever a state can dead-end.
- Sources and simplification notes remain reachable from pause or recap.

## Out-of-season candidates

Federated Trust Archive, Polkadot XCM Route, Cardano eUTXO Workshop, Zcash Shielded Proof, and Filecoin Storage Proof are complete candidates for later sequencing. Federated Trust Archive is explicitly historical/general consensus content. They are omitted from Season 1 to preserve an eight-chapter arc, not because their mechanisms are less important.

## Implementation gate

Before implementation, each chapter needs a paper prototype, protocol review, reduced-motion flow, keyboard/touch plan, localization review, win/failure test matrix, and proof that no existing gameplay file changes accidentally. The JSON is design input, not executable network logic.
