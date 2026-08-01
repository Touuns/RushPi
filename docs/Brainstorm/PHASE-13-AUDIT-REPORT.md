# RUSH PI — PHASE 13 PRODUCT & TECHNICAL AUDIT

**Repository:** Touuns/RushPi
**Audited commit:** `e0391bbe33d9631637ce523732449fdbd81c6db6` (origin/main)
**Date:** 2026-07-31
**Scope:** Read-only product and technical audit. No code changes, no commit, no push, no deployment.

---

## 1. Executive summary

Rush Pi is a technically sound, visually polished product with a **comprehension problem, not a capability problem**. The engine is lean (60 FPS at 6× CPU throttle, ~5 live objects), the ranked pipeline is genuinely well-designed (server-side claim, digest idempotency, no client-trusted identity), and Daily's visual feedback (Phase 12B) is good. But a first-time player is funnelled straight into the ranked, 3-attempts-a-day mode; the practice mode is a tertiary button with no intro; the tutorial legend shows icons that do not match the in-game art; controls are never taught; and the entire product has **zero audio**. The next initiative should be first-run comprehension — not Season 2, not a refactor, not performance.

---

## 2. Repository and runtime validation

| Check | Result |
|---|---|
| `origin/main` | `e0391bbe33d9631637ce523732449fdbd81c6db6` ✔ matches expected; HEAD identical |
| Tracked working tree | Clean (`git status --short` shows only the 37 pre-existing untracked `docs/Brainstorm/*.md`, unmodified) |
| `npm test` | **104 passed / 0 failed** |
| `logos:verify` / `logos:selftest` | OK (22 outputs, 11 receipts) / OK (175 checks) |
| `registry:validate` / `parity` / `selftest` | OK (36 entries) / OK / OK |
| `registry:v2:validate` / `v2:selftest` | OK (250 entries) / OK |
| `npx tsc --noEmit` / `tsc -p api/tsconfig.json` | Exit 0 / Exit 0 |
| `npm run build` | Success — 1,771 kB JS (**429 kB gzip, single chunk**), 29 kB CSS |
| `git diff --check` | Clean |

**Local limitation (documented, no files changed):** under `npm run dev` Vite does not serve `/api/*`. `/api/market/daily-challenge` returns the SPA document → Daily preparation fails with "Network error reaching the market service". All Daily observations below are from the local-fallback path or source. Player localStorage was captured before testing and **restored byte-exact** afterwards (verified). Dev server stopped cleanly.

---

## 3. Scorecard

| Area | Score | Strongest | Weakest | +1 point requires |
|---|---|---|---|---|
| Core gameplay feel | **6** | Shape language (round=collect, ✕-diamond=avoid) + i-frames/slow-down after a hit | Logical lane flips instantly while the orb takes ~110 ms to arrive | Align collision lane with the visual transition |
| Onboarding | **4** | Per-mode intro modals exist and are re-openable via "?" | No control teaching; Training hidden; legend icons ≠ game art | One guided, playable first run |
| Objective clarity | **6** | Single-slot status channel (Shield > Magnet > event) never stacks | No in-run legend; "Tokens Collected" duplicated on results | Persistent, glanceable "what am I collecting" cue |
| Progression & retention | **6** | Streaks + 43 badges + stars + XP, all wired | Leaderboard opens on an empty *Local* tab; Profile shows a stale "Best Daily" | Default to the competitive Daily tab; fix the best-score split |
| Audio & visual polish | **4** | Daily FX discipline (pooled labels, separated channels, reduced-motion) | **Zero audio anywhere**; 12B polish is Daily-only | Any sound layer at all |
| Technical health | **7** | Ranked integrity: server claim, no client identity, digest idempotency | Tests cover only logos/registry; dead CoinGecko texture path | Tests on scoring/determinism/storage |
| Mobile readiness | **7** | 60 FPS at 6× throttle; Home fits 375×667 and 414×736 with no scroll | 429 kB gzip single chunk; Daily result actions below the fold | Code-split Phaser; shorten the Daily result |
| Production readiness | **6** | Deploys; graceful degradation everywhere; strict TS both sides | No favicon/manifest; silent degraded Daily; no audio | Ship onboarding + close the score ceiling |

---

## 4. Core gameplay findings

