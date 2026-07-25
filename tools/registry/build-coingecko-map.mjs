#!/usr/bin/env node
// Generates the tiny checked-in CoinGecko-provider-id -> tokenId map consumed
// by the browser-safe logo client layer (src/logos/coingeckoTokenMap.ts).
// Node-only tooling: reads the canonical V2 proposal registry (source of
// truth for provider IDs) and emits a plain TypeScript literal with no
// reference back to the source artifact's path, so the generated file stays
// on the src/ side of the existing runtime/tooling firewall enforced by
// tools/logos/selftest.mjs ("no src/ or api/ module imports registry V2
// proposal or tooling data"). Deterministic: sorted by tokenId, no time, no
// Math.random, no network. STOPS on any duplicate CoinGecko provider ID.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const SOURCE_PATH = path.join(repoRoot, "registry", "tokens", "v2-proposal", "registry.json");
const OUTPUT_PATH = path.join(repoRoot, "src", "logos", "generatedCoingeckoTokenMap.ts");

function readRegistry() {
  const raw = readFileSync(SOURCE_PATH, "utf8");
  return JSON.parse(raw);
}

function buildPairs(registry) {
  const pairs = [];
  const seenCoingeckoIds = new Set();
  const sortedEntries = registry.entries.slice().sort((a, b) => (a.tokenId < b.tokenId ? -1 : a.tokenId > b.tokenId ? 1 : 0));
  for (const entry of sortedEntries) {
    const coingeckoId = entry.providerIds?.coingecko;
    if (!coingeckoId) continue;
    if (seenCoingeckoIds.has(coingeckoId)) {
      throw new Error(`Duplicate canonical CoinGecko provider ID: ${coingeckoId} (tokenId ${entry.tokenId})`);
    }
    seenCoingeckoIds.add(coingeckoId);
    pairs.push([coingeckoId, entry.tokenId]);
  }
  return pairs;
}

function renderModule(pairs) {
  const lines = pairs.map(([coingeckoId, tokenId]) => `  [${JSON.stringify(coingeckoId)}, ${JSON.stringify(tokenId)}],`);
  return `/**
 * Auto-generated. Do not hand-edit — regenerate with
 * \`npm run registry:build-coingecko-map\`.
 *
 * Canonical CoinGecko provider ID -> tokenId pairs, sorted by tokenId.
 * Deterministic, browser-safe, no build-time JSON import, no runtime fetch.
 */
export const COINGECKO_TOKEN_ID_PAIRS: readonly (readonly [string, string])[] = [
${lines.join("\n")}
];
`;
}

function main() {
  const registry = readRegistry();
  const pairs = buildPairs(registry);
  const moduleSource = renderModule(pairs);
  writeFileSync(OUTPUT_PATH, moduleSource, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`pairCount=${pairs.length}`);
}

main();
