import {
  LANE_CONTROL_INSTRUCTION,
  MODE_GUIDANCE,
  type IntroMode,
  type LegendMarkKind,
  type LegendRow,
} from "./modeGuidance";

/**
 * Mode onboarding modal (Phase 10B-P2). Shown automatically the FIRST time a
 * mode is launched, then never again (versioned localStorage flag); reopenable
 * anytime via the "?" buttons on Home. "Play" continues into the mode's normal
 * existing flow (for Daily: Pi connection / ranked-attempt logic untouched).
 *
 * Phase 13A: legend/copy content lives in `modeGuidance.ts` (source-derived,
 * honest wording — see that file's audit notes); this component only renders
 * it, plus the small CSS-shape "legend mark" system (never a bare emoji
 * standing in for a rendered game object).
 */

export type { IntroMode };

const INTRO_KEYS: Record<IntroMode, string> = {
  // Daily bumped to v2 for the Token Rush rework (Phase 11B) so existing
  // players see the new rules once.
  daily: "rushpi:onboarding:daily:v2",
  survival: "rushpi:onboarding:survival:v1",
  campaign: "rushpi:onboarding:campaign:v1",
};

export function hasSeenIntro(mode: IntroMode): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEYS[mode]) === "1";
  } catch {
    return true; // storage unavailable → never block the player with modals
  }
}

export function markIntroSeen(mode: IntroMode): void {
  try {
    window.localStorage.setItem(INTRO_KEYS[mode], "1");
  } catch {
    /* ignore */
  }
}

interface ModeIntroModalProps {
  mode: IntroMode;
  onPlay: () => void;
  onClose: () => void;
}

/**
 * Small reusable legend-mark system (Phase 13A): each kind is a CSS shape
 * that mirrors the real in-game geometry/colour (see `.legend-mark*` in
 * global.css) — never a bare emoji standing in for the rendered object.
 * Purely decorative: the adjacent name/effect text carries the meaning.
 */
function LegendMark({ kind, count }: { kind: LegendMarkKind; count?: number }) {
  if (kind === "star") {
    const n = count ?? 1;
    return (
      <span className="legend-mark legend-mark--stars" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="legend-mark__star" />
        ))}
      </span>
    );
  }
  return (
    <span className={`legend-mark legend-mark--${kind}`} aria-hidden="true">
      {kind === "hazard" && (
        <>
          <span className="legend-mark__diamond" />
          <span className="legend-mark__bar legend-mark__bar--a" />
          <span className="legend-mark__bar legend-mark__bar--b" />
        </>
      )}
      {kind === "level-failed" && <span className="legend-mark__bar" />}
      {kind === "life-orb" && <span className="legend-mark__plus" />}
      {kind === "finish-gate" && <span className="legend-mark__checker" />}
    </span>
  );
}

/** One compact legend row: mark, bold name, short effect — a single line
 * whenever the copy is short enough, never a wrapped paragraph. */
function LegendRowView({ row }: { row: LegendRow }) {
  return (
    <div className="intro-modal__legend-row">
      <LegendMark kind={row.mark} count={row.count} />
      <span className="intro-modal__legend-text">
        <strong>{row.name}</strong>
        <span className="intro-modal__legend-effect">{row.effect}</span>
      </span>
    </div>
  );
}

/** Small uppercase section label — the "OBJECTIVE / RULES / OBJECTS" scaffold
 * that replaces one long undifferentiated block of text (Phase 13A-RV1). */
function SectionLabel({ children }: { children: string }) {
  return <span className="intro-modal__section-label">{children}</span>;
}

export default function ModeIntroModal({ mode, onPlay, onClose }: ModeIntroModalProps) {
  const c = MODE_GUIDANCE[mode];
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="modal intro-modal">
        {/* Phase 13A-RV3: three fixed regions — header and footer never
            scroll, only .intro-modal__body does, so the title/close stay
            visible while reading and Play never requires scrolling to
            reach. */}
        <div className="intro-modal__header">
          <h2 className="modal__title">{c.title}</h2>
          <button
            className="intro-modal__close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="intro-modal__close-mark" aria-hidden="true">
              ✕
            </span>
          </button>
        </div>

        <div className="intro-modal__body">
          <p className="intro-modal__tagline">{c.tagline}</p>

          <div className="intro-modal__section">
            <SectionLabel>Rules</SectionLabel>
            <ul className="intro-modal__points">
              {c.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="intro-modal__section">
            <SectionLabel>Objects</SectionLabel>
            <div className="intro-modal__legend">
              {c.legend.map((row, i) => (
                <LegendRowView key={i} row={row} />
              ))}
            </div>
            {c.legendNote && <p className="intro-modal__legend-note">{c.legendNote}</p>}
          </div>

          {c.footnote && <p className="intro-modal__footnote">{c.footnote}</p>}
        </div>

        <div className="intro-modal__footer">
          <p className="intro-modal__controls">{LANE_CONTROL_INSTRUCTION}</p>
          <div className="modal__actions">
            <button className="btn btn--primary" type="button" onClick={onPlay}>
              Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
