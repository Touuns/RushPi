# Campaign Gameplay Bible

Status: design foundation — no Campaign integration

Canonical data: `public/data/blockchain/campaign-chapters.json`

Last reviewed: 2026-07-15

## Campaign promise

Chain Journey applies mechanics learned in Pi Lab through varied, complete missions. A chapter succeeds only when the player performs a logically meaningful operation: build safe quorum overlap, consume an unspent output once, preserve a gas budget, validate a proof, route an authenticated packet, or commit an atomic sequence.

A chain name never justifies a palette swap. Each chapter must change player decisions, failure semantics, HUD information, and final verification.

## Gameplay families

### Runner Mission

The existing run can support a chapter only when movement performs a protocol-related selection: accept valid transactions, reject malformed data, manage abstract capacity, cross confirmed blocks, or follow an authenticated route. Running alone is not the educational action.

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
| 1 | Pi Trust Network | Network Routing | Classify evidence and repair quorum overlap | introductory |
| 2 | Bitcoin UTXO Vault | Chain Maze | Consume available outputs once and confirm a fictional transaction | introductory |
| 3 | Ethereum Gas Labyrinth | Chain Maze | Complete required calls within an abstract resource budget | intermediate |
| 4 | Stellar Path Payment | Network Routing | Build a bounded fictional path payment atomically | intermediate |
| 5 | Solana Atomic Grid | Sequence/Atomic Mission | Parallelize independent account work and serialize conflicts | intermediate |
| 6 | Avalanche Sampling Trial | Validation Challenge | Accumulate confidence through repeated samples | intermediate |
| 7 | Cosmos IBC Relay | Validation Challenge | Verify packet proof, order, acknowledgement, and timeout | advanced |
| 8 | Pi Multichain Finale | Sequence/Atomic Mission | Preserve Pi app boundaries and route distinct external evidence | advanced |

Season 1 has four gameplay templates with exactly two chapters each. Zero chapters are classic runners, so the non-runner requirement is exceeded without discarding the Runner Mission family for later seasons. Pi is structurally central: it establishes evidence discipline in chapter 1 and returns in chapter 8 as the application and claim-verification frame.

## Difficulty arc

### Chapters 1–2: visible state

The player sees every node, evidence card, output, and failure. Missions teach that sources have status and state inputs can be used only under explicit rules.

### Chapters 3–4: resources and paths

The player adds abstract execution budget and multi-edge routing. A short path may be invalid; a valid path may need a bound or atomic commit.

### Chapters 5–6: coordination

The player schedules dependencies and waits for repeated evidence. Immediate action is no longer always correct.

### Chapters 7–8: composed security models

The player distinguishes relaying from verification, client state from server state, fault proofs from validity proofs, and historical claims from current evidence.

## Pi centrality and boundaries

Pi Trust Network uses current SDK/API evidence and the historical whitepaper in separate lanes. Its quorum graph is explicitly historical and simplified. Pi Multichain Finale does not claim that Pi natively uses IBC or Ethereum rollups; external mechanisms are separate proof paths in a fictional application exercise.

Neither chapter initiates authentication, payments, blockchain messages, proofs, or wallet actions. Daily app participation is never routed to block validation.

## Failure language

Failure copy names the broken invariant:

- “Two candidate quorums can be disjoint.”
- “This output is already spent.”
- “The call exhausted its abstract gas budget.”
- “The path output is below the fictional bound.”
- “Two instructions write the same account simultaneously.”
- “One sample is not the required repeated confidence.”
- “The packet sequence or proof does not match this channel.”
- “This Pi claim is historical, not established as current.”

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

Polkadot XCM Route, Cardano eUTXO Workshop, Zcash Shielded Proof, and Filecoin Storage Proof are complete candidates for later sequencing. They are omitted from Season 1 to preserve an eight-chapter arc, not because their mechanisms are less important.

## Implementation gate

Before implementation, each chapter needs a paper prototype, protocol review, reduced-motion flow, keyboard/touch plan, localization review, win/failure test matrix, and proof that no existing gameplay file changes accidentally. The JSON is design input, not executable network logic.
