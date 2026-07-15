# Blockchain visual language

Status: original mechanic-state system — lightweight templates only

Canonical data: `public/data/blockchain/visual-mechanics.json`

Asset root: `public/assets/rushpi/mechanics/`

Last reviewed: 2026-07-15

## Identity rule

The visual system is original, geometric, and protocol-neutral. It contains no official Pi Network logo, redrawn Pi mark, modified mark, third-party blockchain logo, mascot, mask, or copied game motif. Protocol names appear as runtime text in learning interfaces, never as baked SVG identity.

Suggested palettes are functional accessibility starting points, not protocol brand palettes. Production themes must pass contrast review and trademark review.

## State grammar

Every mechanic defines the same semantic states:

| State | Visual grammar |
|---|---|
| Idle | outline form, stable layout, no essential motion |
| Active | one focused boundary and the currently processed input |
| Warning | amber plus hatch/notch/hourglass and a runtime label |
| Success | solid or double boundary plus check/finality result |
| Failure | crossed or broken boundary plus the precise failure reason |

Color is never sufficient. Animation reinforces the transition but the final static frame contains the complete meaning.

## Required channels per family

Each of the 21 records specifies:

- idle, active, warning, success, and failure visuals;
- HUD indicator;
- portal, collectible, and obstacle styles;
- anticipation, success, and failure animation;
- reduced-motion fallback;
- suggested palette and naming examples.

The families are `player`, `ledger`, `hashing`, `utxo`, `accounts`, `gas`, `contracts`, `atomic`, `quorum`, `trust`, `finality`, `parallel`, `privacy`, `proof`, `rollup`, `interoperability`, `routing`, `oracle`, `liquidity`, `governance`, and `storage`.

## Family motifs

| Family | Stable motif | Critical distinction |
|---|---|---|
| Player | double-ring empty-center orb | shell effects stay outside the center |
| Ledger | replicated record panels | matching state versus diverged record |
| Hashing | faceted blocks and fingerprint ribbons | parent link versus broken link |
| UTXO | discrete notched output capsules | available, selected, spent, invalid, confirmed |
| Accounts | state cards and sequence dials | authorized ordered update versus stale sequence |
| Gas | segmented abstract cells | budget metering, never live price |
| Contracts | rule chambers and commit ports | committed state versus revert |
| Atomic | linked actions in one commit ring | all commit or all roll back |
| Quorum | segmented node rings and group boundaries | local threshold, global quorum, intersection |
| Trust | directed shape-coded dependencies | protocol reliance, not friendship |
| Finality | certificate seal or confirmation layers | deterministic seal versus policy confidence |
| Parallel | rails and dependency markers | independent work versus conflicting writes |
| Privacy | covered witness and visible statement | proof validity versus disclosure |
| Proof | faceted prism and public-input sockets | proof matching its exact public inputs |
| Rollup | compressed batch plus settlement anchor | challenge path versus validity-proof path |
| Interoperability | message capsule, proof envelope, paired gates | relaying versus authentication |
| Routing | nodes and constrained rails | available path versus invalid edge |
| Oracle | source beacons and aggregation lens | fresh supported report versus stale/outlier |
| Liquidity | two fictional reserve chambers | invariant/bound, never investment result |
| Governance | proposal lifecycle rail | vote, quorum, queue, execution |
| Storage | vaults, content IDs, challenge markers | storage proof, availability, and retrieval remain separate |

## Player shell

`player/player-orb-shell.svg` is the only player template. Its center is transparent and contains no text, symbol, glyph, or logo. Separate groups reserve:

- `orb-shell`;
- `shield-effect`;
- `magnet-effect`;
- `charge-effect`.

The three effects surround the center and default to hidden opacity where appropriate. A future runtime mathematical `π` glyph remains separate from the asset and is not presented as the Pi Network logo. A licensed official asset, if ever approved, would occupy an independent integration slot under the trademark policy and would not be merged into this SVG.

## Lightweight templates

The foundation intentionally creates only six SVGs:

- `player/player-orb-shell.svg`;
- `ledger/ledger-panel.svg`;
- `gas/gas-cell.svg`;
- `quorum/quorum-node.svg`;
- `proof/proof-prism.svg`;
- `interoperability/message-capsule.svg`.

Other directories contain tracked placeholders. This avoids prematurely generating dozens of final assets before mechanics, accessibility, and licensing are approved.

## Naming and animation targets

Use lowercase kebab case:

`family-object-state[-variant].svg`

Examples include:

- `quorum-node-idle`, `quorum-node-vote`, `quorum-node-accept`, `quorum-node-confirm`;
- `quorum-link-active`, `quorum-blocked`, `quorum-success-pulse`;
- `gas-cell`, `gas-gauge`, `gas-warning`, `gas-consumed`;
- `contract-success`, `contract-revert`, `out-of-gas-burst`;
- `interoperability-message-capsule`, `interoperability-source-gate`, `interoperability-message-delivered`, `interoperability-message-rejected`.

SVG group IDs name stable semantic layers, not animation frames. Runtime CSS or Canvas code may transform them without rewriting the source file.

## Motion budget

Anticipation lasts only long enough to show the next input or cost. Success produces one state lock, not a reward explosion. Failure preserves the last valid state and highlights the broken invariant. Avoid camera shake, strobe, high-frequency pulse, uncontrolled particles, and continuous orbit for essential state.

Under `prefers-reduced-motion`, transitions are instant. Before/after cards, static path outlines, numeric counters, and text status replace movement. No information disappears when motion is removed.

## HUD rules

HUD indicators show abstract state only:

- selected fictional UTXO value and input count;
- abstract gas cells;
- quorum threshold and intersection;
- finality model and state;
- proof/public-input match;
- packet source, destination, sequence, and timeout;
- oracle source count and freshness;
- storage proof, availability, and retrieval as separate rows.

No HUD contains a live token price, fiat value, investment return, yield, gain, or official protocol logo.

## Portal, collectible, and obstacle rules

Portals visualize the verifier or operation they perform. Collectibles represent a state input, instruction, or fictional resource. Obstacles represent a failed predicate, unavailable state, conflict, or timeout. Decorative danger without a causal rule does not belong in the blockchain mechanic layer.

## Review gate

Before a visual leaves prototype status, verify originality, trademark clearance, color redundancy, contrast, 200% zoom, reduced motion, screen-reader description, localization space, RTL behavior, and agreement with the corresponding JSON mechanic.
