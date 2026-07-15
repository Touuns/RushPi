import { useEffect, useRef, useState } from "react";
import type { DailyTokenChallenge } from "../market/dailyTokenTypes";
import { fetchDailyTokenChallenge } from "../market/marketClient";
import { preloadTokenLogos } from "../market/tokenAssetCache";
import ScreenBackButton from "./ScreenBackButton";

interface DailyPreparationScreenProps {
  /** True when this preparation is for a RANKED run (stricter requirements). */
  ranked: boolean;
  /** Challenge kept from a previous run today (reused when still valid). */
  cachedChallenge: DailyTokenChallenge | null;
  /** Everything is ready — the parent consumes the attempt and starts Phaser. */
  onReady: (challenge: DailyTokenChallenge) => void;
  /** Ranked preparation failed — offer a local (unranked) run instead. */
  onPlayLocally: (challenge: DailyTokenChallenge | null) => void;
  onCancel: () => void;
}

type Step = "challenge" | "logos" | "starting" | "error";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isReusable(c: DailyTokenChallenge | null): c is DailyTokenChallenge {
  return (
    !!c &&
    c.challengeDate === todayUtc() &&
    c.rulesVersion === 2 &&
    c.tokenChallengeVersion === 1 &&
    c.tokens.length > 0
  );
}

/**
 * Daily Token Rush preparation (Phase 11B). Loads the manifest and preloads
 * the 15 logos BEFORE the run; the ranked attempt is only consumed by the
 * parent once onReady fires. Cancel never consumes anything. A ranked run
 * additionally requires a rankedEligible manifest for today.
 */
export default function DailyPreparationScreen({
  ranked,
  cachedChallenge,
  onReady,
  onPlayLocally,
  onCancel,
}: DailyPreparationScreenProps) {
  const [step, setStep] = useState<Step>("challenge");
  const [error, setError] = useState<string>("");
  const [challenge, setChallenge] = useState<DailyTokenChallenge | null>(null);
  const runningRef = useRef(false);
  // retryTick re-triggers the effect; unmount aborts via the cancelled flag.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (runningRef.current) return; // never run two preparations in parallel
    runningRef.current = true;
    let cancelled = false;

    const prepare = async () => {
      try {
        setStep("challenge");
        const c = isReusable(cachedChallenge)
          ? cachedChallenge
          : await fetchDailyTokenChallenge();
        if (cancelled) return;

        if (c.challengeDate !== todayUtc()) {
          throw new Error("Challenge is not for today (UTC). Please retry.");
        }
        if (ranked && !c.rankedEligible) {
          setChallenge(c);
          setError(
            c.status === "fallback"
              ? "Today's market snapshot isn't available — ranked play needs live data."
              : "Today's challenge isn't ranked-eligible right now.",
          );
          setStep("error");
          return;
        }

        setChallenge(c);
        setStep("logos");
        await preloadTokenLogos(c.challengeDate, c.tokens);
        if (cancelled) return;

        setStep("starting");
        onReady(c);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the challenge.");
        setStep("error");
      } finally {
        runningRef.current = false;
      }
    };

    void prepare();
    return () => {
      cancelled = true; // async results after unmount are ignored
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  const stepLabel =
    step === "challenge"
      ? "Loading today's token challenge…"
      : step === "logos"
        ? "Preparing token logos…"
        : "Starting run…";

  return (
    <div className="screen daily-prep">
      <ScreenBackButton onBack={onCancel} label="Cancel" />
      <h2 className="daily-prep__title">Daily Token Rush</h2>

      {step !== "error" ? (
        <>
          <div className="daily-prep__spinner" aria-hidden="true" />
          <p className="daily-prep__step">{stepLabel}</p>
          <button className="btn btn--ghost btn--small" type="button" onClick={onCancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="daily-prep__error">{error}</p>
          <div className="daily-prep__actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
            >
              Retry
            </button>
            <button
              className="btn btn--secondary"
              type="button"
              onClick={() => onPlayLocally(challenge)}
            >
              Play locally
            </button>
            <button className="btn btn--ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <p className="daily-prep__hint">
            A local run is not ranked. Your ranked attempts are untouched.
          </p>
        </>
      )}
    </div>
  );
}
