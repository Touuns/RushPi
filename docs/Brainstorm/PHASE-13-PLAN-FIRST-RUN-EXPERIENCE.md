# PHASE 13-PLAN — FIRST RUN EXPERIENCE DESIGN

> **Document status:** Approved product specification<br>
> **Canonical reference:** Yes<br>
> **Implementation roadmap:** Phases 13A–13F<br>
> **Implementation started:** No

**Repository:** Touuns/RushPi
**Baseline commit:** `origin/main = e0391bbe33d9631637ce523732449fdbd81c6db6`
**Date:** 2026-07-31
**Type:** Product design & UX architecture specification — **not** an implementation phase.
**Companion document:** [PHASE-13-AUDIT-REPORT.md](./PHASE-13-AUDIT-REPORT.md)

**Baseline verified:** `origin/main` = `HEAD` = `e0391bbe33d9631637ce523732449fdbd81c6db6`. Tracked tree clean; 38 untracked docs (37 pre-existing + the Phase 13 audit report). Read-only session — nothing written, no code, no prototype.

---

## 1. Executive summary

Rush Pi teaches nothing and asks everything. A first-time player is shown a decision screen before they have any basis for a decision, then pushed into a ranked mode that costs one of three daily attempts. The fix is not a tutorial screen — it is a **reordering of the first session**. Onboarding must span **two runs, not one**: run 1 (Training) teaches the three verbs (move, avoid, collect); the first Daily *result* teaches the meta (tokens, ranking, streak, return tomorrow). Everything needed already exists — Training requires no network and no auth, and its Time-Attack rules already guarantee the player cannot fail. The FRE is therefore a pure UI/UX layer: no gameplay constant, no collision rule, no scoring path, no determinism, no server contract changes.

---

## 2. Current journey analysis

| Step | Player objective | Emotion | Info required | Info missing | Friction / opportunity |
|---|---|---|---|---|---|
| Launch | "What is this?" | Curious | What the game is | Everything — no orientation | Blank slate; **cheapest moment to teach** |
| Home | Choose | Overwhelmed | Which mode is for me | Which mode is *safe* | 3 mode cards + 3 "More" buttons + profile strip = 7 choices, zero basis |
| Profile strip | — | Deflated | — | — | Second-most prominent element shows Lv 1 / 0 badges / 0 streak / 0 best — **four zeros before any play** |
| Mode select | Start playing | Impatient | Cost of each mode | That Daily costs 1 of 3 | "RANKED" tag is unexplained; Training hidden in "More" with no intro |
| Intro modal | Understand | Reading fatigue | Controls, what to collect/avoid | **Controls never mentioned**; legend icons ≠ game art | 7 bullets + 5 legend rows, scrolls on 375 px; opportunity: replace with play |
| Pi gate | Play | Blocked | Why login is needed | Why *now*, before seeing the game | Hard interstitial before the primary CTA on run #1 |
| Preparation | Wait | Neutral | Progress | — | Good screen; **unused teaching surface** (2–4 s of dead time) |
| Gameplay | Survive & score | Confused, then engaged | What hurts, what pays | No in-run legend; Training has none of the Daily feedback | Objects are readable; the *rules* are not |
| Result | "How did I do?" | Uncertain | Was that good? What now? | No benchmark; attempts left never shown | Daily actions **below the fold**; "Tokens Collected" printed twice |
| Replay | Go again | Motivated | Cost of another run | That "Play Again" spends attempt 2 of 3 | Primary CTA silently consumes a ranked attempt |
| Return tomorrow | — | — | Why come back | Streak line appears only after a Daily run | Only retention hook is one sentence on one screen |

---

## 3. Problems discovered (ranked by severity)

