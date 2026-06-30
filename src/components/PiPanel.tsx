import { useState } from "react";
import type { PiUser } from "../pi/piClient";
import { createTestPayment, PiPaymentCancelled } from "../pi/piClient";

interface PiPanelProps {
  /** Whether window.Pi is present (running where the Pi SDK is available). */
  sdkAvailable: boolean;
  piUser: PiUser | null;
  /** Authenticate with Pi; throws on failure. */
  onConnect: () => Promise<void>;
  /** Called after a successful test payment so the parent can persist/refresh. */
  onPaymentComplete: () => void;
  /** Whether the test payment was already completed (persisted). */
  testPaymentDone: boolean;
}

type PayStatus = "idle" | "pending" | "success" | "cancelled" | "error";

/**
 * Pi connection + developer-checklist test payment. Self-contained and optional:
 * the game stays fully playable without connecting. The actual Pi API key lives
 * only on the server (Vercel) — this only triggers the SDK and shows status.
 */
export default function PiPanel({
  sdkAvailable,
  piUser,
  onConnect,
  onPaymentComplete,
  testPaymentDone,
}: PiPanelProps) {
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [payMessage, setPayMessage] = useState<string>("");

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnect();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect to Pi.");
    } finally {
      setConnecting(false);
    }
  };

  const handleTestPayment = async () => {
    setPayStatus("pending");
    setPayMessage("");
    try {
      await createTestPayment();
      onPaymentComplete();
      setPayStatus("success");
      setPayMessage("Pi payment completed.");
    } catch (err) {
      if (err instanceof PiPaymentCancelled) {
        setPayStatus("cancelled");
        setPayMessage("Payment cancelled.");
      } else {
        setPayStatus("error");
        setPayMessage(err instanceof Error ? err.message : "Payment failed.");
      }
    }
  };

  return (
    <div className="pi-panel">
      <span className="pi-panel__title">Pi Network</span>

      {!sdkAvailable && (
        <p className="pi-panel__hint">Open in Pi Browser to connect your Pi account.</p>
      )}

      {sdkAvailable && !piUser && (
        <>
          <button
            className="btn btn--secondary"
            type="button"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : "Connect Pi"}
          </button>
          {connectError && <p className="pi-panel__error">{connectError}</p>}
        </>
      )}

      {sdkAvailable && piUser && (
        <>
          <p className="pi-panel__connected">
            Connected as <strong>@{piUser.username}</strong>
          </p>

          {testPaymentDone && payStatus !== "success" && (
            <p className="pi-panel__done">✓ Test payment already completed.</p>
          )}

          <p className="pi-panel__desc">
            Send a small Testnet payment to verify Rush Pi integration.
          </p>
          <button
            className="btn btn--secondary"
            type="button"
            onClick={handleTestPayment}
            disabled={payStatus === "pending"}
          >
            {payStatus === "pending" ? "Processing…" : "Test Pi Payment"}
          </button>

          {payMessage && (
            <p className={`pi-panel__status is-${payStatus}`}>{payMessage}</p>
          )}
        </>
      )}
    </div>
  );
}
