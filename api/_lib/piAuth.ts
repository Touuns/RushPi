import type { VercelRequest } from "@vercel/node";

/**
 * Server-side Pi identity verification (Phase 11B-P4).
 *
 * The browser can send any pi_user_uid / pi_username it likes — those are NOT a
 * proof of identity. The only trustworthy identity is the one Pi returns for a
 * valid access token. This helper reads the Bearer access token from the request
 * and verifies it against the official Pi Platform API:
 *
 *   GET https://api.minepi.com/v2/me
 *   Authorization: Bearer <accessToken>
 *
 * Hard rules:
 *  - the access token is read from the Authorization header ONLY (never the body)
 *  - the token is NEVER logged, echoed in a response, or persisted anywhere
 *  - the returned uid/username come from Pi, never from the client payload
 */

const PI_ME_URL = "https://api.minepi.com/v2/me";
const PI_ME_TIMEOUT_MS = 8000;
const MAX_TOKEN_LENGTH = 4096;
// Pi uids are opaque identifiers; accept a safe, bounded character set only.
const UID_PATTERN = /^[A-Za-z0-9._:-]{4,128}$/;

/** Stable authentication error codes shared with the client. */
export type PiAuthErrorCode =
  | "PI_AUTH_REQUIRED"
  | "PI_AUTH_INVALID"
  | "PI_AUTH_EXPIRED"
  | "PI_AUTH_UNAVAILABLE";

export class PiAuthError extends Error {
  code: PiAuthErrorCode;
  /** Suggested HTTP status for the endpoint response. */
  httpStatus: number;
  /** True when the client should simply retry later (Pi temporarily down). */
  retryable: boolean;

  constructor(code: PiAuthErrorCode, message: string) {
    super(message);
    this.name = "PiAuthError";
    this.code = code;
    // UNAVAILABLE = transient (retry); REQUIRED/INVALID/EXPIRED = reconnect.
    this.retryable = code === "PI_AUTH_UNAVAILABLE";
    this.httpStatus = code === "PI_AUTH_UNAVAILABLE" ? 503 : 401;
  }
}

export interface VerifiedPiUser {
  uid: string;
  username: string;
  /** Optional expiry hint if Pi ever provides one (not relied upon). */
  validUntil?: string;
}

/** Extract and sanity-check the Bearer token from the Authorization header. */
function readBearerToken(req: VercelRequest): string {
  const header = req.headers["authorization"] ?? req.headers["Authorization" as never];
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw || typeof raw !== "string") {
    throw new PiAuthError("PI_AUTH_REQUIRED", "Missing Authorization header");
  }
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match) {
    throw new PiAuthError("PI_AUTH_REQUIRED", "Malformed Authorization header");
  }
  const token = match[1].trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new PiAuthError("PI_AUTH_REQUIRED", "Invalid access token length");
  }
  return token;
}

interface PiMeResponse {
  uid?: unknown;
  username?: unknown;
  credentials?: { valid_until?: { timestamp?: number; iso8601?: string } };
}

/**
 * Verify the request's Pi access token and return the Pi-authoritative identity.
 * Throws PiAuthError on any problem (the token itself never appears in the error).
 */
export async function verifyPiRequest(req: VercelRequest): Promise<VerifiedPiUser> {
  const token = readBearerToken(req);

  let resp: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PI_ME_TIMEOUT_MS);
  try {
    resp = await fetch(PI_ME_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    // Network error / timeout → transient, retryable (never log the token).
    throw new PiAuthError("PI_AUTH_UNAVAILABLE", "Pi verification service unreachable");
  } finally {
    clearTimeout(timer);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new PiAuthError("PI_AUTH_INVALID", "Pi access token rejected");
  }
  if (!resp.ok) {
    // 5xx / unexpected → treat as a temporary Pi outage.
    throw new PiAuthError("PI_AUTH_UNAVAILABLE", `Pi verification failed (${resp.status})`);
  }

  let data: PiMeResponse;
  try {
    data = (await resp.json()) as PiMeResponse;
  } catch {
    throw new PiAuthError("PI_AUTH_UNAVAILABLE", "Malformed Pi verification response");
  }

  const uid = typeof data.uid === "string" ? data.uid.trim() : "";
  if (!UID_PATTERN.test(uid)) {
    throw new PiAuthError("PI_AUTH_INVALID", "Pi returned an invalid uid");
  }
  // username is present when the "username" scope was granted; fall back to a
  // neutral, non-personal label only if it is genuinely absent.
  const username =
    typeof data.username === "string" && data.username.trim()
      ? data.username.trim().slice(0, 50)
      : `pioneer-${uid.slice(0, 6)}`;

  const validUntil = data.credentials?.valid_until?.iso8601;
  return { uid, username, ...(validUntil ? { validUntil } : {}) };
}
