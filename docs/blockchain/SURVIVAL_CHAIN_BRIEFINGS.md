# Survival Chain Briefings

Status: UX and content design only — existing Survival gameplay remains frozen

Canonical data: `public/data/blockchain/survival-briefings.json`

Last reviewed: 2026-07-15

## Briefing safety contract

When a new zone begins:

1. The player crosses the portal.
2. Existing objects fade or disappear; reduced motion changes them instantly.
3. Obstacle and collectible spawning stops.
4. The track continues visually at roughly 25–35% speed, or remains static under reduced motion.
5. The player remains visible at the center.
6. Score, timer, difficulty, collision, spawning, and progression freeze.
7. A compact card appears in focus order.
8. A brief animation or static diagram demonstrates the new rule.
9. The player explicitly chooses “Compris — reprendre le voyage” / “Got it — resume journey.”
10. A 3–2–1 text countdown resumes the run.

No disadvantage can occur while the card is visible. This includes hidden timer loss, lost invulnerability, expiring items, missed spawns, score decay, or advancing hazards.

## First and repeat visits

The first visit requires the full concept, rule, tip, demonstration, and acknowledgement. Copy remains three short sentences.

A repeat visit shows one compact reminder plus:

- Continue;
- Review rule;
- a future quick-resume preference.

Reviewing never penalizes the player. The preference is reversible and does not skip new or changed rules.

## Zone matrix

| Zone | Blockchain idea | New journey rule | Teaching boundary |
|---|---|---|---|
| Genesis Lane | Distributed ledger and node convergence; historical Pi trust concepts only when labeled | Follow the record verified by every required fictional node | Not a live Pi consensus simulation |
| Orange Chain | Bitcoin-style UTXO, PoW history, confirmations | Use each output once and stay with the confirming branch | No mining reward or universal confirmation number |
| Smart Layer | Accounts, smart contracts, gas, reversion | Satisfy rules within an abstract resource budget | Cells are not prices or live gas amounts |
| Neon Speednet | Parallel execution and conflicts | Parallelize independent markers; serialize matching writes | Solana, Sui, and Aptos use different concrete models |
| Stable Grid | Quorum overlap, coherence, deterministic finality | Cross only after safe overlap and a finality seal | Explicitly not a stablecoin zone |
| Meme Circuit | Crowd/economic signal volatility versus protocol validity | Follow validity markers; treat popularity as optional fictional risk | Not consensus, trading, a price chart, or investment play |
| Privacy Tunnel | Proof without disclosure and shielded-state concepts | Prove the pattern without revealing its witness | No absolute-anonymity promise |
| Chain Storm | Authenticated cross-chain messages and rollup proof paths | Match packet, verifier, order, destination, and timeout | IBC, XCM, and rollups remain distinct |

## Demonstration language

Animations use no embedded text. Every state has a static equivalent and accessible description. A demo must show input, rule, result, and one failure. Decorative particles cannot carry essential information.

Color is redundant with icon, shape, pattern, and text:

- valid: check plus solid boundary;
- provisional: clock plus dotted boundary;
- final: closed seal plus double boundary;
- conflict: crossed arrows plus hatch;
- privacy-protected: covered tile, not blur alone;
- timed out: hourglass plus crossed packet.

## Localization architecture

French and English are authored in JSON as separate values. No sentence is assembled by concatenating fragments. Future Arabic support requires locale-driven `dir="rtl"`, mirrored layout only where direction conveys reading flow, non-mirrored protocol icons, and controls ordered by semantic priority.

Screen-reader order is zone, idea, journey rule, tip, Review, Resume. Language changes do not change identifiers or source references.

## Frozen-gameplay boundary

These rules are concepts for later implementation. No existing scene, timer, collision, spawn, score, difficulty, or zone transition file is modified by this work. Before implementation, every briefing needs usability testing at 375×667 and 414×736, reduced-motion review, keyboard and touch checks, and current source verification.