- **Lane change is instant logically, ~110 ms visually.** `MainScene.moveLane()` sets `currentLane` immediately; collisions test `obj.lane === this.currentLane` (`MainScene.ts:846`), never the orb's x. *LIVE OBSERVATION* via `window.__rushpi`: at t=0 `lane=2, x=207`; the orb only reaches lane 2's centre (x=345) at ~125 ms. **Impact:** you get hit while your orb is visibly still in the safe lane, and you dodge before it visibly leaves. At end-of-run speed (480 px/s) an object crosses ~58 px in that window — enough to fully enter or leave the 40 px collision band during the transition. Frequency: every lane change near an object. Severity **HIGH**, effort **S**, regression risk **HIGH** (alters ranked scoring → needs a `rulesVersion` bump; all existing scores become incomparable).
- **The main weakness is feedback, not input, balance or readability.** Pacing (820→420 ms spawns, 220→480 px/s), fairness rails (i-frames, slow-down, `pickObstacleLane` anti-superposition) and readability are all well-tuned. What is missing is the *response* to player action. Severity **HIGH**.
- **Non-Daily modes are mechanically identical but feel dead.** *LIVE OBSERVATION*: Training renders plain orbs, no "+N" labels, no combo milestones, no intro, no production art — all of Phase 12B is `mode === "daily"`-gated (`MainScene.ts:423,1145,1592`). The mode a beginner learns in has the least feedback. Severity **MEDIUM**, effort **M**.
- **Track motion is thin.** `drawRoad()` re-tessellates a static trapezoid every frame (`track.ts:168`) yet only 5 chevrons convey speed. Severity **LOW**/POLISH, effort **S**.

---

## 5. Onboarding findings

- **A new player's first tap goes to a ranked, attempt-limited mode.** *LIVE OBSERVATION* (cleared storage, 375×667): Home's primary CTA is "Daily Run · RANKED"; **Training is a small tertiary button under "MORE" and has no intro modal at all** (`ModeIntroModal` covers only `daily | survival | campaign`). Severity **HIGH**, effort **S**, regression risk **LOW**.
- **The tutorial legend contradicts the game art.** *LIVE OBSERVATION*: codepoints U+1FA99 🪙, U+1F7E8 🟨, **U+1F53B 🔻 (a triangle) labelled "Red diamond"**, U+1F6E1, U+1F9F2. The real collectibles are a logo disc, a gold/violet chain block and a red diamond with a white ✕. The screen meant to teach recognition teaches the wrong shapes. Severity **HIGH**, effort **XS**, risk **LOW**.
- **Controls are never explained anywhere a player will read them.** The only hint is the lowest-priority grey line on Home ("Swipe or use ← → to switch lanes"), which the intro modal covers, and it leads with a desktop control on a mobile-first product. The Daily modal's 7 bullets + 5 legend rows say nothing about input. Severity **HIGH**, effort **XS**.
- **Quitting a ranked Daily silently burns an attempt.** The attempt is reserved server-side *before* the run (`claim-attempt.ts`, by design), but the quit dialog says only "Your current run progress will be lost" (`GameScreen.tsx:229`). A mis-tapped back arrow at second 3 costs 1 of 3. Severity **MEDIUM**, effort **XS**, risk **LOW**.
- **Degraded Daily is invisible.** *LIVE OBSERVATION*: with no manifest, "Play locally" starts a Daily run with **zero tokens** and no Tokens chip; the result reads "Tokens Collected 0/0". The mode's defining feature is absent with no explanation. Severity **MEDIUM**, effort **S**.

---

## 6. Objective clarity findings

- Present and good: single-slot status channel, Tokens X/N chip, low-time state, lives/charge/progress rows. No overload observed at any viewport.
- **Absent:** any in-run reminder of what a token is worth vs a Chain Block; the token toast (symbol + points + price) is the only cue and lasts 1 s.
- **Duplicated:** "Tokens Collected" appears twice on the Daily result (`token-summary` **and** `KeyStats`) — *LIVE OBSERVATION*. Severity **LOW**, effort **XS**.
- **Too late:** the Daily result screen requires scrolling to reach "Play Again" (*LIVE OBSERVATION*: `scrollH` 939 px vs 667 px viewport, actions at y=711). Training's result fits. Severity **MEDIUM**, effort **S**.
- Campaign levels 2 and 7 grant a **free second star**: 2★ is "Finish with at least 1 life", but `reachedFinish` already requires `lives > 0` (`MainScene.ts:2188`). *SOURCE INSPECTION*. Severity **LOW**, effort **XS**.

