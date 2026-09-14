/**
 * Phase 13E — the three in-run coach marks of the Guided First Run.
 *
 * Plain data only (no JSX, no React, no Phaser) so it can be imported both by
 * `GameScreen.tsx` and by tests without a DOM — the same convention
 * `modeGuidance.ts` already established for Phase 13A.
 *
 * Canonical contract (docs/Brainstorm/PHASE-13-PLAN-FIRST-RUN-EXPERIENCE.md
 * §4 principle 3 "Three verbs, one run", §6 Training spec, §7 teaching order):
 *
 *   Move → Avoid → Collect
 *
 * and nothing else. Tokens, combo maths, power-ups, charge, zones, stars,
 * streaks, badges, prices, Pi, ranked attempts are all deliberately NOT taught
 * in the first run — each is either self-discovered or belongs to the
 * post-Daily lesson (13F).
 *
 * TIMING IS UI-ONLY AND DETERMINISTIC. The schedule below is measured from the
 * moment GameScreen mounts, never from gameplay RNG, never from a particular
 * spawned object, and it never influences spawn timing. `MainScene` draws its
 * world procedurally with no preloader, so gameplay is on screen within the
 * first Phaser tick and the 2 s lead-in lands on a visible, already-running
 * game. Cues never overlap (a clear gap separates each from the next) and the
 * whole sequence is finished at 17 s — comfortably inside the first third of
 * the 60 s run, and never anywhere near the finish.
 *
 * ORDER RATIONALE (§7): Avoid is taught before Collect because collecting is
 * intrinsically self-rewarding and discovered in seconds, whereas being hit
 * produces a red flash and a penalty with no explanation.
 *
 * COPY RATIONALE: "Avoid the red hazard" — not the design document's older
 * "Avoid the red spikes" example — because the object the runtime actually
 * renders is the red hazard diamond. Onboarding must stay visually honest.
 */

/** Stable identity per cue (also the React key and the CSS modifier). */
export type CoachMarkId = "move" | "avoid" | "collect";

export interface CoachMark {
  id: CoachMarkId;
  /** ≤5 words, readable at a glance while playing (§4 principle 6). */
  text: string;
  /** Milliseconds after the guided run mounts at which the cue appears. */
  atMs: number;
  /** Milliseconds the cue stays on screen before auto-dismissing. */
  durationMs: number;
}

/**
 * The complete, ordered instructional layer of the first run. Three entries —
 * expanding this list is a product decision, not an implementation detail.
 */
export const COACH_MARKS: readonly CoachMark[] = [
  { id: "move", text: "Swipe to change lane", atMs: 2000, durationMs: 4000 },
  { id: "avoid", text: "Avoid the red hazard", atMs: 7500, durationMs: 4000 },
  { id: "collect", text: "Grab the gold", atMs: 13000, durationMs: 4000 },
];

/** When the last cue finishes — the moment `coachMarksSeen` may be recorded. */
export const COACH_MARKS_END_MS =
  COACH_MARKS[COACH_MARKS.length - 1].atMs +
  COACH_MARKS[COACH_MARKS.length - 1].durationMs;

/** Word count of a cue, for the ≤5-words rule. */
export function coachMarkWordCount(mark: CoachMark): number {
  return mark.text.trim().split(/\s+/).length;
}
