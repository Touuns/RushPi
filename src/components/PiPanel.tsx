import { useState } from "react";
import type { PiUser } from "../pi/piClient";
import { createTestPayment, PiPaymentCancelled } from "../pi/piClient";

interface PiPanelProps {
  /** Whether window.Pi is present (running where the Pi SDK is available). */
  sdkAvailable: boolean;
  piUser: PiUser | null;
  /** Called after a successful test payment so the parent can persist/refresh. */
  onPaymentComplete: () => void;
  /** Whether the test payment was already completed (persisted). */
  testPaymentDone: boolean;
}

type PayStatus = "idle" | "pending" | "success" | "cancelled" | "error";

/**
 * Developer-checklist test payment panel (payment ONLY since Phase 10B-P3 —
 * connection lives in the header PiConnectChip). Renders nothing unless a Pi
 * user is connected. The actual Pi API key lives only on the server (Vercel);
 * this only triggers the SDK and shows status.
 */
export default function PiPanel({
  sdkAvailable,
  piUser,
  onPaymentComplete,
  testPaymentDone,
}: PiPanelProps) {
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [payMessage, setPayMessage] = useState<string>("");

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

  // Payment-only panel: nothing to show unless a Pi user is connected.
  if (!sdkAvailable || !piUser) return null;

  return (
    <div className="pi-panel">
      <span className="pi-panel__title">Pi Network</span>

      {testPaymentDone && payStatus !== "success" && (
        <p className="pi-panel__done">✓ Pi test payment completed — thanks!</p>
      )}

      {/* Discreet + clearly optional: the game is fully playable without it. */}
      <p className="pi-panel__desc">
        Optional: send a small Testnet payment to support Rush Pi.
        Not required to play, no gameplay advantage.
      </p>
      <button
        className="btn btn--ghost btn--small"
        type="button"
        onClick={handleTestPayment}
        disabled={payStatus === "pending"}
      >
        {payStatus === "pending" ? "Processing…" : "Test Pi Payment"}
      </button>

      {payMessage && (
        <p className={`pi-panel__status is-${payStatus}`}>{payMessage}</p>
      )}
    </div>
  );
}