---

## 7. Progression and retention findings

- Immediate motivation: **adequate** (score, combo, +N, badges, XP). Medium-term: **adequate** (streaks, 3 attempts, 8 campaign levels, 43 badges). Long-term: **thin** — after Season 1 and the badge set there is no goal.
- **Excessive local-only progression.** Survival, Campaign, XP, level, badges, streaks and 24 stars are all localStorage; only the Daily score reaches the server. Clearing the browser erases everything except server attempts.
- **The leaderboard opens on the least motivating tab.** *LIVE OBSERVATION*: default tab is **Local** — for a new player, "No Daily runs yet." The Daily/Global tabs (other Pioneers, the actual social pull) are unloaded behind a tap.
- **Profile shows the wrong best score.** `ProfileScreen.tsx:111` renders `profile.bestDailyScore` (legacy v1) while `HomeScreen.tsx:162` renders `bestDailyTokenRushScore` (v2). Real Daily runs always carry `rulesVersion: 2` and only write the v2 field (`storage.ts:455`), so **Profile's "Best Daily" stays 0 forever** for any Token Rush player. *SOURCE INSPECTION*, high confidence. Severity **MEDIUM**, effort **XS**, risk **LOW**.
- Modes are disconnected: Campaign/Survival mastery feeds nothing the Daily player sees.

---

## 8. Audio and visual polish findings

- **There is no audio in the product.** *LIVE + SOURCE*: zero matches for sound/audio/music/AudioContext/vibrate across `src/`, `api/`, `index.html`; zero `.mp3/.ogg/.wav/.m4a` files in `public/`. No collect sound, no hit sound, no combo cue, no music, no haptics. This is the single largest missing feedback channel. Severity **HIGH**, effort **L**.
- Essential feedback present (visual only): +N collect labels, −N/COMBO LOST impact, combo milestones, power-up rings, expiry pulses, FINISH gate, zone gates — all Daily-only and all well-engineered (pooled objects, separated bands, no per-collect allocation, `reducedMotion` honoured).
- Optional polish: RUSH! intro, tunnel arcs, zone decor. Distracting: none observed. Performance-sensitive: none — object counts stayed at 4–7.
- **Polish should not be the next initiative.** The visual channel is already ahead of the comprehension layer; adding more will not help a player who does not understand the game.

---

## 9. Technical health findings

- **Architecture is genuinely clean.** Phaser owns the loop, React owns UI, the bridge is two events; tuning is centralised in `gameConfig.ts`/`theme.ts`; strict TS on both sides; every network path fails soft.
- **Ranked integrity is strong**: identity from the verified Pi token only, challenge date/id from the server reservation, manifest rebuilt and token points recomputed server-side, canonical digest, atomic finalize, replay cannot flip a rejected score to ranked.
- **But the score ceiling is loose.** `LIMITS.maxScore = 50000` (`submit-score.ts:39`) against a theoretical maximum of roughly 14,000 (11,250 token + ~1,900 blocks + 300 survival + 500 clean). A modified client can submit ~3.5× a perfect run and pass every check. Severity **HIGH**, effort **XS**, risk **LOW** (tighten the ceiling; the digest and reconciliation stay unchanged).
- **Dead legacy CoinGecko texture path.** `registerTokenTextures()` uploads 15 `token:<id>` textures every Daily run (`MainScene.ts:384`) that **nothing ever draws** — `makeTokenCollectible` renders only the verified `token-logo:<id>:v<n>` key. `preloadTokenLogos()` still hotlinks 15 CoinGecko images inside the ranked prep `Promise.all`, adding an external dependency to the critical path for no render benefit (the result-screen `<img>` loads independently). Severity **MEDIUM**, effort **S**, risk **LOW**.
- **Test coverage is one subsystem.** 9 test files / 53 sources, all logo/registry. **Zero tests** on scoring, collisions, `recordRun`, badges, streaks, campaign stars, seeded-RNG determinism or any API handler — i.e. none on the integrity-sensitive code. Severity **MEDIUM**, effort **M**.
- **Bundle:** 429 kB gzip in one chunk; Phaser loads even for a player who only opens Profile. Severity **MEDIUM**, effort **S**.
- Minor: `/favicon.ico` 404 (*LIVE*), no web manifest; a React `fetchPriority` casing warning (`App.tsx:446`); `objects` array pruned only when `length % 8 === 0`; `drawRoad()` redrawn every frame with `driftX` always 0 outside Survival; `window.__rushpi` keeps a destroyed game (DEV only).
- No hidden coupling or duplicated systems of concern found. **No refactor is warranted for its own sake.**

