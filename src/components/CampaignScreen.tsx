import type { CampaignProgress } from "../types";
import { CAMPAIGN_LEVELS } from "../game/campaign";

interface CampaignScreenProps {
  progress: CampaignProgress;
  onSelectLevel: (id: number) => void;
  onHome: () => void;
}

/**
 * Campaign / Chain Journey level select (Phase 9F). Cards for each level: locked
 * until unlocked, showing name, objective, best local score and a completed mark.
 * Local-only — no server involvement.
 */
export default function CampaignScreen({
  progress,
  onSelectLevel,
  onHome,
}: CampaignScreenProps) {
  return (
    <div className="screen campaign">
      <h2 className="campaign__title">Campaign</h2>
      <p className="campaign__subtitle">Chain Journey — complete a level to unlock the next</p>

      <div className="campaign__list">
        {CAMPAIGN_LEVELS.map((lvl) => {
          const unlocked = lvl.id <= progress.unlockedLevel;
          const completed = progress.completed.includes(lvl.id);
          const best = progress.bestScoreByLevel[String(lvl.id)] ?? 0;
          return (
            <button
              key={lvl.id}
              className={`level-card ${unlocked ? "is-unlocked" : "is-locked"} ${
                completed ? "is-completed" : ""
              }`}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && onSelectLevel(lvl.id)}
            >
              <div className="level-card__head">
                <span className="level-card__num">Level {lvl.id}</span>
                <span className="level-card__mark">
                  {completed ? "★" : unlocked ? "" : "🔒"}
                </span>
              </div>
              <span className="level-card__name">{lvl.name}</span>
              <span className="level-card__obj">{lvl.objective.label}</span>
              {best > 0 && (
                <span className="level-card__best">Best {best.toLocaleString()}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="campaign__actions">
        <button className="btn btn--secondary" type="button" onClick={onHome}>
          Back Home
        </button>
      </div>
    </div>
  );
}
