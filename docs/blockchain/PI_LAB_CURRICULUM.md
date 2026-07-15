# Pi Lab curriculum

Status: standalone learning design — no gameplay or payment integration

Canonical modules: `public/data/blockchain/pi-lab-modules.json`

Last reviewed: 2026-07-15

## Learning loop

Every module follows the same short cycle:

1. Learn — one sourced explanation designed for roughly 15–30 seconds.
2. See — one visual demonstration lasting about 5–15 seconds, with a static reduced-motion equivalent.
3. Try — one meaningful interaction lasting about 20–60 seconds.
4. Check — one question or corrective action with explanatory feedback.
5. Recap — one transferable sentence.

The module timer is an editorial estimate, never a countdown pressure. Learners may pause, replay, use keyboard or touch, or read the full explanation. No answer affects money, wallet state, account access, Survival score, or Campaign progression.

## Progression

| Level | Focus | Modules | Exit capability |
|---:|---|---:|---|
| 1 | Blockchain essentials | 4 | Distinguish ledger, transaction, block, signature, confirmation, and finality. |
| 2 | Pi ecosystem | 4 | Explain Pi Browser/SDK/backend boundaries and order fictional payment-verification stages. |
| 3 | Pi network and consensus | 4 | Classify current versus historical claims and explain FBA/quorum concepts without simulating current Pi consensus. |
| 4 | Broader blockchain systems | 4 | Compare state, consensus, execution, scaling, privacy, and interoperability families. |

## Module map

### Level 1 — Blockchain essentials

- `lab-ledger-and-replicas`: a ledger and its replicated state.
- `lab-transactions-blocks-hashes`: transaction versus block, and parent-hash links.
- `lab-keys-addresses-signatures`: public address, private key, and digital signature.
- `lab-confirmation-and-finality`: provisional, confirmed, and finalized outcomes.

### Level 2 — Pi ecosystem

- `lab-pi-app-browser-auth`: Pi Browser app, SDK authentication, and backend verification boundary.
- `lab-pi-wallet-and-environments`: wallet intent and explicit Testnet/Mainnet environment.
- `lab-pi-user-to-app-payment`: fictional user-to-app payment lifecycle.
- `lab-pi-app-to-user-verification`: fictional app-to-user backend approval, submission, verification, and completion.

These lessons are architecture exercises only. They make no network call, initiate no payment, accept no real identifier, and hold no server credential.

### Level 3 — Pi network and consensus

- `lab-pi-nodes-and-claim-status`: current, historical, proposed, simplified, and needs-verification evidence labels.
- `lab-pi-scp-and-fba-history`: Pi's historical SCP/FBA relationship.
- `lab-quorum-slices-and-overlap`: local slices, global quorums, and unsafe disjoint sets.
- `lab-pi-participation-vs-validation`: app participation, rewards, wallet, node, and consensus are separate.

This level carries persistent status labels. It never exposes a “live Pi quorum,” current validator simulation, or current finality threshold without new official evidence. It directly teaches that a daily app tap is not direct block validation.

### Level 4 — Broader blockchain systems

- `lab-utxo-vs-account`: explicit outputs versus mutable account state.
- `lab-pow-vs-pos`: two distinct consensus and Sybil-resistance families.
- `lab-contracts-and-gas`: deterministic rule execution, resource metering, and reversion.
- `lab-rollups-privacy-interop`: fault proofs, validity proofs, privacy, and authenticated messages.

## Checks and feedback

Wrong answers never say only “incorrect.” Feedback points to the broken relationship: a private key should not reach a verifier; a historical source does not automatically prove a current parameter; a ZK validity proof does not automatically hide data.

Every check is repeatable. Random answer order may be added later only if correctIndex is recomputed and screen-reader order stays coherent.

## Proposed rewards

The JSON proposes named knowledge badges only. They are local educational acknowledgements with no cash value, token value, transferability, exchange, scarcity promise, yield, gain, or wallet effect. Removing them must not change the lesson.

## Asset needs

Future assets are generic diagrams: ledger panels, block shells, key shields, lifecycle cards, quorum graphs, state-model tokens, and proof gates. They contain no Pi or third-party protocol logo and no embedded localized text.

## Completion criteria

A learner completes a module after trying the interaction and resolving the check. Completion measures exposure and correction, not mastery. The recap remains available in a glossary, and source IDs link to the local source catalog.
