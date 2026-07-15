# Chain Maze design

Status: original directional-maze foundation

Canonical levels: `public/data/blockchain/chain-maze-levels.json`

Last reviewed: 2026-07-15

## Originality boundary

Chain Maze uses the general, non-exclusive idea of continuous orthogonal movement on a grid. It does not copy Tomb of the Mask levels, layouts, graphics, masks, enemies, interface, animations, effects, sounds, progression, names, or recognizable motifs.

Its identity comes from protocol state machines: UTXO consumption, gas accounting, contract reversion, proof gates, packet sequences, quorum checks, and explicit educational recap. The player is the original generic Rush Pi orb shell with no face, mask, or protocol logo.

## Core movement

- The level is an orthogonal rectangular grid.
- The player commands up, right, down, or left through keyboard, touch buttons, or optional swipe.
- The orb moves cell by cell in that direction.
- It continues until the next step would hit a wall or grid boundary, or until it enters a stopping tile.
- Stopping tiles include anchors, nodes, portals, validators, transactions, contracts, resources, checkpoints, and the exit.
- The player chooses the next direction only while stopped.
- There is no analog inertia, acceleration, or physics bounce.
- Commands are buffered at most once and are ignored while resolving a tile rule.
- Reset is immediate and always available.

The preview may animate each traversed cell for readability. Under reduced motion, the orb moves directly to its destination and the traversed path is outlined statically.

## Level interface

```ts
interface Position {
  x: number;
  y: number;
}

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
  parMoves: number;
  educationalConcept: string;
}
```

The JSON also carries a title, win/failure copy, sources, simplification notes, status, and review date. Unlisted coordinates are `empty`; out-of-bounds movement behaves as a wall.

## Tile taxonomy

| Type | Walkable | Stops | Role |
|---|:---:|:---:|---|
| `wall` | no | before entry | blocks a route |
| `empty` | yes | no | ordinary traversal |
| `anchor` | yes | yes | neutral direction change |
| `start` | yes | yes | unique initial position |
| `exit` | yes | yes | unique objective evaluation point |
| `collectible` | yes | yes | fictional level resource |
| `hazard` | yes | yes | explicit failure or penalty rule |
| `oneWay` | yes | yes | restricts departure direction |
| `portal` | yes | yes | validated link to another coordinate |
| `validator` | yes | yes | checks a proof or predicate |
| `transaction` | yes | yes | consumes inputs or commits a modeled transaction |
| `spentOutput` | yes | yes | unavailable UTXO; fails the first prototype |
| `contract` | yes | yes | runs a fictional resource-metered operation |
| `gasCell` | yes | yes | adds abstract gas units |
| `instruction` | yes | yes | collects or runs an ordered step |
| `proofFragment` | yes | yes | fictional proof component |
| `bridge` | yes | yes | checks a source/destination message rule |
| `checkpoint` | yes | yes | records validated progress |

Runtime visuals must combine shape, pattern, and text. A spent output, invalid contract, and exit cannot differ by color alone.

## Prototype 1 — Bitcoin UTXO Vault

### Concept

An available output can be selected once as a fictional transaction input. Entering an already spent output is invalid. The level does not simulate a complete Bitcoin transaction.

### Initial state

- Grid: 9×9.
- Start: `(1, 7)`.
- Exit: `(7, 1)`.
- Available outputs: value 3 at `(1, 4)` and value 2 at `(4, 4)`.
- Spent decoy: `(7, 4)`.
- Final transaction: `(4, 1)`.
- Target fictional selected value: 5.

### Intended solution

`Up → Right → Up → Right`

1. Up stops on the value-3 output and changes it from available to selected/spent-for-this-transaction.
2. Right stops on the value-2 output; selected fictional value reaches 5.
3. Up stops on the transaction tile and confirms the simplified objective.
4. Right reaches the exit.

Continuing right from the second output instead enters the spent decoy and produces the explicit double-spend failure.

### States

`available → selected → spent → confirmed`, with `invalid` for the spent-decoy attempt.

### Win

Collect both available outputs, activate the final transaction, and reach the confirmed exit without entering the spent output.

### Simplification

The puzzle omits scripts, signatures, transaction serialization, input/output conservation details, change calculation, fee selection, mempool behavior, and real confirmation risk. Values are fictional.

## Prototype 2 — Ethereum Gas Labyrinth

### Concept

Execution consumes a gas budget and contract calls may succeed or revert. The abstract counter teaches metering and is not a fee estimate.

### Initial state

- Grid: 9×9.
- Start: `(1, 7)` with 10 abstract gas cells.
- Exit: `(7, 1)`.
- Required contract A: `(1, 4)`, cost 3.
- Gas cell: `(4, 4)`, adds 2 once.
- Invalid contract: `(7, 4)`, triggers `revert` failure.
- Required contract B: `(4, 1)`, cost 4.
- Every directional command costs 1.
- Exit requires both contracts and at least 1 cell.

### Intended solution

`Up → Right → Up → Right`

The resource path is `10 − 1 − 3 − 1 + 2 − 1 − 4 − 1 = 1`. Both required contracts succeed and one cell remains.

Continuing right from the gas cell enters the invalid contract. The preview ends the attempt with a clearly labeled revert rather than pretending to reproduce every EVM rollback detail.

### States

`idle → executing → success`, or `revert` / `outOfGas` on failure.

### Win

Activate both required contracts and reach the exit with at least one abstract gas cell.

### Simplification

The puzzle omits opcode schedules, intrinsic transaction cost, storage charging, refunds, access lists, base fee, priority fee, denominations, and real network state. No displayed value is a quote.

## Rule resolution order

For deterministic preview behavior:

1. reject input if the level is won, failed, or currently resolving;
2. check `oneWay` departure restrictions;
3. deduct per-command resource cost;
4. fail if a resource drops below its floor;
5. traverse until wall, boundary, or stopping tile;
6. resolve a portal destination if valid;
7. resolve hazard, spent output, resource, contract, transaction, validator, or checkpoint;
8. update objectives;
9. if on exit, evaluate all exit objectives;
10. announce the result once and re-enable controls if still active.

Repeated collectibles and contracts retain their resolved state and cannot grant resources twice.

## Validation and reachability

The structural validator checks:

- unique level, rule, resource, objective, and tile IDs;
- one start and exit coordinate, each represented by one matching tile;
- width, height, and every coordinate within bounds;
- known tile types;
- no duplicate tile coordinate;
- non-negative initial/minimum/target resource values and tile costs;
- at least one objective and one win condition;
- referenced tile and objective IDs;
- rectangular implicit grid;
- base directional reachability from start to exit.

The base solver explores stopped positions using the movement taxonomy and a visited-state set, so it cannot loop forever. It proves geometric reachability, not every economic rule. A separate deterministic test runs the intended four-command solutions and asserts each win state.

## Controls and accessibility

- Arrow keys and WASD are equivalent.
- Four touch buttons are always visible at mobile widths.
- Swipe uses a minimum threshold and is optional.
- Reset returns position, moves, resources, tiles, contracts, objectives, win, and failure state.
- Focus remains on the last input control after a move.
- A live region announces resource changes, stopped tile, failure, and victory once.
- Debug grid labels coordinates only when enabled.
- Reduced motion teleports the orb to its stopping position and outlines the traversed path.

## Future levels

Future Chain Maze designs may add validators, proofs, IBC packets, instructions, or checkpoints, but every special tile requires a sourced rule, a bounded state transition, a failure explanation, and base reachability. The two prototypes are the complete scope of this foundation.