| # | Problem | Severity |
|---|---|---|
| 1 | First tap leads to a ranked, attempt-limited mode; the safe practice mode is a tertiary button with no intro | **BLOCKER** for comprehension |
| 2 | Controls are never taught on any screen a new player will read | **HIGH** |
| 3 | Tutorial legend shows generic emoji (a **triangle** labelled "Red diamond") that contradict the actual art | **HIGH** |
| 4 | "Play Again" on a Daily result spends another ranked attempt with no warning; attempts left never shown on that screen | **HIGH** |
| 5 | Quitting a ranked Daily burns the attempt; the dialog mentions only "run progress" | **HIGH** |
| 6 | Home opens on four zeros — the app's second-strongest visual is the player's emptiness | **MEDIUM** |
| 7 | Daily result requires scrolling to reach the replay action; stats duplicated | **MEDIUM** |
| 8 | Leaderboard opens on the Local tab — an empty self-list — hiding the only social pull | **MEDIUM** |
| 9 | Training/Survival/Campaign receive none of the Daily feedback layer; the learning mode feels dead | **MEDIUM** |
| 10 | Error copy leaks jargon ("market service", "manifest", "migration") | **LOW** |

---

## 4. Design principles (8)

1. **The first screen is the game, not a menu.** Menus are decisions; a new player has no basis for one.
2. **Teach the punishing thing before the rewarding thing.** Collecting is self-discovered; being hit is not.
3. **Three verbs, one run.** Move, avoid, collect. Everything else waits.
4. **The meta is taught after the first Daily, not before it.** Streaks, ranking and tokens are meaningless until a score exists.
5. **Never spend a player's attempt without saying so first.**
6. **Five words or fewer per in-run cue.** Interaction over reading.
7. **Once understood, never repeated.** Every hint is once-only and permanently dismissible.
8. **When two designs work, choose the one that adds no screen.**

---

## 5. Complete First Run Experience

**Entry decision — no Welcome screen, no Home first.** On first launch (no `rushpi.save`), the app opens **directly into the Guided First Run** in Training. Rationale: Training is the only mode that needs zero network and zero auth, so it is the fastest thing the app can render; a welcome screen is text, and text is what we are removing. A persistent **"Skip →"** sits top-right from frame 1 — the player is never trapped.

### Screen-by-screen

| # | Screen | Purpose | Primary | Secondary | Max text | Notes |
|---|---|---|---|---|---|---|
| 1 | **Guided First Run** (Training, unmodified rules) | Teach 3 verbs | Play | Skip → | 3 cues × ≤5 words | Coach marks are non-blocking overlays; timer, spawns and RNG untouched |
| 2 | **First Result** | Confirm success, name the next step | "Try the Daily Run" | "Play again" / "Explore" | 1 headline + 1 line | Show **no score judgement** — headline is "You've got it", score shown small |
| 3 | **Home** (from here on, forever) | Choose | Daily Run | Survival / Campaign / Training / Leaderboard / Profile | unchanged | On a save with a completed first run, Home is exactly today's Home |
| 4 | **Daily intro** (once) | Explain what Daily costs and pays | Connect Pi | Play locally / Cancel | 4 lines | Merges today's two Home modals into the existing preparation screen |
| 5 | **Preparation** | Load + teach one thing | — | Cancel | 1 rotating line | Reuse the 2–4 s of dead time for a single tip (tokens / power-ups / combo) |
| 6 | **First Daily Result** | Teach the meta | Leaderboard | Play again (n left) / Home | unchanged layout | Only here do streak, ranking and "come back tomorrow" appear for the first time |

### Transitions

- 1 → 2 automatic at the 60 s finish.
- 2 → 3 on any action.
- 2 → 4 if the player taps "Try the Daily Run".
- 4 → 5 → gameplay unchanged.
- **Skip** at any point jumps to Home and marks the first run complete (the player chose; do not re-offer).

**The exact moment the player becomes free:** the instant the first result appears. From then on Home is the permanent entry point and no onboarding surface ever auto-opens again.

### Information architecture — every screen

Two views of the same table: **actions** first, then **hierarchy and limits**. Screens marked *(new)* exist only in the FRE; all others are today's screens with their target values.

#### A. Actions

