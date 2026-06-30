/**
 * Pi Network integration — PLACEHOLDER ONLY.
 *
 * The real Pi SDK integration (authentication, payments, wallet) will be added
 * LATER, after the game is playable and deployed to a public HTTPS URL (Vercel)
 * and registered in the Pi Browser Develop portal.
 *
 * For now these functions are intentionally inert so the rest of the app can be
 * structured around them without pulling in any Pi dependency, network call,
 * secret key, wallet access, or payment flow.
 *
 * Hard rules for this project (do not violate when wiring the real SDK later):
 *  - never request the user's wallet passphrase
 *  - never promise financial gains / Pi rewards
 *  - no pay-to-win, no gambling/lottery mechanics
 */

/** Whether we're running inside the Pi Browser (the global `Pi` object exists). */
export function isPiBrowser(): boolean {
  return typeof window !== "undefined" && "Pi" in window;
}

/** Will initialize the Pi SDK later. No-op for now. */
export async function initPi(): Promise<void> {
  console.log("[piClient] Pi SDK integration will be added later.");
}

/** Will authenticate via Pi later. Returns a stub local identity for now. */
export async function loginWithPi(): Promise<{ username: string; uid: string }> {
  console.log("[piClient] Pi login placeholder.");
  return {
    username: "Pioneer",
    uid: "local-test-user",
  };
}
