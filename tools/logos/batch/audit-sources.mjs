/**
 * Phase 13-Q1 - single automated source audit pass.
 *
 * Classifies every Registry V2 token into one licence/identity category WITHOUT
 * downloading or publishing anything. CoinGecko is used ONLY to discover an
 * official homepage/repository for the residual list; its images are never a
 * publication source.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = process.argv[2];
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry/tokens/v2-proposal/registry.json"), "utf8"));
const spothq = JSON.parse(fs.readFileSync(path.join(CACHE, "spothq-manifest.json"), "utf8"));

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const GENERIC = new Set(["generic"]);

// --- spothq CC0 index: symbol -> entries -------------------------------------
const bySymbol = new Map();
for (const e of spothq) {
  const k = norm(e.symbol);
  if (!bySymbol.has(k)) bySymbol.set(k, []);
  bySymbol.get(k).push(e);
}

const rows = [];
for (const t of registry.entries) {
  const already = null; // filled by caller for the 11 released
  const cands = bySymbol.get(norm(t.symbol)) || [];
  const exact = cands.filter((c) => norm(c.name) === norm(t.name) && !GENERIC.has(norm(c.symbol)));
  let category, source, rule, confidence, publishable;

  if (exact.length === 1) {
    category = "community-cc0-token-icon";
    source = `spothq/cryptocurrency-icons (CC0 1.0) :: ${exact[0].symbol.toLowerCase()}`;
    rule = "symbol+name exact (2 facteurs), icone generique exclue";
    confidence = "high-identity / cc0-licence-claire";
    publishable = true;
  } else if (cands.length && exact.length === 0) {
    category = "ambiguous";
    source = `spothq :: ${cands.map((c) => c.name).slice(0, 2).join(" | ")}`;
    rule = "symbole concordant mais nom divergent -> rejete (critere 5)";
    confidence = "low";
    publishable = false;
  } else if (exact.length > 1) {
    category = "ambiguous";
    source = "spothq :: plusieurs correspondances";
    rule = "identite non unique";
    confidence = "low";
    publishable = false;
  } else {
    category = "not-found";
    source = "aucune collection licenciee ne contient ce token";
    rule = "-";
    confidence = "-";
    publishable = false;
  }
  rows.push({
    tokenId: t.tokenId, name: t.name, symbol: t.symbol,
    providerId: t.providerIds?.coingecko ?? null,
    category, source, rule, confidence, publishable,
  });
}
fs.writeFileSync(path.join(ROOT, "tools/logos/data/q1-source-audit.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

const by = {};
for (const r of rows) (by[r.category] ||= []).push(r);
for (const [k, v] of Object.entries(by)) console.log(`  ${k.padEnd(28)} ${String(v.length).padStart(3)}`);