| Screen | Purpose | Primary action | Secondary action | Optional action |
|---|---|---|---|---|
| **Guided First Run** *(new)* | Teach the three verbs | The run itself — no button competes with it | Skip → | — |
| **First Result** *(new)* | Confirm success, name the next step | Try the Daily Run | Play again | Explore (→ Home) |
| **Home** | Choose a mode | Daily Run | Survival · Campaign | Training · Leaderboard · Profile · per-mode "?" · Connect Pi · Profile strip |
| **Mode intro modal** | Answer "what is this mode?" | Play | Close | — |
| **Daily preparation** | Load, reserve, teach one tip | None — the screen completes itself | Cancel | Retry · Reconnect Pi · Play locally *(error states only)* |
| **Gameplay** (all modes) | Play | The run | Quit (back arrow → confirmation) | — |
| **Daily result** | Report the run, re-engage | Play again *(n left)* | Leaderboard | Back Home · View details · Retry sync |
| **Training result** | Confirm, re-engage | Play again | Back Home | — |
| **Survival result** | Report a personal best | Play again | Back Home | View details |
| **Campaign result** | Report stars and progress | Next Level *(or Retry if failed)* | Back to Campaign | Retry *(when Next Level exists)* |
| **Campaign select** | Choose a level | Tap an unlocked level | Back Home | — |
| **Leaderboard** | Show where the player stands | Daily tab *(default)* | Global tab · Local tab | Play Daily Run · Back Home |
| **Profile** | Show identity and progress | Back Home | Motion preference | Reset local data · Pi panel · Market preview |

#### B. Hierarchy and limits

| Screen | Information hierarchy (top → bottom) | Visual priority | Max text | Max buttons | Max interruptions |
|---|---|---|---|---|---|
| **Guided First Run** | Play line → coach mark → Skip | The orb and the incoming object | 3 cues × ≤5 words | 1 | 3 (non-blocking, auto-dismiss) |
| **First Result** | "You've got it" → next step → score *(small)* → alternatives | Headline, then the primary CTA | 1 headline + 1 line | 3 | 0 |
| **Home** | Brand → today's challenge → Daily card → secondary modes → More → control hint | The Daily card, unchallenged | Unchanged | **11 tappables today → target ≤8** | 0 (both current modals move to preparation) |
| **Mode intro modal** | Title → 3–5 points → legend *(real art)* → footnote → Play | The legend — it is the reason the screen exists | **≤6 lines** (12 today) | 2 | 1 (itself, once per mode) |
| **Daily preparation** | Title → progress → step label → one tip → Cancel | The step label | 2 lines | 1 (3 in error states) | 0 |
| **Gameplay** | Score/Time/Combo → Tokens n/N → single status chip → quit arrow | The play line, never the HUD | HUD labels only | 1 | 0 (quit is user-initiated) |
| **Daily result** | Score → attempts left → token summary → sync status → **actions** → collapsed details | Score, then Play again | ≤8 lines above the fold | 3 + details | 1 (last-attempt confirm, once ever) |
| **Training result** | Outcome → 3 key stats → actions | Play again | ≤5 lines | 2 *(Leaderboard removed)* | 0 |
| **Survival result** | Outcome → time/zone/charge → actions → details | Time survived | ≤5 lines | 2 | 0 |
| **Campaign result** | Complete/Failed → stars → objectives → key stats → actions | The three objective rows — they drive replay | ≤6 lines | 3 | 0 |
| **Campaign select** | Title → level cards *(state, name, 3 objectives, best)* | Next playable level | Unchanged | 9 (8 levels + Home) | 0 |
| **Leaderboard** | Title → tabs → list → actions | The list | Unchanged | 5 | 0 |
| **Profile** | Identity → level/XP → **motion preference** → stats → badges → history → campaign → Pi | Identity and XP | Unchanged | Unchanged | 0 |

**Three rules this table encodes.** (1) *One primary action per screen* — no screen offers two equal-weight paths except the First Result, where the choice is the point. (2) *Interruptions only ever fire once* — every non-zero value in the last column is gated by a persistence key from §9. (3) *Actions before details, always* — every result screen places its buttons above any collapsible block, which is the single change that fixes the Daily fold.