---

## 10. Top ten prioritized improvements

| # | Improvement | Player problem | Impact / Effort / Risk | Ranks above next because |
|---|---|---|---|---|
| 1 | Honest legend + control teaching in the intro modal | Legend shows a triangle for a diamond; input never explained | High / **XS** / LOW | Cheapest fix to the most frequent failure; unblocks everything else |
| 2 | Make Training the explicit "first run", with its own intro | Beginners burn ranked attempts learning | High / **S** / LOW | Removes the worst FTUE trap; pure navigation change |
| 3 | Tighten `maxScore` to a real ceiling | Cheated scores can top the ranked board | High / **XS** / LOW | Protects the one thing that is server-authoritative |
| 4 | Warn that quitting a ranked Daily uses the attempt | Silent loss of 1 of 3 | Med-High / **XS** / LOW | One string; removes a trust-breaking surprise |
| 5 | Fix Profile "Best Daily" (v2 field) | Profile permanently shows 0 | Medium / **XS** / LOW | One-line correctness bug on a progression screen |
| 6 | Daily result: actions above the fold, de-duplicate stats | Must scroll to replay after every run | Medium / **S** / LOW | Sits on the replay loop, the retention hinge |
| 7 | Leaderboard defaults to the Daily tab | Opens on an empty self-list | Medium / **XS** / LOW | Turns a dead screen into the social hook |
| 8 | Audio layer (collect / hit / combo / finish + mute) | No auditory feedback at all | High / **L** / LOW-MED | Highest raw impact, but far costlier than 1–7 |
| 9 | Retire the dead CoinGecko texture path | External dependency on the ranked critical path | Medium / **S** / LOW | Cleanup that must precede audio/asset work |
| 10 | Align collision lane with the visual transition | Hits that look unfair | High / **S** / **HIGH** | Last despite high impact: changes ranked scoring, needs a rules-version plan |

---

## 11. Recommended next major initiative

**First-Run Comprehension — teach the game inside the game.**

- **Why it is the bottleneck:** every finding in §5 fires on 100% of new players, before any of the game's real strengths are reachable. The engine, the ranked pipeline and the Daily visual polish are all ahead of the layer that gets a player to understand and trust them.
- **Why before the alternatives:** audio (§8) is higher raw impact but ~5× the cost and does not help a confused player; input fairness (§4) is high impact but changes ranked scoring and must be gated behind a `rulesVersion` bump; performance is a non-issue (60 FPS at 6× throttle); Season 2 is explicitly premature.
- **Out of scope:** all gameplay constants, collision rules, scoring, the Daily seed/determinism, the token manifest and logo system, anti-cheat, Survival/Campaign mechanics, audio, and any new art pipeline.
- **Expected benefit:** a new player finishes their first run understanding what to collect, what to avoid, how to move, and what the Daily costs them — without spending a ranked attempt.
- **Size:** **M–L** (roughly 1–1.5 weeks across four mergeable phases).
- **Risks:** scope creep into HUD redesign; over-long modals; touching Daily-only FX code. Mitigation: UI-layer-only changes, phase-by-phase forbidden-change lists.
- **Acceptance criteria:**
  1. A first-launch player reaches a completed Training run without connecting Pi and without consuming an attempt.
  2. The legend renders the game's actual collectible art, verified side-by-side.
  3. Controls are stated on the preparation screen and in the first run.
  4. Quitting a ranked Daily shows the attempt cost.
  5. No change to any value in `gameConfig.ts`, no change to the Daily seed; `npm test` + both `tsc` + `build` stay green.

---

## 12. Phased roadmap

### Next initiative — four independently mergeable phases

