# Learning and accessibility guide

Status: mandatory design guidance

Last reviewed: 2026-07-15

## Core principle

Accessibility is part of the learning model, not a visual polish pass. If a mechanic cannot be explained without speed, color, precise dragging, memory pressure, or animation, it needs an equivalent interaction before implementation.

## Learning design

### One causal idea at a time

Each lesson states one relationship, demonstrates it, lets the learner act on it, checks understanding, and recaps it. Chain names appear only after the transferable mechanism is clear.

### Failure explains, not punishes

Feedback identifies the failed rule and the recovery action. It never shames the learner, removes unrelated progress, or accelerates the next attempt. Pi Lab checks are repeatable without limit.

### Reading and language

- Prefer short active sentences and define specialized terms on first use.
- Keep Survival visible copy to idea, rule, and tip.
- Provide a glossary for quorum, finality, witness, nullifier, gas, rollup, and similar terms.
- Avoid idioms, hype, jokes about loss, and culture-specific metaphors in core instructions.
- Keep protocol names, data IDs, and source IDs out of translated sentence fragments.
- Author full French and English strings; never bake text into imagery.

## Visual access

- Target WCAG 2.2 AA contrast for text and essential controls.
- Never encode valid, invalid, final, private, or conflicting state by color alone.
- Combine color with shape, icon, border, pattern, and a short text label.
- Maintain useful information at 200% zoom and narrow mobile widths.
- Keep touch targets at least 44×44 CSS pixels with separation.
- Do not put explanatory text over moving high-detail backgrounds without an opaque surface.
- Allow diagrams to reflow vertically; horizontal scroll is acceptable only for a labeled data table with a summary.

## Motion and vestibular access

Honor `prefers-reduced-motion` from first render. Reduced motion means:

- instant state changes instead of parallax, zoom, shake, orbital motion, or sweeping fades;
- static before/after diagrams instead of animated demonstrations;
- text numerals instead of scaling countdowns;
- no auto-scrolling diagrams;
- no flashing; essential warnings remain steady.

Pausing animation must not hide state or stop keyboard access. The final static state carries all essential information.

## Input access

Every interaction supports:

- keyboard with visible focus;
- touch controls that do not require multi-touch;
- pointer without pixel-perfect dragging;
- activation through buttons as an alternative to swipe;
- reset and undo where the puzzle state can dead-end.

Arrow keys may move in Chain Maze, but on-screen directional buttons remain present. Swipe is optional enhancement. Focus does not move unexpectedly after a puzzle action.

## Screen readers and semantics

- Use real headings, lists, buttons, forms, and tables.
- Give diagrams a short summary plus an optional detailed description.
- Announce puzzle results once through a polite live region.
- Do not announce every decorative animation frame or timer tick.
- Express grids as position, tile role, available actions, and relevant state; do not read an entire map on every move.
- Provide source titles and organizations in addition to raw links.

## Cognitive access

- Keep instructions visible during the action or offer a persistent Review rule control.
- Avoid simultaneous new rules; Survival adds one primary rule per zone.
- Offer practice without timer or score.
- Make memory mechanics optional or provide a persistent reference.
- Use consistent words: “final” is not alternated with “confirmed” when the distinction matters.
- Expose prerequisites and estimated duration before a Pi Lab module.
- Let learners stop and resume between loop phases.

## Briefing safety

While a Survival briefing is open, freeze score, timer, collisions, difficulty, spawns, progress, power-up duration, and hazards. A learner who reads slowly must receive exactly the same run state as a learner who resumes quickly.

First visits require explicit acknowledgement. Repeat visits permit Continue or Review rule. A quick-resume preference never skips changed content.

## Privacy and personal safety

Learning interactions use fictional identities, addresses, balances, credentials, and network graphs. They never request a private key, seed phrase, real wallet address, access token, payment identifier, legal name, KYC document, contact list, or social graph.

Identity exercises verify fictional claims and explicitly state that a DID is not KYC or proof of personhood by itself.

## Financial safety

No module gives investment advice, price forecasts, live quotes, yield, profit, gain, earnings, portfolio strategy, or guaranteed stable value. AMM and stablecoin lessons use abstract fictional systems and emphasize failure assumptions. Knowledge badges have no financial or transferable value.

## Localization and RTL readiness

Use locale objects, not coordinates tied to English length. Layout uses logical CSS properties such as `margin-inline`, `inset-inline-start`, and `text-align: start`. When Arabic is added:

- set document and component direction from locale metadata;
- mirror reading flow and directional navigation only after usability review;
- keep mathematical order, hashes, addresses, code, and protocol identifiers left-to-right where appropriate;
- test mixed-direction strings explicitly;
- avoid icons whose meaning changes ambiguously when mirrored.

## Test checklist

Before implementation approval, verify:

1. 375×667 and 414×736 layouts without clipped controls.
2. Complete keyboard operation and visible focus.
3. Touch buttons, optional swipe, reset, and undo.
4. 200% zoom and reflow.
5. Reduced-motion first render and in-session preference changes.
6. Screen-reader heading, control, diagram, and result order.
7. Color-blind-safe redundant state cues.
8. French and English expansion; future RTL structure.
9. No disadvantage during any briefing or review.
10. No real identity, wallet, payment, financial, or market data.

Automated checks support this list but do not replace testing with disabled learners, language reviewers, protocol experts, or legal reviewers.
