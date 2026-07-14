import { useState } from "react";
import type { PiUser } from "../pi/piClient";

interface PiConnectChipProps {
  /** Whether window.Pi is present (running where the Pi SDK is available). */
  sdkAvailable: boolean;
  piUser: PiUser | null;
  /** Authenticate with Pi; throws on failure. */
  onConnect: () => Promise<void>;
  /** Open the profile screen (used when already connected). */
  onProfile: () => void;
}

/**
 * Compact Pi connection chip for the Home header (Phase 10B-P3). The single
 * "Connect Pi" entry point: outside Pi Browser it shows a discreet hint chip;
 * disconnected it connects (with a Connecting… state and inline error);
 * connected it shows @username and opens the Profile. Auth flow itself
 * (authenticatePi / auto-auth in App) is unchanged.
 */
export default function PiConnectChip({
  sdkAvailable,
  piUser,
  onConnect,
  onProfile,
}: PiConnectChipProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sdkAvailable) {
    return <span className="pi-chip pi-chip--hint">Open in Pi Browser</span>;
  }

  if (piUser) {
    return (
      <button className="pi-chip pi-chip--user" type="button" onClick={onProfile}>
        @{piUser.username}
      </button>
    );
  }

  const handleConnect = async () => {
    if (connecting) return; // guard double taps
    setConnecting(true);
    setError(null);
    try {
      await onConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to Pi.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <span className="pi-chip-wrap">
      <button
        className="pi-chip pi-chip--connect"
        type="button"
        onClick={handleConnect}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : "Connect Pi"}
      </button>
      {error && <span className="pi-chip__error">{error}</span>}
    </span>
  );
}
