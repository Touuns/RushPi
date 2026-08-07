/**
 * Phase 13A / 13A-RV1 — honest, compact mode guidance content.
 *
 * Plain data only (no JSX) so it can be imported both by `ModeIntroModal.tsx`
 * (rendering) and by tests (content assertions) without pulling in React.
 *
 * Every line here is derived from the actual runtime behaviour — see
 * `src/game/scenes/MainScene.ts`, `src/game/dailyTokens.ts`,
 * `src/game/gameConfig.ts` and `src/game/campaign.ts` — never from the emoji
 * that used to stand in for these objects, and kept short on purpose: RV1
 * cut every line down from a documentation sentence to a scannable phrase.
 *
 * Shape mirrors the four-part flow every modal renders in:
 *   tagline (quick objective) -> rules (core rules) -> legend (objects) -> CTA.
 */

export type IntroMode = "daily" | "survival" | "campaign";

/**
 * Every legend mark is drawn as a small CSS shape (see `.legend-mark*` in
 * global.css) that mirrors the real in-game geometry/colour, never a bare
 * emoji standing in for the object.
 */
export type LegendMarkKind =
  | "token-published"
  | "chain-block"
  | "energy-orb"
  | "hazard"
  | "shield"
  | "magnet"
  | "life-orb"
  | "charge-aura"
  | "star"
  | "level-failed"
  | "finish-gate";

export interface LegendRow {
  mark: LegendMarkKind;
  /** Number of stars to render, only meaningful when mark === "star". */
  count?: number;
  name: string;
  effect: string;
}

export interface ModeGuidanceContent {
  title: string;
  /** One-line objective, shown right under the title. */
  tagline: string;
  /** 2-3 short, scannable rules — never a long prose paragraph. */
  rules: string[];
  legend: LegendRow[];
  /**
   * Small caption under the legend, for a GAMEPLAY nuance too long for one
   * row. Phase 13A-RV2: never explain internal asset selection (logo vs.
   * Rush Sigil, "revealed", "symbol fallback") — the player needs to know
   * what a collectible does, not why a particular visual was chosen for it.
   */
  legendNote?: string;
  /** Small footnote line (e.g. market data attribution). */
  footnote?: string;
}

/**
 * The ONLY lane controls the source actually implements (keydown-LEFT/RIGHT,
 * pointerdown/move/up drag-and-swipe — see MainScene.ts setupInput). Used
 * verbatim on Home and inside every mode intro modal so the wording never
 * drifts between the two places.
 */
export const LANE_CONTROL_INSTRUCTION = "Drag, swipe, or press ← → to switch lanes";

export const MODE_GUIDANCE: Record<IntroMode, ModeGuidanceContent> = {
  daily: {
    title: "Daily Token Rush",
    tagline: "Collect today's 15 unique tokens in 60 seconds.",
    rules: ["Each token appears once, no repeats", "3 ranked attempts per day"],
    legend: [
      { mark: "token-published", name: "Token", effect: "One-time pickup · fixed points" },
      { mark: "chain-block", name: "Chain Block", effect: "Builds your combo" },
      { mark: "hazard", name: "Hazard", effect: "Costs points, breaks your combo" },
      { mark: "shield", name: "Shield", effect: "Blocks your next hit" },
      { mark: "magnet", name: "Magnet", effect: "Pulls in Chain Blocks" },
    ],
    footnote: "Prices from today's market snapshot · data by CoinGecko",
  },
  survival: {
    title: "Survival",
    tagline: "Survive as long as you can through shifting zones.",
    rules: [
      "Start with 3 lives",
      "Energy builds your combo and charges your orb",
      "Full charge blocks one hit for free",
    ],
    legend: [
      { mark: "energy-orb", name: "Energy", effect: "Builds combo · raises charge" },
      { mark: "hazard", name: "Hazard", effect: "Costs one life" },
      {
        mark: "life-orb",
        name: "Life Orb",
        effect: "Restores a life; at full lives, adds charge when possible",
      },
      { mark: "shield", name: "Shield", effect: "Blocks your next hit" },
      { mark: "magnet", name: "Magnet", effect: "Pulls in Energy" },
      { mark: "charge-aura", name: "Full Charge · Lv 6", effect: "Free hit block, drops to Lv 4" },
    ],
  },
  campaign: {
    title: "Campaign: Chain Journey",
    tagline: "Reach the finish to complete each level.",
    rules: [
      "Earn up to 3 stars per level",
      "Same hazards, energy and power-ups as Survival",
      "Progress saves automatically",
    ],
    legend: [
      { mark: "star", count: 1, name: "1 star", effect: "Reach the finish" },
      { mark: "star", count: 2, name: "2 stars", effect: "Level goal (varies by level)" },
      { mark: "star", count: 3, name: "3 stars", effect: "Tougher goal (varies by level)" },
      { mark: "level-failed", name: "0 lives", effect: "Level failed" },
      { mark: "finish-gate", name: "Finish gate", effect: "Level complete" },
    ],
  },
};