---

## 6. Training specification

| Dimension | Decision | Why |
|---|---|---|
| Teaches | Lane movement · hazards hurt · collectibles pay · a run is 60 s | The minimum set that makes Daily legible |
| Deliberately does NOT teach | Tokens, combo maths, power-ups, charge, zones, stars, streaks, badges, prices, Pi, attempts | Each is either self-discovered or belongs to the post-Daily lesson |
| Duration | The existing 60 s run — **no new mode, no timer change** | Zero regression surface |
| Concepts | **3** | Beyond three, retention collapses |
| Interruptions | **3 coach marks**, non-blocking, no pause, auto-dismiss | Principle 6 |
| Text | ≤5 words each ("Swipe to change lane", "Avoid the red spikes", "Grab the gold") | Readable at a glance while playing |
| Failure possible? | **No — and no change is needed.** Time Attack applies a score penalty and never ends the run | The existing rules already guarantee "always succeeds" |
| Always succeeds? | Yes. Every first run reaches the finish | Confidence, not mastery |
| Does score matter? | Not on run 1. Presented as an outcome, not a grade | A first score has no benchmark |
| Collectibles limited? | No | Any spawn change touches gameplay — forbidden |
| Hazards gradual? | Already are (820→420 ms, 220→480 px/s) | No change |
| Completion unlocks? | Nothing mechanical — only *permission*: Home's CTA becomes Daily and the app says "you're ready" | Avoids a progression system |

---

## 7. Teaching order (designed, not assumed)

**Move → Avoid → Collect → [finish] → Daily → Tokens & attempts → Leaderboard → Streak → Return tomorrow.**

Two deliberate departures from the example order:

- **Avoid is taught before Collect.** Collecting is intrinsically self-rewarding and is discovered within two seconds without instruction, whereas a hit produces a red flash and −50 with no explanation — the punishing mechanic is the one that needs the cue.
- **Power-ups and combo are removed from the first run entirely** and deferred to the Daily preparation tip and the existing in-run FX; they are optimisations, not rules, and a player who does not know them still finishes.

Profile and Leaderboard are deferred to after the first Daily because a leaderboard without a score on it is an empty room.

---

## 8. Daily transition specification

**Suggested, never automatic and never forced.** The first result offers "Try the Daily Run" as the primary action, but "Play again" and "Explore" are equals in weight, not greyed alternatives. No reward is attached to converting — a bribe would imply Training is a chore.

**Pi login happens after Training, never before.** Order: play → understand → *then* be asked for identity.

**Attempts are explained before login, not after.** The player must know what they are spending before they are asked to sign in. Today's connect modal already carries that line — keep the wording, move the surface into the preparation screen so Home sheds two modal states.

**The first Daily is presented differently — once.** A one-time panel names three facts: today's challenge has 15 tokens; you get 3 ranked runs a day; this is run 1 of 3. After that first presentation it never appears again; the attempt counter alone carries the information.

---

## 9. Persistent onboarding specification

| Key | Shown | Reset by |
|---|---|---|
| `firstRunCompleted` | Once ever — gates the auto-launch | "Reset local data" |
| `firstDailyResultSeen` | Once ever — gates the meta lesson (streak/leaderboard/tomorrow) | "Reset local data" |
| `modeIntroSeen[daily\|survival\|campaign\|training]` | Once per mode; always re-openable via "?" | Version bump on rules change (existing pattern, e.g. `daily:v2`) |
| `attemptCostAcknowledged` | Once — the "Play Again spends an attempt" confirmation | "Reset local data" |
| `coachMarksSeen` | Once — the 3 in-run cues | "Reset local data" |

**Shown every time (never suppressed):** attempts remaining, ranked/local status, quit confirmation, all error states, sync status. These are *state*, not *teaching* — suppressing them creates the silent-cost problems in §3.

**Shown only after updates:** a mode intro whose rules changed, via the existing key-version convention.

**Outside progression:** the motion preference lives outside progression and survives a reset — as it does today.

