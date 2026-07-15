/**
 * Cryptographically-safe ranked run identifier (Phase 11B-P4).
 *
 * Generated once per ranked preparation. A lost claim/sync response can then be
 * safely retried with the SAME id (idempotent on the server) without consuming a
 * second attempt or creating a second score. Never uses Math.random().
 */
export function newSubmissionId(): string {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();

  // Fallback: RFC-4122 v4 from getRandomValues (still cryptographically secure).
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    );
  }
  throw new Error("Secure random source unavailable");
}
