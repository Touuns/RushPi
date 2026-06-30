import type { GameMode } from "../types";

interface HomeScreenProps {
  bestScore: number;
  onPlay: (mode: GameMode) => void;
}

/**
 * Minimal Phase 1 home: title, tagline, primary Play button and the local best.
 * Training Mode is wired through the same onPlay(mode) entry point so enabling it
 * fully in Phase 2 is just flipping the button on — no structural change.
 */
export default function HomeScreen({ bestScore, onPlay }: HomeScreenProps) {
  return (
    <div className="screen home">
      <div className="home__brand">
        <div className="home__logo" aria-hidden="true" />
        <h1 className="home__title">Rush Pi</h1>
        <p className="home__subtitle">Daily Runner Challenge</p>
      </div>

      <div className="home__best">
        <span className="home__best-label">Best Score</span>
        <span className="home__best-value">{bestScore.toLocaleString()}</span>
      </div>

      <div className="home__actions">
        <button
          className="btn btn--primary"
          onClick={() => onPlay("daily")}
          type="button"
        >
          Play Daily Run
        </button>

        {/* Training Mode is reserved for Phase 2; visible but disabled for now. */}
        <button className="btn btn--secondary" type="button" disabled title="Coming soon">
          Training Mode
        </button>
      </div>

      <p className="home__hint">Swipe or use ← → to switch lanes</p>
    </div>
  );
}
