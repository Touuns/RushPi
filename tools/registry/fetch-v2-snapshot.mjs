#!/usr/bin/env node
// One-time provider-data capture for the V2 catalog proposal (Phase 12C-1B1).
// Retrieves the current CoinGecko top-500 assets by market cap via paginated
// requests and freezes ONLY the market-identity/ranking fields needed to
// reproduce and audit curation into a committed raw input file.
//
// This is deliberately SEPARATE from build-v2.mjs: the build must be
// deterministic and offline, so it reads this frozen capture rather than the
// live network. Re-running this script re-captures live data (ranks move); the
// build then transforms the frozen capture byte-identically every time.
//
// Never stored here: image/logo URLs, price history, API credentials.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, "data", "v2-provider-capture.json");

const BASE = "https://api.coingecko.com/api/v3";
const ENDPOINT = "/coins/markets";
const PER_PAGE = 100;
const PAGES = [1, 2, 3, 4, 5]; // top 500
const QUERY_BASE = {
  vs_currency: "usd",
  order: "market_cap_desc",
  per_page: String(PER_PAGE),
  sparkline: "false",
  price_change_percentage: "",
  locale: "en",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page) {
  const params = new URLSearchParams({ ...QUERY_BASE, page: String(page) });
  const url = `${BASE}${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`CoinGecko page ${page} failed: HTTP ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (!Array.isArray(body) || body.length === 0) {
    throw new Error(`CoinGecko page ${page} returned no rows — refusing to freeze a partial snapshot.`);
  }
  return body;
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const rows = [];
  for (const page of PAGES) {
    const body = await fetchPage(page);
    for (const c of body) {
      // Keep ONLY audit-relevant identity/ranking fields. No image URL.
      rows.push({
        id: c.id,
        symbol: typeof c.symbol === "string" ? c.symbol.toUpperCase() : c.symbol,
        name: c.name,
        marketCapRank: c.market_cap_rank ?? null,
        marketCap: c.market_cap ?? null,
        lastUpdated: c.last_updated ?? null,
      });
    }
    if (page !== PAGES[PAGES.length - 1]) await sleep(3000); // be gentle on the public API
  }

  const capture = {
    provider: "coingecko",
    endpoint: `${BASE}${ENDPOINT}`,
    queryParams: { ...QUERY_BASE, per_page: String(PER_PAGE), pages: PAGES },
    retrievedAt,
    rowCount: rows.length,
    rows,
  };

  writeFileSync(outPath, `${JSON.stringify(capture, null, 2)}\n`, "utf8");
  console.log(`Captured ${rows.length} rows -> ${outPath}`);
  console.log(`retrievedAt=${retrievedAt}`);
  const ranks = rows.map((r) => r.marketCapRank).filter((r) => typeof r === "number");
  console.log(`rank range: ${Math.min(...ranks)}..${Math.max(...ranks)}`);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
