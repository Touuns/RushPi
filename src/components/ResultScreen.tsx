import type { GameResult } from "../types";

interface ResultScreenProps {
  result: GameResult;
  bestScore: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

/**
 * End-of-run summary. This is the screen that decides whether the player replays,
 * so it surfaces the "why" of the score: energies, max combo, hits and end bonus.
 */
export default function ResultScreen({
  result,
  bestScore,
  onPlayAgain,
  onHome,
}: ResultScreenProps) {
  return (
    <div className="screen result">
      <h2 className="result__title">Run Complete</h2>

      <div className="result__score">
        <span className="result__score-label">Score</span>
        <span className="result__score-value">{result.score.toLocaleString()}</span>
        {result.isNewBest && <span className="result__badge">New Best!</span>}
      </div>

      <div className="result__stats">
        <Stat label="Best Score" value={bestScore.toLocaleString()} />
        <Stat label="Energy Collected" value={result.energiesCollected} />
        <Stat label="Max Combo" value={`x${result.maxCombo}`} />
        <Stat label="Obstacles Hit" value={result.obstaclesHit} />
        <Stat label="End Bonus" value={`+${result.endBonus}`} />
      </div>

      <div className="result__actions">
        <button className="btn btn--primary" type="button" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn--secondary" type="button" onClick={onHome}>
          Back Home
        </button>
        {/* Leaderboard button reserved for Phase 2. */}
        <button className="btn btn--ghost" type="button" disabled title="Coming soon">
          Leaderboard
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}
