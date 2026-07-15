# Chain Maze design

Status: original directional-maze foundation — v2 prototypes

Canonical levels: `public/data/blockchain/chain-maze-levels.json`

Last reviewed: 2026-07-15

## Originality and scope

Chain Maze uses the general idea of continuous orthogonal movement on a grid. It does not copy Tomb of the Mask levels, layouts, graphics, masks, enemies, interface, animations, effects, sounds, progression, names, or recognizable motifs. Its identity comes from explicit protocol-inspired state machines, visible resources, causal failures, declared test scenarios, and the original generic Rush Pi orb.

The prototype performs no chain operation, transaction, contract call, proof, wallet action, payment, or network request.

## Movement contract

- Commands are `up`, `right`, `down`, and `left`, available through arrows/WASD, touch buttons, or swipe.
- The orb continues until a wall, boundary, or stopping tile.
- Anchors, resources, contracts, transactions, exits, validators, and checkpoints stop movement.
- A blocked command does not consume a move or resource.
- A valid Ethereum command deducts its movement cost before the destination tile resolves.
- Resolved collectibles and valid contracts cannot grant their effect twice.
- Reset restores position, moves, resources, resolved tiles, status, failure code, and objectives.
- Reduced motion moves directly to the stopped position while preserving the same rule order.

## Data interface

```ts
interface ChainMazeLevel {
  id: string;
  chapterId: string;
  width: number;
  height: number;
  start: Position;
  exit: Position;
  tiles: MazeTile[];
  rules: MazeRule[];
  resources: MazeResource[];
  objectives: MazeObjective[];
  validationScenarios: MazeScenario[];
  parMoves: number;
  educationalConcept: string;
}

interface MazeScenario {
  id: string;
  routeRole: string;
  commands: Array<"up" | "right" | "down" | "left">;
  expectedStatus: "won" | "failed";
  expectedFailureCode: string | null;
  expectedMoves: number;
  expectedResources: Record<string, number>;
}
```

Unlisted coordinates are passable `empty` cells. The shared taxonomy includes walls, anchors, start/exit, collectibles, hazards, one-way tiles, portals, validators, transactions, spent outputs, contracts, gas cells, instructions, proof fragments, bridges, and checkpoints. Shape, pattern, text, and border must accompany color.

## Bitcoin UTXO Vault v2

### Topology

- Grid: 10×9.
- Start: `(1, 7)`; exit: `(8, 1)`.
- UTXO A: value 2 at `(1, 5)`.
- UTXO B: value 3 at `(4, 5)`.
- UTXO C: value 5 at `(7, 3)`.
- Already-spent decoy: `(8, 5)`.
- Transaction: `(4, 1)`.
- Five neutral anchors create left, center, lower-right, top-right, and initial branches.
- Fifteen walls form three staggered bands. The layout is neither the old 9×9 grid nor the Ethereum topology.

### Teaching transaction

The player creates a fictional output of value 6 and reserves one abstract unit as a teaching fee. Selected input value must therefore reach at least 7. Excess becomes abstract change:

- `2 + 5 = 7`: valid; output 6, fee 1, change 0;
- `3 + 5 = 8`: valid; output 6, fee 1, change 1;
- `2 + 3 = 5`: rejected as insufficient;
- already-spent output: rejected before transaction creation.

Every selected UTXO contributes once. A successful teaching transaction marks its inputs consumed for that attempt.

### Declared routes

- Optimal exact-input win: `Up → Up → Right → Right → Up → Left → Right → Right`.
- Alternate change win: `Right → Up → Up → Right → Up → Left → Right → Right`.
- Insufficient route: `Up → Right → Up → Up` reaches the transaction with value 5.
- Spent-output route: `Right → Up → Right → Right` reaches the spent decoy.

Both winning routes exceed four commands and use different branches. The validator executes all four scenarios and checks output, fee, and change arithmetic.

### Simplification boundary

The puzzle does not reproduce Bitcoin scripts, signatures, serialization, transaction identifiers, real fee policy, propagation, mempool behavior, mining, or complete confirmation. Values are fictional teaching units.

## Ethereum Gas Labyrinth v2

### Topology and budget

- Grid: 11×10.
- Start: `(1, 8)`; exit: `(9, 1)`.
- Initial budget: 16 abstract gas units.
- Every valid directional command: cost 1.
- Required contract A at `(1, 5)`: cost 3.
- Required contract B at `(6, 5)`: cost 5.
- Optional gas cell at `(4, 6)`: adds 4 once.
- Invalid contract at `(8, 5)`: engages cost 2, reverts its fictional call, and ends the attempt.
- Five anchors and sixteen walls create a direct execution lane, gas detour, premature-exit lane, and revert branch.

### Declared routes

- Short costly win: `Up → Up → Right → Up → Right`; gas remaining `3`.
- Longer efficient win: `Right → Up → Left → Up → Right → Up → Right`; gas remaining `5` after the optional `+4` cell.
- Out-of-gas: seventeen alternating `Right/Left` commands exhaust the budget to `-1`.
- Revert: `Up → Up → Right → Right`; the invalid call consumes its engaged cost and ends with gas `2`.
- Premature exit: `Right → Right → Up`; the exit is reached with gas `13` but both required contracts are missing.

Reaching the exit is not sufficient. Both valid contracts and at least one remaining unit are required. Revert discards the invalid call's fictional state; it does not present already-spent gas as fully refunded.

### Simplification boundary

The fixed counters are not Ethereum fee estimates. The prototype omits intrinsic gas, calldata, opcode schedules, bytecode, storage charging, refunds, access lists, base fee, priority fee, transaction envelopes, denominations, and live network state.

## Verified differentiation

The validator rejects the dataset if both levels share dimensions, both start and exit coordinates, wall-coordinate lists, or primary winning commands. It also verifies:

- Bitcoin has three available UTXOs with values 2, 3, and 5, a spent output, two wins, insufficient/spent failures, and coherent change;
- Ethereum has two valid required contracts, one invalid contract, a gas cell, two wins, out-of-gas, revert, premature exit, and the declared costs;
- every scenario reaches the exact expected status, failure code, move count, and resources;
- base directional reachability uses a visited-state set and cannot loop indefinitely.

The economic simulator is intentionally bounded to the declared teaching rules; it is not a protocol implementation or formal proof of every possible player path.

## Accessibility

- Touch targets remain at least 44×44 CSS pixels.
- Keyboard, buttons, and swipe call the same directional command function.
- Debug coordinates are optional.
- Resource names and numeric values remain visible in text.
- Failure copy names `insufficient-input`, `spent-output`, `out-of-gas`, `revert`, or `exit-locked`.
- Reduced motion preserves state changes and uses static resolved markers.
- A live region announces result and resource changes without color-only meaning.
