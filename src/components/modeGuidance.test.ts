import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LANE_CONTROL_INSTRUCTION, MODE_GUIDANCE, type IntroMode } from "./modeGuidance.ts";

/**
 * Phase 13A — honest mode guidance.
 *
 * `modeGuidance.ts` holds plain data (no JSX), so its content can be
 * asserted directly here. The rendering/markup requirements (touch-target
 * sizes, separate mode-card vs info-button actions, focus styling) are
 * pinned via source assertions on the real component/CSS files, the same
 * non-brittle pattern used by `dailyRulesVersion.test.ts` and
 * `q2Cleanup.test.ts` — reading real source rather than depending on line
 * numbers or a DOM renderer (none is set up in this test runner).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

const MODES: IntroMode[] = ["daily", "survival", "campaign"];

// A conservative emoji-detection range covering the pictographic blocks used
// by the OLD content (🪙🟨🔻🛡🧲💚⚡💔🏁) — used to prove the new legend text
// never leans on emoji as its sole visual cue.
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u;

// ---- 1. all three modes have non-empty, source-derived guidance ----------

test("every mode has a non-empty title, tagline, rules list and legend", () => {
  for (const mode of MODES) {
    const g = MODE_GUIDANCE[mode];
    assert.ok(g.title.length > 0, `${mode} title`);
    assert.ok(g.tagline.length > 0, `${mode} tagline`);
    assert.ok(g.rules.length > 0, `${mode} rules`);
    assert.ok(g.legend.length > 0, `${mode} legend`);
    for (const row of g.legend) {
      assert.ok(row.name.length > 0);
      assert.ok(row.effect.length > 0);
    }
  }
});

test("rules stay short and scannable, never a documentation-length sentence", () => {
  // RV1: bullets must read as a phrase, not a paragraph — caps every rule
  // line at a length that fits one or two words wrapped, not four+.
  for (const mode of MODES) {
    for (const rule of MODE_GUIDANCE[mode].rules) {
      assert.ok(rule.length <= 60, `${mode} rule too long for a scannable bullet: "${rule}"`);
    }
    assert.ok(MODE_GUIDANCE[mode].rules.length <= 4, `${mode} should have at most 4 core rules`);
  }
});

test("guidance content is derived from real runtime behaviour, not placeholder text", () => {
  // Spot-check a few facts against the actual source, so this suite fails if
  // the copy ever drifts from the implementation it describes.
  const gameConfig = read("src/game/gameConfig.ts");
  assert.match(gameConfig, /startLives:\s*3/);
  assert.match(MODE_GUIDANCE.survival.rules.join(" "), /3 lives/);

  const campaign = read("src/game/campaign.ts");
  assert.match(campaign, /REACH.*Reach the finish/s);
  const oneStarRow = MODE_GUIDANCE.campaign.legend.find((r) => r.count === 1);
  assert.ok(oneStarRow);
  assert.match(oneStarRow!.effect, /finish/i);
});

// ---- 2 & 3. shared, honest control instruction ----------------------------

test("all three modes use the exact same shared control instruction", () => {
  assert.equal(LANE_CONTROL_INSTRUCTION.length > 0, true);
  // The constant itself is what every consumer must render — this pins the
  // single source of truth (no per-mode copy of the sentence exists).
});

test("control copy only advertises controls MainScene actually implements", () => {
  const scene = read("src/game/scenes/MainScene.ts");
  assert.match(scene, /keydown-LEFT/);
  assert.match(scene, /keydown-RIGHT/);
  assert.match(scene, /pointerdown/);
  assert.match(scene, /pointermove/);
  assert.match(scene, /pointerup/);

  // The sentence must not claim any input the source doesn't prove works.
  assert.match(LANE_CONTROL_INSTRUCTION, /drag/i);
  assert.match(LANE_CONTROL_INSTRUCTION, /swipe/i);
  assert.match(LANE_CONTROL_INSTRUCTION, /←|arrow/i);
  assert.doesNotMatch(LANE_CONTROL_INSTRUCTION, /tilt/i);
  assert.doesNotMatch(LANE_CONTROL_INSTRUCTION, /\btap\b/i);
});

test("Home and every intro modal render the same control instruction", () => {
  const home = read("src/components/HomeScreen.tsx");
  assert.match(home, /LANE_CONTROL_INSTRUCTION/);
  assert.doesNotMatch(home, /Swipe or use/); // old hardcoded copy is gone

  const modal = read("src/components/ModeIntroModal.tsx");
  assert.match(modal, /LANE_CONTROL_INSTRUCTION/);
  assert.match(modal, /intro-modal__controls/);
});

// ---- 4. Daily token legend: gameplay only, no asset-selection wording -----

test("Daily has exactly one concise Token row, no logo/sigil/reveal wording anywhere", () => {
  // RV2: the product owner rejected any player-facing explanation of WHY a
  // token shows a particular visual (logo vs. symbol vs. future Rush
  // Sigil) — "revealed", "not yet revealed", "logo unavailable", "logo will
  // be added", "symbol fallback", "shows a symbol" are all out. The player
  // needs to know what the collectible does, not how its art was chosen.
  const rows = MODE_GUIDANCE.daily.legend;
  const tokenRows = rows.filter((r) => r.mark === "token-published");
  assert.equal(tokenRows.length, 1, "exactly one Token row");
  assert.equal(tokenRows[0].name, "Token");
  assert.equal(tokenRows[0].effect, "One-time pickup · fixed points");

  const rejected = [
    /revealed/i,
    /logo unavailable/i,
    /logo will be added/i,
    /symbol fallback/i,
    /shows? a symbol/i,
    /\blogo\b/i,
    /\bsigil\b/i,
  ];
  const allDailyText = [
    MODE_GUIDANCE.daily.tagline,
    ...MODE_GUIDANCE.daily.rules,
    ...rows.flatMap((r) => [r.name, r.effect]),
    MODE_GUIDANCE.daily.legendNote ?? "",
    MODE_GUIDANCE.daily.footnote ?? "",
  ].join(" ");
  for (const pattern of rejected) {
    assert.doesNotMatch(allDailyText, pattern, `Daily copy must not match ${pattern}`);
  }
});

test("no mode's guidance content anywhere explains internal logo/sigil asset selection", () => {
  const rejectedSubstrings = [
    "not yet revealed",
    "logo unavailable",
    "logo will be added",
    "symbol fallback",
    "new tokens show a symbol",
  ];
  for (const mode of MODES) {
    const g = MODE_GUIDANCE[mode];
    const all = [g.title, g.tagline, ...g.rules, ...g.legend.flatMap((r) => [r.name, r.effect]), g.legendNote ?? "", g.footnote ?? ""].join(" ").toLowerCase();
    for (const s of rejectedSubstrings) {
      assert.equal(all.includes(s.toLowerCase()), false, `"${mode}" content must not contain "${s}"`);
    }
  }
});

test("the runtime still resolves a real local logo when one is published (unchanged renderer)", () => {
  const src = read("src/game/dailyTokens.ts");
  assert.match(src, /makeTokenLogoPresentation/);
  assert.match(src, /Procedural fallback/i);
});

// ---- 5. no legend relies solely on an emoji --------------------------------

test("no legend row's name/effect text is emoji-only, and mark kinds are plain identifiers", () => {
  for (const mode of MODES) {
    for (const row of MODE_GUIDANCE[mode].legend) {
      assert.doesNotMatch(row.mark, EMOJI_RE, `${mode} mark must be a plain kind, not emoji`);
      const textOnly = `${row.name} ${row.effect}`.replace(EMOJI_RE, "").trim();
      assert.ok(textOnly.length > 3, `${mode} row "${row.name}" must carry real text, not just an emoji`);
    }
  }
});

test("legend marks render as CSS shapes (global.css), not emoji glyphs", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /\.legend-mark--hazard/);
  assert.match(css, /\.legend-mark--token-published/);
  assert.match(css, /\.legend-mark--chain-block/);
  assert.match(css, /\.legend-mark--energy-orb/);
  assert.match(css, /\.legend-mark--shield/);
  assert.match(css, /\.legend-mark--magnet/);
  assert.match(css, /\.legend-mark--life-orb/);
  assert.match(css, /\.legend-mark--charge-aura/);
  assert.match(css, /\.legend-mark--stars/);
});

test("no title/legend/rule/tagline copy uses an em dash", () => {
  const emDash = /—/;
  for (const mode of MODES) {
    const g = MODE_GUIDANCE[mode];
    assert.doesNotMatch(g.title, emDash, `${mode} title`);
    assert.doesNotMatch(g.tagline, emDash, `${mode} tagline`);
    for (const rule of g.rules) assert.doesNotMatch(rule, emDash, `${mode} rule "${rule}"`);
    for (const row of g.legend) {
      assert.doesNotMatch(row.name, emDash, `${mode} legend name "${row.name}"`);
      assert.doesNotMatch(row.effect, emDash, `${mode} legend effect "${row.effect}"`);
    }
    if (g.legendNote) assert.doesNotMatch(g.legendNote, emDash, `${mode} legendNote`);
  }
});

// ---- RV1: modal follows the 4-part IA and isn't centered body text --------

test("the modal renders the tagline -> rules -> objects -> CTA structure", () => {
  const modal = read("src/components/ModeIntroModal.tsx");
  const taglineIdx = modal.indexOf("intro-modal__tagline");
  const rulesLabelIdx = modal.indexOf(">Rules<");
  const objectsLabelIdx = modal.indexOf(">Objects<");
  // The exact div (not the helper functions' "-row"/"-text"/"-note" classes,
  // which are defined earlier in the file and would otherwise match first).
  const legendIdx = modal.indexOf('className="intro-modal__legend"');
  const ctaIdx = modal.indexOf("modal__actions");
  for (const idx of [taglineIdx, rulesLabelIdx, objectsLabelIdx, legendIdx, ctaIdx]) {
    assert.notEqual(idx, -1);
  }
  assert.ok(taglineIdx < rulesLabelIdx);
  assert.ok(rulesLabelIdx < objectsLabelIdx);
  assert.ok(objectsLabelIdx < legendIdx);
  assert.ok(legendIdx < ctaIdx);
});

test("the intro modal's own alignment beats the shared centered .modal default", () => {
  // RV1 root-cause fix: a single-class ".intro-modal { text-align: left }"
  // rule lost the cascade to the later ".modal { text-align: center }" rule
  // (equal specificity, source order wins) — every body line rendered
  // centered despite the override. The selector must carry BOTH classes so
  // its specificity wins regardless of where either rule sits in the file.
  const css = read("src/styles/global.css");
  assert.match(css, /\.modal\.intro-modal\s*\{[^}]*text-align:\s*left/s);
});

test("legend rows stack name/effect on their own lines instead of one run-on sentence", () => {
  const modal = read("src/components/ModeIntroModal.tsx");
  assert.doesNotMatch(modal, /\{row\.name\}<\/strong>\s*—/); // old em-dash join is gone
  assert.match(modal, /intro-modal__legend-effect/);
});

// ---- 6. information buttons keep specific accessible labels ---------------

test("each mode-info button keeps a specific, distinct aria-label", () => {
  const home = read("src/components/HomeScreen.tsx");
  assert.match(home, /aria-label="How to play Daily Run"/);
  assert.match(home, /aria-label="How to play Survival"/);
  assert.match(home, /aria-label="How to play Campaign"/);
});

// ---- 7 & 8. 44x44 interactive targets --------------------------------------

test(".mode-info has a 44x44 interactive target with a smaller visible mark", () => {
  const css = read("src/styles/global.css");
  const modeInfoBlock = css.match(/\.mode-info\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(modeInfoBlock, /width:\s*44px/);
  assert.match(modeInfoBlock, /height:\s*44px/);
  const markBlock = css.match(/\.mode-info__mark\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(markBlock, /width:\s*24px/);
});

test("the intro modal close button has a 44x44 interactive target", () => {
  const css = read("src/styles/global.css");
  const closeBlock = css.match(/\.intro-modal__close\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(closeBlock, /width:\s*44px/);
  assert.match(closeBlock, /height:\s*44px/);
});

test("both 44x44 targets have a visible :focus-visible state", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /\.mode-info:focus-visible\s*\{/);
  assert.match(css, /\.intro-modal__close:focus-visible\s*\{/);
});

// ---- 9. mode-card launch vs information button stay separate --------------

test("mode-info is a sibling of mode-card, never nested inside it", () => {
  const home = read("src/components/HomeScreen.tsx");
  // Each mode-wrap contains a mode-card button that fully CLOSES (</button>)
  // before the mode-info button opens — proving siblings, not nesting.
  const wrapBodies = home.split('className="mode-wrap"').slice(1);
  assert.equal(wrapBodies.length, 3, "expected exactly 3 mode-wrap sections (Daily, Survival, Campaign)");
  for (const wrap of wrapBodies) {
    const cardOpenIdx = wrap.indexOf("mode-card");
    const cardCloseIdx = wrap.indexOf("</button>", cardOpenIdx);
    const infoOpenIdx = wrap.indexOf('className="mode-info"');
    assert.ok(cardOpenIdx !== -1 && cardCloseIdx !== -1 && infoOpenIdx !== -1);
    assert.ok(
      cardCloseIdx < infoOpenIdx,
      "the mode-card button must close before the mode-info button opens (siblings, not nested)",
    );
  }
});

// ---- 10 & 11. persistence keys unchanged / no future keys -----------------

test("existing onboarding storage keys are unchanged", () => {
  const modal = read("src/components/ModeIntroModal.tsx");
  assert.match(modal, /daily:\s*"rushpi:onboarding:daily:v2"/);
  assert.match(modal, /survival:\s*"rushpi:onboarding:survival:v1"/);
  assert.match(modal, /campaign:\s*"rushpi:onboarding:campaign:v1"/);
  assert.match(modal, /export function hasSeenIntro/);
  assert.match(modal, /export function markIntroSeen/);
});

test("no forbidden future Phase 13 persistence key is introduced anywhere", () => {
  const files = [
    "src/components/HomeScreen.tsx",
    "src/components/ModeIntroModal.tsx",
    "src/components/modeGuidance.ts",
    "src/App.tsx",
    "src/utils/storage.ts",
  ];
  const forbidden = [
    "firstRunCompleted",
    "firstDailyResultSeen",
    "attemptCostAcknowledged",
    "coachMarksSeen",
  ];
  for (const f of files) {
    const src = read(f);
    for (const key of forbidden) {
      assert.doesNotMatch(src, new RegExp(key), `${f} must not introduce "${key}"`);
    }
  }
});

// ---- RV3: copy corrections -------------------------------------------------

test("RV3-1: the new Daily tagline is present and does not require collecting all 15", () => {
  assert.equal(MODE_GUIDANCE.daily.tagline, "Collect today's 15 unique tokens in 60 seconds.");
  // Must not read as "you need all 15 for the run to count".
  assert.doesNotMatch(MODE_GUIDANCE.daily.tagline, /before the clock runs out/i);
  assert.doesNotMatch(MODE_GUIDANCE.daily.tagline, /collect all 15/i);
});

test("RV3-2: the redundant Chain Block/Magnet Daily rule is removed", () => {
  const joined = MODE_GUIDANCE.daily.rules.join(" | ");
  assert.doesNotMatch(joined, /Chain Blocks build your combo, Magnet pulls them in/);
  assert.deepEqual(MODE_GUIDANCE.daily.rules, [
    "Each token appears once, no repeats",
    "3 ranked attempts per day",
  ]);
});

test("RV3-3: the Objects section still explains Chain Block and Magnet on their own rows", () => {
  const names = MODE_GUIDANCE.daily.legend.map((r) => r.name);
  assert.ok(names.includes("Chain Block"));
  assert.ok(names.includes("Magnet"));
  const chainBlock = MODE_GUIDANCE.daily.legend.find((r) => r.name === "Chain Block")!;
  const magnet = MODE_GUIDANCE.daily.legend.find((r) => r.name === "Magnet")!;
  assert.match(chainBlock.effect, /combo/i);
  assert.match(magnet.effect, /Chain Block/i);
});

test("RV3-4: Campaign tagline says reaching the finish completes the level, not beating a time", () => {
  assert.equal(MODE_GUIDANCE.campaign.tagline, "Reach the finish to complete each level.");
  assert.doesNotMatch(MODE_GUIDANCE.campaign.tagline, /beat/i);
  assert.doesNotMatch(MODE_GUIDANCE.campaign.tagline, /target time/i);
});

test("RV3-5: Survival Life Orb effect uses 'when possible', never guarantees bonus charge", () => {
  const lifeOrb = MODE_GUIDANCE.survival.legend.find((r) => r.name === "Life Orb")!;
  assert.equal(lifeOrb.effect, "Restores a life; at full lives, adds charge when possible");
  assert.doesNotMatch(lifeOrb.effect, /\bor bonus charge if full\b/); // old unconditional phrasing is gone
});

test("RV3-6: rejected logo/symbol/fallback/reveal wording remains absent after the copy edits", () => {
  const rejected = [/revealed/i, /\blogo\b/i, /\bsigil\b/i, /symbol fallback/i, /logo unavailable/i, /logo will be added/i];
  for (const mode of MODES) {
    const g = MODE_GUIDANCE[mode];
    const all = [g.title, g.tagline, ...g.rules, ...g.legend.flatMap((r) => [r.name, r.effect]), g.legendNote ?? "", g.footnote ?? ""].join(" ");
    for (const pattern of rejected) assert.doesNotMatch(all, pattern, `${mode}: ${pattern}`);
  }
});

// ---- RV3: modal has distinct fixed header/footer + scrollable middle ------

test("RV3-7: the modal renders distinct header, scrollable body and footer regions", () => {
  const modal = read("src/components/ModeIntroModal.tsx");
  const headerIdx = modal.indexOf('className="intro-modal__header"');
  const bodyIdx = modal.indexOf('className="intro-modal__body"');
  const footerIdx = modal.indexOf('className="intro-modal__footer"');
  assert.notEqual(headerIdx, -1);
  assert.notEqual(bodyIdx, -1);
  assert.notEqual(footerIdx, -1);
  assert.ok(headerIdx < bodyIdx && bodyIdx < footerIdx, "header, then body, then footer, in that order");

  // Title/close live in the header; controls/Play live in the footer;
  // tagline/rules/objects live in the body — not the other way around.
  const header = modal.slice(headerIdx, bodyIdx);
  const body = modal.slice(bodyIdx, footerIdx);
  const footer = modal.slice(footerIdx);
  assert.match(header, /modal__title/);
  assert.match(header, /intro-modal__close/);
  assert.match(body, /intro-modal__tagline/);
  assert.match(body, /intro-modal__section/);
  assert.match(footer, /intro-modal__controls/);
  assert.match(footer, /modal__actions/);
});

test("RV3-7b: only the body region scrolls — the outer modal shell does not", () => {
  const css = read("src/styles/global.css");
  const shellBlock = css.match(/\.modal\.intro-modal\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(shellBlock, /overflow:\s*hidden/, "the outer shell must not also scroll (no doubled scrollbar)");
  const bodyBlock = css.match(/\.intro-modal__body\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(bodyBlock, /overflow-y:\s*auto/);
  assert.match(bodyBlock, /min-height:\s*0/, "flex children need min-height:0 to actually scroll instead of overflowing");
});

test("RV3-8: Play and close targets remain at least 44x44 after the header/footer restructure", () => {
  const css = read("src/styles/global.css");
  const closeBlock = css.match(/\.intro-modal__close\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(closeBlock, /width:\s*44px/);
  assert.match(closeBlock, /height:\s*44px/);
  // Play is the primary full-width CTA button (.btn--primary inside
  // .modal__actions); its existing padding already clears 44px height, and
  // RV3 must not have shrunk it while reworking the footer.
  const btnPrimary = css.match(/\.btn--primary\s*\{[^}]*\}|\.btn\s*\{[^}]*\}/g)?.join("\n") ?? "";
  assert.match(btnPrimary, /padding/i);
});

// ---- RV3: desktop sizing ----------------------------------------------------

test("RV3-9: desktop styling no longer caps the modal at the old restrictive mobile height", () => {
  const css = read("src/styles/global.css");
  const desktopBlock = css.match(/@media \(min-width: 768px\) \{[\s\S]*?\.modal\.intro-modal\s*\{[^}]*\}/)?.[0] ?? "";
  assert.notEqual(desktopBlock, "", "expected a desktop override block for .modal.intro-modal");
  assert.doesNotMatch(desktopBlock, /max-height:\s*min\(78vh,\s*560px\)/, "old mobile-era cap must not survive into the desktop rule");
  assert.match(desktopBlock, /max-width:\s*448px/);
});

test("RV3-9b: the desktop modal width increase stays within the app's own 480px frame, not ultrawide", () => {
  const css = read("src/styles/global.css");
  assert.match(css, /max-width:\s*480px/); // .app-frame, unchanged — the real ceiling
  const desktopBlock = css.match(/@media \(min-width: 768px\) \{[\s\S]*?\.modal\.intro-modal\s*\{[^}]*\}/)?.[0] ?? "";
  const widthMatch = desktopBlock.match(/max-width:\s*(\d+)px/);
  assert.ok(widthMatch, "desktop modal width must be a fixed px value");
  assert.ok(Number(widthMatch![1]) <= 480, "must not exceed the app's own 480px frame");
});

// ---- 12. rulesVersion, scoring and Daily generation unchanged -------------

test("rulesVersion remains 3 and scoring/Daily-generation constants are untouched", () => {
  assert.match(read("src/game/dailyRulesVersion.ts"), /export const DAILY_RULES_VERSION = 3/);
  const cfg = read("src/game/gameConfig.ts");
  assert.match(cfg, /RUN_DURATION_SECONDS = 60/);
  assert.match(cfg, /energyPoints:\s*10/);
  assert.match(cfg, /comboMaxMultiplier:\s*3/);
  assert.match(read("api/_lib/dailyTokenChallenge.ts"), /DAILY_TOKEN_COUNT = 15/);
});
