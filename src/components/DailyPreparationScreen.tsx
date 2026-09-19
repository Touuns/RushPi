import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyTokenChallenge } from "../market/dailyTokenTypes";
import { fetchDailyTokenChallenge } from "../market/marketClient";
import { preloadDailyProductionAssets } from "../game/productionAssets";
import { preloadDailyTokenLogos } from "../game/dailyLogoPreload";
import {
  claimAttempt,
  fetchAttemptStatus,
  ServerScoreError,
  type AttemptStatus,
  type ClaimResult,
} from "../utils/serverLeaderboard";
import { isAttemptCostAcknowledged, markAttemptCostAcknowledged } from "../utils/storage";
import { isActiveDailyRulesVersion } from "../game/dailyRulesVersion";
import { newSubmissionId } from "../utils/submissionId";
import { LAST_ATTEMPT_COPY, preflightRankedClaim, singleFlight } from "./dailyEntryGate";
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
  /**
   * Fall back to a local (unranked) run instead. `limitReached` is true when
   * the player chose local because no ranked attempts remain today, so the
   * result can say so honestly.
   */
  onPlayLocally: (challenge: DailyTokenChallenge | null, limitReached?: boolean) => void;
  /** Authenticate with Pi (first connection, or after an expired session). */
  onReconnect?: () => Promise<void>;
  /**
   * Phase 13G — the authoritative attempt status was read. The parent mirrors
   * it into the existing local display counter, so Home and result labels are
   * never left stale. No second counter exists.
   */
  onAttemptStatus?: (status: AttemptStatus) => void;
  onCancel: () => void;
}

type Step =
  | "challenge"
  | "logos"
  | "auth"
  | "connecting"
  | "status"
  | "confirm-last"
  | "limit"
  | "claiming"
  | "starting"
  | "empty-manifest"
  | "error";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isReusable(c: DailyTokenChallenge | null): c is DailyTokenChallenge {
  return (
    !!c &&
    c.challengeDate === todayUtc() &&
    // Phase 13-R2: never replay a cached challenge from another rules version.
    isActiveDailyRulesVersion(c.rulesVersion) &&
    c.tokenChallengeVersion === 1 &&
    c.tokens.length > 0
  );
}

/**
 * Daily Token Rush preparation (Phase 11B, hardened in 11B-P4, consolidated in
 * Phase 13G).
 *
 * Phase 13G makes this screen the ONE decision surface for entering a Daily.
 * Home no longer decides auth vs local or attempt availability; every ranked
 * request from every entry path lands here, and the pre-claim gate below is
 * the only route to `claimAttempt()`.
 *
 * Ranked flow:
 *   load challenge → preload assets → ensure Pi auth → read the authoritative
 *   attempt status (read-only) → gate → one-time last-attempt confirmation if
 *   owed → reserve the attempt (claim) → start Phaser.
 *
 * The claim remains the final transactional authority: its ATTEMPT_LIMIT and
 * auth errors are still handled, because the status read can race with a claim
 * made elsewhere. The submissionId is generated once per preparation and reused
 * on every retry, so a lost claim response never double-consumes. Local runs
 * make no status read and no reservation.
 */