---

## 10. Error communication specification

| Situation | Today | Proposed (short, honest, no jargon) |
|---|---|---|
| Network unavailable | "Network error reaching the market service" | "Can't reach the server. Check your connection." |
| Daily unavailable | "Daily challenge unavailable" | "Today's challenge isn't ready yet. Try again in a moment." |
| No token manifest | *(silent — run starts with 0 tokens)* | "No tokens today — this run won't be ranked. Play anyway?" |
| Offline mode | "A local run is not ranked…" | Keep. Add: "Your 3 ranked runs are untouched." |
| Quit Daily | "Your current run progress will be lost." | "This ranked run is already counted. Quitting won't give the attempt back." |
| Attempt consumed | *(never stated)* | "Ranked run 2 of 3" — persistent, on preparation, HUD and result |
| Auth failure | "Your Pi session expired…" | Keep — already clear. |
| Leaderboard unavailable | "Server leaderboard unavailable. Showing nothing for now…" | "Can't load the leaderboard right now. Your scores are safe." |

**Rule:** never surface an internal code (`MIGRATION_REQUIRED`, "manifest", "market service") and always state what the player still *can* do.

---

## 11. Replay loop specification

| Result | Primary | Secondary | Leaderboard? | "Come back tomorrow"? |
|---|---|---|---|---|
| Training | Play again | Back Home | **Remove** — a Training score never appears there | No |
| Daily | **Play again (2 left)** — count in the label; confirm once on the last attempt | Leaderboard, Home | Yes — the natural next step | Yes, after the run |
| Campaign | Next Level (or Retry) | Back to Campaign | No | No |
| Survival | Play again | Back Home | No (correct today) | No |

Actions must sit **above the fold on 375 × 667** for every mode — today the Daily result places them at y≈711. Achieve it by moving the token breakdown behind the existing "View details" and deleting the duplicated "Tokens Collected" tile, **not** by adding a sticky bar.

Profile matters only when a badge or level-up fires; the leaderboard matters only after a ranked run.

---

## 12. Accessibility recommendations

- **Touch targets:** the "?" info button is **24 × 24 px** and sits inside a large tap target — below the 44 px minimum and highly mis-tappable. It is the only re-entry to the tutorial. Enlarge to 44 × 44 and separate it from the card's hit area. (`ScreenBackButton` is already a correct 44 × 44 with safe-area insets — leave it.)
- **Reading load:** the Daily intro is 12 lines and scrolls on 375 px. Target ≤6 lines with real art instead of emoji.
- **Colour reliance:** shape language is already strong (✕-diamond, chain block, disc) and the status channel already pairs an icon with each colour. Keep that rule for any new cue.
- **Small text:** in-canvas labels at 10–12 logical px render at ~9–11 CSS px on a 375 px device. Raise the token symbol tag and toast price to a 12 px logical floor.
- **Motion:** the preference exists and is well-designed (manual override because Pi Browser under-reports `prefers-reduced-motion`) but is buried below stats, 43 badges, history and 8 campaign rows. Surface it near the top of Profile, and offer it once in the first result.
- **One-handed use:** Home's primary CTA sits in the comfortable middle band — keep it there. Coach marks must never render in the bottom 20 % where the thumb rests.
- **Reduced motion parity:** coach marks must fade, never slide or pulse, when reduced motion is on.

---

## 13. Acceptance criteria

1. A new player completes a full run before any menu, any login, or any ranked attempt is offered.
2. A new player can state how to change lanes after the first run.
3. Every legend icon matches the collectible actually rendered in game, verified side-by-side at 375 and 414 px.
4. No ranked attempt is ever consumed without the cost being stated on the screen that consumes it.
5. The Daily result's primary action is reachable without scrolling at 375 × 667.
6. Streak, leaderboard and "come back tomorrow" appear for the first time only after a completed Daily run.
7. Every onboarding surface appears at most once and never re-opens automatically.
8. A returning player reaches gameplay in the same number of taps as today — the FRE is invisible to them.
9. No value in `gameConfig.ts`, no collision rule, no Daily seed, no scoring path and no server contract changes; `npm test`, both `tsc` passes and `build` stay green.

