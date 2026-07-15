/**
 * Small helper around Supabase PostgREST RPC calls (Phase 11B-P4).
 *
 * The ranked-attempt logic lives in atomic PostgreSQL functions (see
 * supabase/migration_11b_p4.sql). This module calls them with the service role
 * key (server-only) and, crucially, distinguishes "the migration hasn't been
 * applied yet" from a genuine server error so the app can degrade gracefully
 * (offer local play) instead of failing opaquely.
 */

export interface ServiceConfig {
  url: string;
  key: string;
}

/** Raised when the required table/function is missing (migration not applied). */
export class MigrationRequiredError extends Error {
  code = "MIGRATION_REQUIRED" as const;
  constructor(message = "Ranked attempt schema is not installed") {
    super(message);
    this.name = "MigrationRequiredError";
  }
}

/** Raised for any other RPC/DB failure. */
export class RpcError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "RpcError";
    this.status = status;
  }
}

export function getServiceConfig(): ServiceConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function looksLikeMissingSchema(status: number, body: string): boolean {
  // PostgREST: unknown function → 404 with code PGRST202. A function body that
  // hits a missing table → 42P01 "relation ... does not exist".
  if (status === 404) return true;
  return /PGRST202|42P01|does not exist|could not find the function/i.test(body);
}

/**
 * Call a PostgreSQL function via PostgREST RPC. Returns the parsed JSON result.
 * Throws MigrationRequiredError if the function/table is missing, RpcError
 * otherwise.
 */
export async function callRpc<T>(
  cfg: ServiceConfig,
  fnName: string,
  args: Record<string, unknown>,
): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${cfg.url}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new RpcError("Database unreachable", 503);
  }

  const text = await resp.text().catch(() => "");
  if (!resp.ok) {
    if (looksLikeMissingSchema(resp.status, text)) {
      throw new MigrationRequiredError();
    }
    throw new RpcError(`RPC ${fnName} failed (${resp.status})`, resp.status >= 500 ? 502 : 400);
  }
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new RpcError(`RPC ${fnName} returned malformed JSON`);
  }
}
