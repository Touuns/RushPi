/**
 * Mode onboarding modal (Phase 10B-P2). Shown automatically the FIRST time a
 * mode is launched, then never again (versioned localStorage flag); reopenable
 * anytime via the "?" buttons on Home. "Play" continues into the mode's normal
 * existing flow (for Daily: Pi connection / ranked-attempt logic untouched).
 */

export type IntroMode = "daily" | "survival" | "campaign";

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

interface IntroContent {
  title: string;
  points: string[];
  legend: { icon: string; label: string }[];
  /** Small footnote line (e.g. market data attribution). */
  footnote?: string;
}

const CONTENT: Record<IntroMode, IntroContent> = {
  daily: {
    title: "Daily Token Rush",
    points: [
      "60-second ranked token race",
      "Collect unique market tokens",
      "Each token appears once",
      "Collect Chain Blocks to build combo",
      "Magnet attracts Chain Blocks only",
      "Token prices come from today's market snapshot",
      "3 ranked attempts per day",
    ],
    legend: [
      { icon: "🪙", label: "Token logo = unique token collectible" },
      { icon: "🟨", label: "Chain Block = repeatable combo collectible" },
      { icon: "🔻", label: "Red diamond = hazard" },
      { icon: "🛡", label: "Shield = absorbs one hit" },
      { icon: "🧲", label: "Magnet = attracts Chain Blocks only" },
    ],
    footnote: "Market data by CoinGecko",
  },
  survival: {
    title: "Survival",
    points: [
      "Start with 3 lives",
      "Survive as long as possible",
      "Cross different blockchain-inspired zones",
      "Collect energy to charge the Pi orb",
      "Maximum charge can absorb a hit",
    ],
    legend: [
      { icon: "🟡", label: "Golden orb = Energy / charge" },
      { icon: "🔻", label: "Red diamond = Lose one life" },
      { icon: "💚", label: "Green Life Orb = Recover one life" },
      { icon: "🛡", label: "Cyan Shield = Protects from one hit" },
      { icon: "🧲", label: "Magnet = Attracts energy" },
      { icon: "⚡", label: "Charge Lv 6 = Absorbs one hit, drops to Lv 4" },
    ],
  },
  campaign: {
    title: "Campaign — Chain Journey",
    points: [
      "Complete levels to unlock the next",
      "Earn up to 3 stars per level",
      "Progress is saved locally",
      "Complete objectives before reaching the finish",
    ],
    legend: [
      { icon: "★", label: "Finish the level" },
      { icon: "★★", label: "Secondary objective" },
      { icon: "★★★", label: "Mastery objective" },
      { icon: "💔", label: "0 lives = Level Failed" },
      { icon: "🏁", label: "Finish gate = Level Complete" },
    ],
  },
};

interface ModeIntroModalProps {
  mode: IntroMode;
  onPlay: () => void;
  onClose: () => void;
}

export default function ModeIntroModal({ mode, onPlay, onClose }: ModeIntroModalProps) {
  const c = CONTENT[mode];
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="modal intro-modal">
        <button
          className="intro-modal__close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="modal__title">{c.title}</h2>

        <ul className="intro-modal__points">
          {c.points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>

        <div className="intro-modal__legend">
          {c.legend.map((l, i) => (
            <div key={i} className="intro-modal__legend-row">
              <span className="intro-modal__legend-icon">{l.icon}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {c.footnote && <p className="intro-modal__footnote">{c.footnote}</p>}

        <div className="modal__actions">
          <button className="btn btn--primary" type="button" onClick={onPlay}>
            Play
          </button>
        </div>
      </div>
    </div>
  );
}
