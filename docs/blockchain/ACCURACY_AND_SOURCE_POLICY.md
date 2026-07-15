# Blockchain accuracy and source policy

Status: design foundation — no gameplay integration

Last reviewed: 2026-07-15

## Purpose

Rush Pi's blockchain material is educational design, not protocol documentation, financial advice, a wallet, or a representation of current network conditions. Every technical claim must be traceable to a primary, official source recorded in `public/data/blockchain/sources.json`.

Allowed primary sources are protocol documentation, official whitepapers and specifications, BIPs or EIPs, foundation documentation, official protocol repositories, standards bodies, and original protocol research. Generic crypto blogs, price sites, influencers, marketing summaries, Wikipedia, and AI-generated summaries are not evidence.

Content JSON references source IDs only. URLs live once in the source catalog so they can be reviewed, replaced, or archived without silently changing the claim graph.

## Claim status vocabulary

| Status | Meaning | Allowed use |
|---|---|---|
| `current-official` | Supported by current official material reviewed on the recorded date. | May describe the current system, within the source's scope. |
| `historical-official` | Appears in an official historical source but is not established as current. | Must be labeled historical in player-facing copy. |
| `proposed-design` | A Rush Pi design proposal, not a network behavior. | May describe a future game mechanic only. |
| `simplified-for-game` | A deliberate abstraction of a sourced mechanism. | Must preserve the essential causal relationship and disclose the simplification. |
| `needs-verification` | Public evidence is missing, stale, ambiguous, or insufficient. | Cannot be asserted as current player-facing fact. |

`accuracyStatus` and `simplificationLevel` answer different questions. The first describes evidentiary status; the second describes how far the representation compresses reality. A source-backed mechanic may still require a high simplification level.

## Per-record requirements

Every primitive carries:

- `officialSources` using catalog IDs;
- `sourceType` matching the referenced primary material;
- `lastReviewedAt` as an ISO date;
- `accuracyStatus` from the controlled vocabulary;
- `simplificationLevel` as `none`, `low`, `moderate`, or `high`;
- `simplificationNotes` describing what is hidden or compressed;
- `unresolvedQuestions`, including an empty array when none are known.

Chain profiles and learning records use the same evidence model. Dates are review dates, not a promise that a network remained unchanged after that date.

## Pi-specific rule

Pi's original whitepaper is explicitly handled as historical material. Current Pi claims must use current developer documentation or a current official announcement. In particular:

- Open Network launch is current official status.
- SDK authentication and documented payment flows are current developer-platform behavior.
- SCP/FBA lineage and social-trust descriptions from the original whitepaper are historical unless a newer source confirms their implementation.
- Current quorum parameters, node-selection behavior, finality details, and the operational role of security circles remain `needs-verification` where public sources are insufficient.
- A daily app tap must never be described as block validation, proof of work, a consensus vote, or direct transaction verification.
- Participation, reward policy, wallet/payment UX, node operation, and consensus are separate concepts.

## Content boundaries

Rush Pi blockchain learning content must not include:

- live token prices, charts, yield, profit, earning, or investment claims;
- real private keys, seed phrases, wallet secrets, personal data, or real KYC data;
- a statement that a token represents every technical property of its network;
- a stablecoin presented as consensus, an AMM as a blockchain, or a bridge as an independent chain by default;
- a claim that ZK automatically means transaction privacy;
- a claim that a valid oracle report makes an external fact objectively true;
- protocol logos or a visual identity that implies sponsorship.

Abstract counters, fictional assets, and deterministic teaching scenarios are acceptable when labeled as such.

## Review workflow

1. Start with a concrete learning claim, not a chain name.
2. Find current primary evidence and add it to the catalog.
3. Record the claim's status, scope, assumptions, failures, and unresolved questions.
4. Design the game abstraction and state what it omits.
5. Validate IDs, dates, references, vocabulary, and prohibited language automatically.
6. Perform human technical, educational, accessibility, legal, and trademark review.
7. Re-review volatile material before release and whenever an upstream protocol changes.

The validator catches structural and wording risks. It does not prove factual accuracy, legal compliance, security, or pedagogical quality.