export default function DailyPreparationScreen({
  ranked,
  accessToken,
  cachedChallenge,
  onReady,
  onPlayLocally,
  onReconnect,
  onAttemptStatus,
  onCancel,
}: DailyPreparationScreenProps) {
  const [step, setStep] = useState<Step>("challenge");
  const [error, setError] = useState<string>("");
  const [challenge, setChallenge] = useState<DailyTokenChallenge | null>(null);
  /** Extra line on the auth gate after a failed or expired connection. */
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  /** Last authoritative status, for the limit copy. */
  const [lastStatus, setLastStatus] = useState<AttemptStatus | null>(null);
  /** Set after a successful Pi connection; resumes once the token arrives. */
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const runningRef = useRef(false);
  const aliveRef = useRef(true);
  // The ranked submissionId is generated ONCE per preparation and reused on
  // Retry (idempotent claim). A new preparation (remount) gets a fresh id.
  const submissionIdRef = useRef<string | null>(null);
  /**
   * True once a claim request has been SENT for the current submissionId. The
   * server may already hold that reservation even if the response was lost, so
   * a retry goes straight back to the same idempotent claim rather than
   * re-gating — re-gating could report "no attempts left" for the very attempt
   * this preparation already owns.
   */
  const claimSentRef = useRef(false);
  // Latest values for the async continuations, which outlive a single render.
  const challengeRef = useRef<DailyTokenChallenge | null>(null);
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onAttemptStatusRef = useRef(onAttemptStatus);
  onAttemptStatusRef.current = onAttemptStatus;
  // retryTick re-triggers the effect; unmount aborts via aliveRef.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** Genuine failures only. Expected states (auth, limit) have their own panels. */
  const fail = (message: string) => {
    if (!aliveRef.current) return;
    setError(message);
    setStep("error");
  };

  /** Map a ranked status/claim failure onto the right state of this screen. */
  const handleRankedError = (err: unknown) => {
    if (!aliveRef.current) return;
    if (err instanceof ServerScoreError) {
      if (err.code === "ATTEMPT_LIMIT") {
        // Claim-side race: status said an attempt was left, the server — the
        // final authority — says otherwise. Same honest state as a status read.
        setStep("limit");
      } else if (err.code.startsWith("PI_AUTH")) {
        setAuthNotice("Your Pi session expired. Reconnect Pi to play ranked.");
        setStep("auth");
      } else if (err.code === "MIGRATION_REQUIRED") {
        fail("Ranked play is temporarily unavailable. You can play locally.");
      } else if (err.code === "CHALLENGE_NOT_RANKABLE") {
        fail("Today's challenge isn't ranked-eligible right now.");
      } else {
        fail(err.message || "Could not reserve a ranked attempt.");
      }
    } else {
      fail(err instanceof Error ? err.message : "Could not load the challenge.");
    }
  };

  /**
   * Reserve the ranked attempt. The ONLY call site of `claimAttempt()` in the
   * app, reachable only from the gate's "claim" outcome, an explicit
   * last-attempt acceptance, or a retry of a claim already sent. Single-flight,
   * so a double tap or duplicate continuation still produces exactly one claim.
   */
  const claimOnce = useMemo(
    () =>
      singleFlight(async () => {
        const c = challengeRef.current;
        const token = tokenRef.current;
        if (!c || !token) {
          handleRankedError(new ServerScoreError("PI_AUTH_REQUIRED", "", 401));
          return;
        }
        if (!submissionIdRef.current) submissionIdRef.current = newSubmissionId();
        claimSentRef.current = true;
        setStep("claiming");
        try {
          const claim = await claimAttempt(token, submissionIdRef.current);
          if (!aliveRef.current) return;
          setStep("starting");
          onReadyRef.current(c, claim);
        } catch (err) {
          handleRankedError(err);
        }
      }),
    // Reads only refs; stable for the life of this preparation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * The ranked gate: auth → authoritative status → decision. Never claims by
   * itself except through `claimOnce` on the gate's "claim" outcome.
   */
  const continueRanked = useMemo(
    () =>
      singleFlight(async () => {
        if (!challengeRef.current) return;
        if (claimSentRef.current && tokenRef.current) {
          await claimOnce();
          return;
        }
        setStep("status");
        const outcome = await preflightRankedClaim({
          accessToken: tokenRef.current,
          fetchStatus: fetchAttemptStatus,
          isAcknowledged: isAttemptCostAcknowledged,
          onStatus: (st) => {
            setLastStatus(st);
            onAttemptStatusRef.current?.(st);
          },
        });
        if (!aliveRef.current) return;
        switch (outcome.gate) {
          case "auth":
            setStep("auth");
            return;
          case "limit":
            setStep("limit");
            return;
          case "confirm-last":
            // Nothing is reserved yet, and nothing is persisted by merely
            // showing this — only the explicit accept below writes the flag.
            setStep("confirm-last");
            return;
          case "claim":
            await claimOnce();
            return;
          case "error":
            handleRankedError(outcome.error);
            return;
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claimOnce],
  );

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
        setChallenge(c);
        challengeRef.current = c;

        if (ranked && !c.rankedEligible) {
          fail(
            c.status === "fallback"
              ? "Today's market snapshot isn't available — ranked play needs live data."
              : "Today's challenge isn't ranked-eligible right now.",
          );
          return;
        }

        // Phase 13B: a local (unranked) run with zero tokens today would
        // otherwise start silently with nothing to collect. This is a missing
        // MARKET DATA condition, distinct from a missing official logo (that
        // case is already handled by the Prismatic Core renderer) and from an
        // attempt-cost concern (no ranked attempt is at stake on this path,
        // since `ranked && !c.rankedEligible` already returned above).
        if (!ranked && c.tokens.length === 0) {
          setStep("empty-manifest");
          return;
        }

        // Load the visual resources (verified local token logos + Daily
        // production assets) in parallel. Both always resolve with fallbacks —
        // a visual failure never blocks the claim, the run, or the submissionId.
        // Loaded BEFORE any ranked gate, so "Play locally" from any gate starts
        // immediately on the challenge and assets already in hand.
        setStep("logos");
        await Promise.all([
          preloadDailyProductionAssets(),
          preloadDailyTokenLogos(c.challengeDate, c.tokens),
        ]);
        if (cancelled) return;

        // Local (unranked) run: no status read, no reservation, start now.
        if (!ranked) {
          setStep("starting");
          onReadyRef.current(c, null);
          return;
        }

        // Ranked run: through the pre-claim gate — never straight to a claim.
        await continueRanked();
      } catch (err) {
        if (cancelled) return;
        fail(err instanceof Error ? err.message : "Could not load the challenge.");
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

  // Resume the gate once a fresh Pi session has reached this screen.
  useEffect(() => {
    if (!awaitingAuth || !accessToken) return;
    setAwaitingAuth(false);
    void continueRanked();
  }, [awaitingAuth, accessToken, continueRanked]);

  const retry = () => {
    if (claimSentRef.current && challengeRef.current && tokenRef.current) {
      void claimOnce(); // same submissionId — the server dedupes it
      return;
    }
    setRetryTick((t) => t + 1);
  };

  const connect = async () => {
    if (!onReconnect) return;
    setAuthNotice(null);
    setStep("connecting");
    try {
      await onReconnect();
      if (!aliveRef.current) return;
      setAwaitingAuth(true);
    } catch {
      if (!aliveRef.current) return;
      setAuthNotice("Couldn't connect to Pi. Try again, or play locally.");
      setStep("auth");
    }
  };

  /** The ONLY place the last-attempt acknowledgement is ever written. */
  const acceptLastAttempt = () => {
    markAttemptCostAcknowledged();
    void claimOnce();
  };

  const playLocally = (limitReached = false) => onPlayLocally(challenge, limitReached);

  // Phase 13B: explicit opt-in to continue a zero-token local run. Runs the
  // same preload the normal path would have run, then hands off exactly like
  // the unranked branch of `prepare()` above.
  const playAnyway = async () => {
    if (!challenge) return;
    setStep("logos");
    await Promise.all([
      preloadDailyProductionAssets(),
      preloadDailyTokenLogos(challenge.challengeDate, challenge.tokens),
    ]);
    setStep("starting");
    onReady(challenge, null);
  };

  const stepLabel =
    step === "challenge"
      ? "Loading today's token challenge…"
      : step === "logos"
        ? "Preparing game assets…"
        : step === "connecting"
          ? "Connecting to Pi…"
          : step === "status"
            ? "Checking your ranked runs…"
            : step === "claiming"
              ? "Reserving ranked attempt…"
              : "Starting run…";

  const maxAttempts = lastStatus?.max ?? 3;

  return (
    <div className="screen daily-prep">
      <ScreenBackButton onBack={onCancel} label="Cancel" />
      <h2 className="daily-prep__title">Daily Token Rush</h2>

      {step === "auth" ? (
        // Phase 13G — formerly Home's "Connect to Pi" modal. An expected
        // state, not an error: calm copy, and the cost is stated before login.
        <>
          <div className="daily-prep__panel">
            <p className="daily-prep__heading">Connect Pi to rank your score</p>
            <p className="daily-prep__text">
              Ranked scores need a Pi connection before the run starts. You can still
              play locally — that score won't be ranked.
            </p>
            <p className="daily-prep__note">Ranked Daily Runs are limited to 3 attempts per day.</p>
            {authNotice && <p className="daily-prep__error">{authNotice}</p>}
          </div>
          <div className="daily-prep__actions">
            {onReconnect && (
              <button className="btn btn--primary" type="button" onClick={connect}>
                Connect Pi
              </button>
            )}
            <button className="btn btn--secondary" type="button" onClick={() => playLocally()}>
              Play locally
            </button>
            <button className="btn btn--ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : step === "confirm-last" ? (
        // Phase 13G — the one-time last-attempt confirmation (canonical §9/§11).
        // Nothing has been reserved yet. An informed-cost choice, not an error.
        <>
          <div className="daily-prep__panel daily-prep__panel--last">
            <p className="daily-prep__heading">{LAST_ATTEMPT_COPY.title}</p>
            <p className="daily-prep__text">{LAST_ATTEMPT_COPY.text}</p>
          </div>
          <div className="daily-prep__actions">
            <button className="btn btn--primary" type="button" onClick={acceptLastAttempt}>
              {LAST_ATTEMPT_COPY.accept}
            </button>
            <button className="btn btn--secondary" type="button" onClick={() => playLocally()}>
              {LAST_ATTEMPT_COPY.local}
            </button>
            <button className="btn btn--ghost" type="button" onClick={onCancel}>
              {LAST_ATTEMPT_COPY.cancel}
            </button>
          </div>
        </>
      ) : step === "limit" ? (
        // Phase 13G — formerly Home's "No ranked attempts left" modal, now
        // driven by the authoritative status read (or a claim-side race).
        <>
          <div className="daily-prep__panel">
            <p className="daily-prep__heading">No ranked attempts left today</p>
            <p className="daily-prep__text">
              You've used all {maxAttempts} ranked Daily Runs for today. You can still play
              locally — that score won't be ranked.
            </p>
          </div>
          <div className="daily-prep__actions">
            <button className="btn btn--primary" type="button" onClick={() => playLocally(true)}>
              Play locally
            </button>
            <button className="btn btn--ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : step === "empty-manifest" ? (
        <>
          <p className="daily-prep__step">
            No tokens today — this run won't be ranked. Play anyway?
          </p>
          <div className="daily-prep__actions">
            <button className="btn btn--primary" type="button" onClick={playAnyway}>
              Play anyway
            </button>
            <button className="btn btn--secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : step !== "error" ? (
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
            <button className="btn btn--primary" type="button" onClick={retry}>
              Retry
            </button>
            <button className="btn btn--secondary" type="button" onClick={() => playLocally()}>
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
