/**
 * Standalone browser-safe loader for the public token logo release manifest.
 * Mirrors the AbortController + timeout shape used by src/market/marketClient.ts,
 * but returns a discriminated result instead of throwing, per this phase's
 * contract (parseTokenLogoManifest failures and HTTP/network/timeout failures
 * are all first-class, typed outcomes for the future caller to react to).
 *
 * Same-origin relative URL only, GET, default credentials, no retry, no
 * caching policy change, no module-level cache, and this function is never
 * invoked by importing this module (see manifestClient.test.ts).
 */
import { parseTokenLogoManifest, type TokenLogoManifestParseFailureCode } from "./manifestParser.ts";
import { buildManifestIndex, type TokenLogoManifestIndex } from "./manifestIndex.ts";
import type { TokenLogoManifest } from "./types.ts";

export const TOKEN_LOGO_MANIFEST_URL = "/data/token-logos/release-manifest.json";

const FETCH_TIMEOUT_MS = 8000;

export type TokenLogoManifestFetchFailure =
  | { readonly ok: false; readonly reason: "http-error"; readonly status: number }
  | { readonly ok: false; readonly reason: "malformed-json"; readonly detail: string }
  | {
      readonly ok: false;
      readonly reason: "schema-invalid";
      readonly code: TokenLogoManifestParseFailureCode;
      readonly detail: string;
    }
  | { readonly ok: false; readonly reason: "timeout" }
  | { readonly ok: false; readonly reason: "network-error"; readonly detail: string };

export interface TokenLogoManifestFetchSuccess {
  readonly ok: true;
  readonly manifest: TokenLogoManifest;
  readonly index: TokenLogoManifestIndex;
}

export type TokenLogoManifestFetchResult = TokenLogoManifestFetchSuccess | TokenLogoManifestFetchFailure;

/** Fetch and strictly parse the token logo manifest. Never throws. */
export async function fetchTokenLogoManifest(): Promise<TokenLogoManifestFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TOKEN_LOGO_MANIFEST_URL, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return {
      ok: false,
      reason: "network-error",
      detail: err instanceof Error ? err.message : "Unknown network error",
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return { ok: false, reason: "http-error", status: response.status };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: "malformed-json",
      detail: err instanceof Error ? err.message : "Response body is not valid JSON",
    };
  }

  const parsed = parseTokenLogoManifest(json);
  if (!parsed.ok) {
    return { ok: false, reason: "schema-invalid", code: parsed.code, detail: parsed.detail };
  }

  return { ok: true, manifest: parsed.manifest, index: buildManifestIndex(parsed.manifest) };
}
