// Read-only access to the frozen/approved token registries for the logo
// tooling. Never writes to registry/tokens/**.
import { readFileSync } from "node:fs";
import path from "node:path";
import { V2_CATALOG_PATH } from "./constants.mjs";

/**
 * Load the approved 250-token V2 registry from disk.
 * @param {string} repoRoot
 * @returns {{ catalogVersion: string, entryCount: number, entries: any[], byTokenId: Map<string, any> }}
 */
export function loadV2Registry(repoRoot) {
  const raw = readFileSync(path.join(repoRoot, V2_CATALOG_PATH), "utf8");
  const parsed = JSON.parse(raw);
  const byTokenId = new Map(parsed.entries.map((e) => [e.tokenId, e]));
  return {
    catalogVersion: parsed.catalogVersion,
    entryCount: parsed.entryCount,
    entries: parsed.entries,
    byTokenId,
  };
}