---

## 14. Implementation roadmap

| Phase | Goal | Effort | Depends | Regression risk | Validation | Forbidden |
|---|---|---|---|---|---|---|
| **13A** | Honest legend + one control line in `ModeIntroModal`; enlarge "?" to 44 px | XS | — | **LOW** (presentational) | Side-by-side modal vs in-run art, 375/414 | Any gameplay, HUD or scoring change |
| **13B** | Honest costs: attempt wording in the quit dialog, attempt count in the Daily "Play again" label, "no tokens today" notice | XS | — | **LOW** (copy + one counter read) | Quit at t=3 s; force a manifest failure | Server claim/submit logic, attempt accounting |
| **13C** | Daily result: delete the duplicated tile, move the token list behind "View details", actions above the fold | S | — | **LOW** (layout) | Measure action offset at 375 × 667 | Score, sync status, token data |
| **13D** | First-launch routing: auto-open the Guided First Run with a persistent Skip; `firstRunCompleted` flag | S | 13A | **MEDIUM** (App entry state — must not alter the returning-player path) | FTUE on cleared storage; returning-player tap count unchanged | Mode rules, timer, RNG, ranked flow |
| **13E** | Three non-blocking coach marks in the first Training run; first-result screen ("You've got it" + "Try the Daily Run") | M | 13D | **MEDIUM** (renders during a live run — must not pause, allocate per-frame, or touch `this.rng()`) | Second run shows nothing; Daily determinism byte-identical | Spawns, collisions, scoring, Daily-only FX code |
| **13F** | Meta lesson on the first Daily result; leaderboard defaults to Daily; one-time first-Daily panel | S | 13B, 13C | **LOW** | First vs second Daily result differ once, then never | Ranked submission, digest, anti-cheat |

**Sequencing.** Ship 13A–13C first: they are XS/S, carry no behavioural risk, and each independently removes a §3 problem. 13D–13E are the substance and must land together to be coherent. 13F closes the loop.

---

## 15. Final verdict

**What the first 10 minutes should feel like:** *"I played immediately, I understood without reading, and then I chose to compete."* Three moments in order — a run before a menu, a verb before a rule, a score before a leaderboard.

**The exact moment the player is ready for Daily:** when their first Training run reaches the finish. Not before (they have no verbs), not later (a second Training run teaches nothing new). Readiness is finishing one run, not scoring well in one.

**Screens that should disappear:** Home's two Daily modals — the "Connect to Pi" gate and the "No attempts left" dialog. Both duplicate states the preparation screen already handles (`auth`, `limit`) with better copy and a real "Play locally" fallback. Folding them there removes two modal states from Home and one branch from its logic.

**Screens that should be redesigned:** `ModeIntroModal` (legend and length), the Daily `ResultScreen` (fold, duplication, attempt cost), and Home's first-launch behaviour (it should not be the first thing seen).

**Screens already good enough to leave untouched:** the Campaign level select, the Daily preparation screen (only add one tip line), `ScreenBackButton`, the in-run HUD and its single-slot status channel, the Survival and Campaign result layouts, and the Profile — apart from surfacing the motion control and correcting the "Best Daily" field.

---

### Reference legend

**Severity:** BLOCKER · HIGH · MEDIUM · LOW · POLISH
**Effort:** XS (<½ day) · S (~1 day) · M (2–4 days) · L (~1 week) · XL (multiple weeks)
**Regression risk:** LOW (presentational / copy) · MEDIUM (entry state or in-run rendering) · HIGH (gameplay, scoring or determinism)

### Preserved by design

This specification changes no gameplay constant, collision rule, scoring path, Daily seed, token value, object lifecycle, rendering architecture, server validation, anti-cheat rule, logo system or registry. The First Run Experience is a UI/UX layer only.

---

*Design phase performed read-only. No file was modified, no code written, no branch, commit, push or deployment.*