| Phase | Goal | Scope | Forbidden | Validation | Effort | Depends on |
|---|---|---|---|---|---|---|
| 13A | Honest legend | Replace emoji with the real rendered collectible art in `ModeIntroModal`; add a control line | Any gameplay/HUD change | Visual diff modal vs in-run art at 375/414 | S | — |
| 13B | Training as the front door | Promote Training to a first-class mode card; add a Training intro; route first-launch there | Ranked flow, attempt logic, Daily prep | FTUE walkthrough on cleared storage | S | 13A |
| 13C | Honest costs | Attempt cost in the quit dialog; "no tokens today" notice on a manifest-less Daily | Server claim/submit logic | Quit at t=3 s; force manifest failure | XS | — |
| 13D | First-run reinforcement | Non-blocking first-run coach marks in Training (lane hint, collect, avoid), once only | Timer, spawns, RNG, Daily modes | Second run shows nothing; determinism unchanged | M | 13B |

### Immediate fixes (max five, XS/S, before 13A)

1. Tighten `LIMITS.maxScore` to a defensible ceiling (**XS**).
2. Profile "Best Daily" → `bestDailyTokenRushScore` (**XS**).
3. Leaderboard default tab → Daily (**XS**).
4. De-duplicate "Tokens Collected" and lift the Daily result actions above the fold (**S**).
5. Add a favicon; fix the `fetchPriority` casing warning (**XS**).

### Later initiatives, in order

1. **Audio system** — wait until players understand what the sounds mean; it is the largest remaining gap but the costliest.
2. **Feel & fairness (input alignment + non-Daily feedback parity)** — wait because it changes ranked scoring semantics and needs a `rulesVersion` bump plus a leaderboard-reset decision.
3. **Technical hardening (tests on scoring/determinism/storage, retire the CoinGecko path, code-split Phaser)** — wait because nothing is currently failing; do it before, not after, the feel rework it will protect.

---

## 13. Risks and unknowns

- *NOT VERIFIABLE LOCALLY*: the real Daily path (manifest fetch, claim, ranked submit, token logos, production Daily background and Finish Portal), Pi Browser authentication and payments, real-device touch drag, and Supabase behaviour. All Daily conclusions above are from the local-fallback run plus source.
- *INFERENCE*, not confirmed: whether the 110 ms lane-change window is perceived as unfair by real players — the mechanism is confirmed, the perception is not. Worth one playtest before scheduling the fix.
- The `maxScore` ceiling has not been observed being exploited; the gap is arithmetic, not an incident.
- Tightening the ceiling or changing collision timing invalidates comparability with existing ranked scores — a product decision, not a technical one.

---

## 14. Final verdict

- **Biggest weakness:** first-run comprehension — a new player is pushed into the ranked, attempt-limited mode with a legend that shows the wrong shapes and no explanation of the controls.
- **Strongest feature:** the ranked Daily pipeline's integrity — server-side attempt reservation, no client-trusted identity, server-recomputed token points, canonical digest and atomic finalize. The Token Logo System is a close second.
- **Build next:** First-Run Comprehension (§11), preceded by the five immediate fixes.
- **Do not build yet:** Season 2, an economy or shop, a refactor, performance work, and the collision-timing fix (it changes ranked scoring and needs a rules-version plan first).
- **Ready for broader player testing?** **Yes, with the five immediate fixes and Phase 13A/13C shipped first.** The build is stable, fast and never blocks the player; it is the first ten minutes, not the engine, that will cost you testers.

---

### Evidence legend

| Label | Meaning |
|---|---|
| *LIVE OBSERVATION* | Verified in the browser against `localhost:5173` during this audit |
| *SOURCE INSPECTION* | Verified by reading the code at the audited commit |
| *INFERENCE* | Reasoned conclusion, not directly observed — flagged as such |
| *NOT VERIFIABLE LOCALLY* | Requires the deployed environment or Pi Browser |

**Severity:** BLOCKER · HIGH · MEDIUM · LOW · POLISH
**Effort:** XS (<½ day) · S (~1 day) · M (2–4 days) · L (~1 week) · XL (multiple weeks)

---

*Audit performed read-only. No tracked file was modified, no commit, no push, no deployment. Browser player data was captured before testing and restored byte-exact afterwards.*
