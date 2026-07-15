import { useEffect, useRef, useState } from "react";
import type { DailyTokenChallenge } from "../market/dailyTokenTypes";
import { fetchDailyTokenChallenge } from "../market/marketClient";
import { preloadTokenLogos } from "../market/tokenAssetCache";
import { claimAttempt, ServerScoreError, type ClaimResult } from "../utils/serverLeaderboard";
import { newSubmissionId } from "../utils/submissionId";
import ScreenBackButton from "./ScreenBackButton";

interface DailyPreparationScreenProps {
  /** True when this preparation is for a RANKED run (stricter requirements). */
  ranked: boolean;
  /** In-memory Pi access token; required to reserve a ranked attempt. */
  accessToken: string | null;
  /** Challenge kept from a previous run today (reused when still valid). */
  cachedChallenge: DailyTokenChallenge | null;
  /**
   * Everything is ready — the parent starts Phaser. `claim` is the confirmed
   * server reservation for ranked runs, or null for a local (unranked) run.
   */
  onReady: (challenge: DailyTokenChallenge, claim: ClaimResult | null) => void;
  /** Fall back to a local (unranked) run instead. */
  onPlayLocally: (challenge: DailyTokenChallenge | null) => void;
  /** Re-authenticate with Pi (used when the access token is missing/expired). */
  onReconnect?: () => Promise<void>;
  onCancel: () => void;
}

type Step = "challenge" | "logos" | "claiming" | "starting" | "error";
type ErrorKind = "generic" | "auth" | "limit" | "not-eligible";

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
 * Daily Token Rush preparation (Phase 11B, hardened in 11B-P4).
 *
 * Ranked flow: load manifest → preload logos → RESERVE a server attempt (claim)
 * → only then start Phaser. The attempt is consumed on the SERVER before the run
 * begins (so an abandoned ranked run still counts). The submissionId is stable
 * across retries so a lost claim response never double-consumes. Local runs make
 * no reservation.
 */
export default function DailyPreparationScreen({
  ranked,
  accessToken,
  cachedChallenge,
  onReady,
  onPlayLocally,
  onReconnect,
  onCancel,
}: DailyPreparationScreenProps) {
  const [step, setStep] = useState<Step>("challenge");
  const [error, setError] = useState<string>("");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [challenge, setChallenge] = useState<DailyTokenChallenge | null>(null);
  const runningRef = useRef(false);
  // The ranked submissionId is generated ONCE per preparation and reused on
  // Retry (idempotent claim). A new preparation (remount) gets a fresh id.
  const submissionIdRef = useRef<string | null>(null);
  // retryTick re-triggers the effect; unmount aborts via the cancelled flag.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (runningRef.current) return; // never run two preparations in parallel
    runningRef.current = true;
    let cancelled = false;

    const fail = (kind: ErrorKind, message: string) => {
      if (cancelled) return;
      setErrorKind(kind);
      setError(message);
      setStep("error");
    };

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
        setChallenge(c);

        if (ranked && !c.rankedEligible) {
          fail(
            "not-eligible",
            c.status === "fallback"
              ? "Today's market snapshot isn't available — ranked play needs live data."
              : "Today's challenge isn't ranked-eligible right now.",
          );
          return;
        }

        setStep("logos");
        await preloadTokenLogos(c.challengeDate, c.tokens);
        if (cancelled) return;

        // Local (unranked) run: no reservation, start immediately.
        if (!ranked) {
          setStep("starting");
          onReady(c, null);
          return;
        }

        // Ranked run: reserve a server attempt BEFORE starting.
        if (!accessToken) {
          fail("auth", "Connect Pi to reserve a ranked attempt.");
          return;
        }
        if (!submissionIdRef.current) submissionIdRef.current = newSubmissionId();
        setStep("claiming");
        const claim = await claimAttempt(accessToken, submissionIdRef.current);
        if (cancelled) return;

        setStep("starting");
        onReady(c, claim);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ServerScoreError) {
          if (err.code === "ATTEMPT_LIMIT") {
            fail("limit", "You've used all 3 ranked attempts today.");
          } else if (err.code.startsWith("PI_AUTH")) {
            fail("auth", "Your Pi session expired. Reconnect Pi to play ranked.");
          } else if (err.code === "MIGRATION_REQUIRED") {
            fail("generic", "Ranked play is temporarily unavailable. You can play locally.");
          } else if (err.code === "CHALLENGE_NOT_RANKABLE") {
            fail("not-eligible", "Today's challenge isn't ranked-eligible right now.");
          } else {
            fail("generic", err.message || "Could not reserve a ranked attempt.");
          }
        } else {
          fail("generic", err instanceof Error ? err.message : "Could not load the challenge.");
        }
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

  const retry = () => setRetryTick((t) => t + 1);
  const reconnect = async () => {
    if (onReconnect) await onReconnect();
    retry();
  };

  const stepLabel =
    step === "challenge"
      ? "Loading today's token challenge…"
      : step === "logos"
        ? "Preparing token logos…"
        : step === "claiming"
          ? "Reserving ranked attempt…"
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
            {errorKind === "auth" && onReconnect && (
              <button className="btn btn--primary" type="button" onClick={reconnect}>
                Reconnect Pi
              </button>
            )}
            {(errorKind === "generic" || errorKind === "not-eligible") && (
              <button className="btn btn--primary" type="button" onClick={retry}>
                Retry
              </button>
            )}
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
