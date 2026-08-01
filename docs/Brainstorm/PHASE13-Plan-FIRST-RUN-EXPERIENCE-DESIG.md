# PHASE 13-PLAN — FIRST RUN EXPERIENCE DESIGN

## Recommended model

Opus

## Repository

Touuns/RushPi

## Baseline commit

`origin/main = e0391bbe33d9631637ce523732449fdbd81c6db6`

---

# Session rules

- New conversation
- Read-only
- Browser allowed only for localhost validation
- External browsing forbidden
- Git read-only
- No implementation
- No code generation
- No branch creation
- No commit
- No push
- No deployment
- No prototype implementation
- Maximum final report length: 140 lines

---

# Mission

Design the complete **First Run Experience (FRE)** for Rush Pi.

This is **not** an implementation phase.

This is a product-design and UX architecture phase.

The objective is to produce the definitive specification that will later be implemented through several small Claude implementation phases.

No code must be written.

No file must be modified.

No UI mock-up needs to be implemented.

The deliverable is a complete design document.

---

# Context

The Phase 13 Product Audit concluded that Rush Pi's biggest weakness is **first-run comprehension**, not gameplay quality nor technical architecture.

Current strengths:

- technically stable
- strong Daily integrity
- polished logo system
- deterministic Daily pipeline
- solid rendering architecture
- good mobile performance

Current weakness:

New players are immediately exposed to the ranked Daily experience before understanding:

- movement
- collectibles
- hazards
- objectives
- attempts
- progression
- why they should return tomorrow

The next implementation initiative must therefore improve understanding without modifying gameplay.

---

# Non-goals

This phase must NOT design:

- Season 2
- Audio
- Visual FX overhaul
- Economy
- Shop
- Multiplayer
- New gameplay mechanics
- New collectibles
- New hazards
- New progression systems
- Balance changes
- Collision changes
- HUD redesign
- Daily scoring
- Anti-cheat
- Logo system
- Registry
- Token values
- Campaign redesign

Those belong to future initiatives.

---

# Core design philosophy

The First Run Experience must respect the following principles:

1.

Teach by playing.

Never explain something the player has not yet seen.

---

2.

Never interrupt experienced players.

Once the player understands something, do not repeat it.

---

3.

Training is a safe playground.

No Pi login.

No Daily attempt.

No pressure.

---

4.

Daily remains the flagship mode.

Training exists only to prepare the player.

It must never replace Daily as the long-term objective.

---

5.

The player should finish the first session with confidence, not mastery.

---

6.

The design must minimize text.

Prefer interaction over reading.

---

7.

Everything must remain mobile-first.

---

# Repository validation

Confirm:

- origin/main equals

e0391bbe33d9631637ce523732449fdbd81c6db6

- working tree clean

Do not inspect implementation details beyond what is necessary to understand the current UX.

---

# Design tasks

## PART A

### Analyze the complete player journey

Describe every step from:

Application launch

↓

Home

↓

Mode selection

↓

Preparation

↓

Gameplay

↓

Results

↓

Replay

↓

Return tomorrow

For every step identify:

- player objective
- player emotion
- information required
- information missing
- friction
- unnecessary complexity
- opportunities

---

## PART B

### Design the ideal First Run Experience

Design the complete experience for a player launching Rush Pi for the first time.

Specify:

Should Training launch automatically?

Should Home appear first?

Should there be a Welcome screen?

Should there be a Skip option?

Should onboarding remember completion?

Exactly when does the player become free?

No implementation.

Only behaviour.

---

## PART C

### Training philosophy

Define precisely:

What Training teaches

What it deliberately does NOT teach

Maximum duration

Maximum number of concepts

Maximum interruptions

Maximum text

Should failure be possible?

Should the player always succeed?

Should score matter?

Should collectibles be limited?

Should hazards appear gradually?

Should completion unlock anything?

---

## PART D

### Teaching order

Determine the optimal order.

Example only:

Movement

↓

Collect

↓

Avoid

↓

Power-ups

↓

Combo

↓

Finish

↓

Daily

↓

Profile

↓

Leaderboard

↓

Return tomorrow

Do not assume this order is correct.

Design the best order.

Explain why.

---

## PART E

### Information architecture

For every screen define:

Purpose

Primary action

Secondary action

Optional action

Information hierarchy

Visual priority

Maximum text

Maximum buttons

Maximum interruptions

---

## PART F

### Persistent onboarding

Design exactly what is remembered.

Examples:

Training completed

Tutorial dismissed

Hints seen

Warnings acknowledged

Etc.

Determine:

What is shown once.

What is shown every time.

What is shown only after updates.

---

## PART G

### Daily transition

Determine how the player moves from Training to Daily.

Questions:

Automatic?

Suggested?

Forced?

Rewarded?

Recommended?

Should the first Daily be presented differently?

Should Pi login happen before or after Training?

Should Daily attempts be explained before login?

---

## PART H

### Error communication

Design messaging for:

Network unavailable

Daily unavailable

No token manifest

Offline mode

Quit Daily

Attempt consumption

Authentication failure

Leaderboard unavailable

Every message should:

be short

be honest

avoid technical jargon

---

## PART I

### Replay loop

Design the ideal post-game flow.

Training result

Daily result

Campaign result

Survival result

Determine:

When Replay appears.

When Home appears.

When Profile matters.

When Leaderboard matters.

When "Come back tomorrow" appears.

---

## PART J

### Accessibility

Review:

Colour reliance

Motion

Small text

Reading load

Touch targets

One-handed use

Reduced motion

Explain improvements.

No implementation.

---

# Constraints

The final design MUST preserve:

- deterministic Daily
- ranked integrity
- existing gameplay
- logo system
- rendering architecture
- server validation
- anti-cheat
- token scoring
- object lifecycle

The FRE must remain a UI / UX layer.

---

# Deliverables

Produce:

---

## 1.

Executive summary

---

## 2.

Current journey analysis

---

## 3.

Problems discovered

Rank by severity.

---

## 4.

Design principles

Maximum 10.

---

## 5.

Complete First Run Experience

Describe every screen.

Every transition.

Every decision.

---

## 6.

Training specification

Detailed.

---

## 7.

Daily transition specification

Detailed.

---

## 8.

Persistent onboarding specification

Detailed.

---

## 9.

Error communication specification

Detailed.

---

## 10.

Replay loop specification

Detailed.

---

## 11.

Accessibility recommendations

---

## 12.

Acceptance criteria

List measurable UX objectives.

Example:

A new player understands movement before entering Daily.

A player never loses a Daily attempt unknowingly.

Training completion is remembered.

Etc.

---

## 13.

Implementation roadmap

Split the implementation into small Claude phases.

Do NOT write prompts.

Simply propose:

13A

13B

13C

...

Each phase must contain:

Goal

Estimated effort

Dependencies

Regression risk

Validation strategy

Forbidden changes

---

# Important instruction

Do not think like a developer.

Think like a Lead Product Designer responsible for the player's first ten minutes.

Every recommendation must improve understanding while preserving the technical architecture already in place.

If two solutions are possible, always prefer:

- lower implementation cost
- lower regression risk
- lower cognitive load
- higher player confidence

---

# Final verdict

Conclude by answering:

- What should the player's first 10 minutes feel like?
- At what exact moment should the player be ready for Daily?
- Which screens should disappear entirely?
- Which screens should be redesigned?
- Which existing screens are already good enough to leave untouched?

Do not generate code.

Do not modify files.

Do not propose implementation details beyond the requested roadmap.