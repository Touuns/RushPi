/**
 * Pi Network integration layer (Phase 4).
 *
 * Frontend responsibilities ONLY:
 *  - initialize the Pi SDK (window.Pi, loaded via the script tag in index.html)
 *  - authenticate the user (scopes: username, payments)
 *  - launch a small User-to-App test payment on explicit user action
 *  - forward the SDK's server callbacks to our own Vercel serverless endpoints,
 *    which hold the secret PI_API_KEY and call the Pi Platform API.
 *
 * Hard rules (do not break):
 *  - the Pi API key lives ONLY on the server (Vercel env), never here
 *  - never request the wallet passphrase
 *  - no auto-payment: createTestPayment() runs only from a user click
 *  - no pay-to-win: this payment is a developer-checklist validation, nothing more
 */

// ---- Pi SDK typings (minimal surface we use) ----------------------------

export interface PiUser {
  uid: string;
  username: string;
}

interface PiAuthResult {
  accessToken: string;
  user: PiUser;
}

type PiScope = "username" | "payments";

/** Shape of a payment object handed to onIncompletePaymentFound. */
interface PiIncompletePayment {
  identifier: string;
  transaction?: { txid: string } | null;
}

interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: unknown) => void;
}

interface PiSDK {
  init: (config: { version: string; sandbox?: boolean }) => void;
  authenticate: (
    scopes: PiScope[],
    onIncompletePaymentFound: (payment: PiIncompletePayment) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

// ---- Test payment constants (per Phase 4 spec) --------------------------

const TEST_PAYMENT = {
  amount: 0.01,
  memo: "Rush Pi test payment",
  metadata: {
    type: "rush_pi_test_payment",
    app: "Rush Pi",
    purpose: "developer_checklist",
  } as Record<string, unknown>,
};

/** Custom error so the UI can distinguish a user cancellation from a failure. */
export class PiPaymentCancelled extends Error {
  constructor() {
    super("Payment cancelled.");
    this.name = "PiPaymentCancelled";
  }
}

// ---- Module state --------------------------------------------------------

let initialized = false;
let currentUser: PiUser | null = null;

// ---- Helpers -------------------------------------------------------------

/** Whether the Pi SDK is present (i.e. running where window.Pi is available). */
export function isPiBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.Pi !== "undefined";
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Incomplete payments must be finished before a new one can start. If the SDK
 * hands us one with a txid, ask our server to complete it; otherwise report it.
 */
async function handleIncompletePayment(payment: PiIncompletePayment): Promise<void> {
  const paymentId = payment?.identifier;
  const txid = payment?.transaction?.txid;
  try {
    if (paymentId && txid) {
      await postJson("/api/pi/complete-payment", { paymentId, txid });
    } else if (paymentId) {
      await postJson("/api/pi/incomplete-payment", { paymentId });
    }
  } catch (err) {
    // Non-fatal: log and continue so the app stays usable.
    console.warn("[piClient] handleIncompletePayment failed:", err);
  }
}

// ---- Public API ----------------------------------------------------------

/** Initialize the Pi SDK once. Safe to call when the SDK is absent (no-op). */
export async function initPi(): Promise<void> {
  if (initialized || !isPiBrowser()) return;
  // sandbox=true is only for the standalone Pi Sandbox web env; inside Pi Browser
  // the network (Testnet/Mainnet) comes from the app's Developer Portal config.
  const sandbox = import.meta.env.VITE_PI_SANDBOX === "true";
  window.Pi!.init({ version: "2.0", sandbox });
  initialized = true;
}

/** Authenticate with Pi (username + payments). Returns the Pi user. */
export async function authenticatePi(): Promise<PiUser> {
  if (!isPiBrowser()) {
    throw new Error("Pi SDK not available. Open Rush Pi in Pi Browser.");
  }
  await initPi();
  const scopes: PiScope[] = ["username", "payments"];
  const result = await window.Pi!.authenticate(scopes, (payment) => {
    void handleIncompletePayment(payment);
  });
  currentUser = result.user;
  return result.user;
}

/** The currently authenticated Pi user, if any. */
export function getPiUser(): PiUser | null {
  return currentUser;
}

/**
 * Launch the small User-to-App test payment. Resolves on completion, rejects
 * with PiPaymentCancelled on cancel, or a generic Error on failure.
 * MUST be called from an explicit user action — never automatically.
 */
export function createTestPayment(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!isPiBrowser()) {
      reject(new Error("Pi SDK not available. Open Rush Pi in Pi Browser."));
      return;
    }
    window.Pi!.createPayment(
      {
        amount: TEST_PAYMENT.amount,
        memo: TEST_PAYMENT.memo,
        metadata: TEST_PAYMENT.metadata,
      },
      {
        // Step 1: Pi asks our server to approve the payment.
        onReadyForServerApproval: (paymentId) => {
          postJson("/api/pi/approve-payment", { paymentId }).catch((err) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          });
        },
        // Step 2: after on-chain submission, our server completes the payment.
        onReadyForServerCompletion: (paymentId, txid) => {
          postJson("/api/pi/complete-payment", { paymentId, txid })
            .then(() => resolve())
            .catch((err) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            });
        },
        onCancel: () => reject(new PiPaymentCancelled()),
        onError: (error) =>
          reject(error instanceof Error ? error : new Error(String(error))),
      },
    );
  });
}
