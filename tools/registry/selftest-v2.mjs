#!/usr/bin/env node
// In-memory negative self-tests for the V2 proposal constraints
// (Phase 12C-1B1). Proves each V2-specific validator actually rejects its
// violation class. Never touches the committed artifacts. Exits non-zero if any
// violation is NOT caught (or a valid fixture is wrongly rejected).
import { computeContentHash, computeCatalogVersion } from "./lib/canonical.mjs";
import {
  validateProposalEntries,
  validateProposalManifest,
  validateProviderSnapshot,
  validateSelectionInput,
  validateSubstitutionSets,
  validateUncertainReview,
  findImageUrls,
  findSecrets,
} from "./lib/validateV2.mjs";

let failures = 0;
function check(name, condition) {
  if (!condition) {
    failures += 1;
    console.error(` FAIL: ${name}`);
  } else {
    console.log(` ok: ${name}`);
  }
}

const SCHEMA = 2;

function logo() {
  return { status: "pending", version: 0, contentHash: null, url64: null, url128: null, source: null, sourceReference: null, ingestedAt: null };
}
function entry(over = {}) {
  return {
    tokenId: "rpt-0037", name: "Sample", symbol: "SMP", slug: "sample",
    category: "defi", status: "active", eligibilityTier: "discovery",
    assetClass: "token", providerIds: { coingecko: "sample" }, aliases: [],
    networks: [], logo: logo(), ...over,
  };
}

// Minimal valid 250-entry set: 2 anchors (btc/eth) + 248 fillers, plus the two
// V1 preservation references the validator compares against.
function makeValid() {
  const btc = entry({ tokenId: "rpt-0001", name: "Bitcoin", symbol: "BTC", slug: "bitcoin", category: "store-of-value", assetClass: "native", eligibilityTier: "anchor", providerIds: { coingecko: "bitcoin" } });
  const eth = entry({ tokenId: "rpt-0002", name: "Ethereum", symbol: "ETH", slug: "ethereum", category: "smart-contract", assetClass: "native", eligibilityTier: "anchor", providerIds: { coingecko: "ethereum" } });
  const rest = [];
  for (let i = 3; i <= 250; i += 1) {
    const id = `rpt-${String(i).padStart(4, "0")}`;
    rest.push(entry({ tokenId: id, name: `Token ${i}`, symbol: `T${i}`, slug: `token-${i}`, providerIds: { coingecko: `token-${i}` } }));
  }
  const entries = [btc, eth, ...rest];
  const registry = {
    schemaVersion: SCHEMA,
    catalogStage: "proposal",
    catalogVersion: computeCatalogVersion(SCHEMA, entries),
    entryCount: entries.length,
    contentHash: computeContentHash(SCHEMA, entries),
    entries,
  };
  const v1Refs = [
    { tokenId: "rpt-0001", name: "Bitcoin", symbol: "BTC", slug: "bitcoin", category: "store-of-value", assetClass: "native", providerIds: { coingecko: "bitcoin" } },
    { tokenId: "rpt-0002", name: "Ethereum", symbol: "ETH", slug: "ethereum", category: "smart-contract", assetClass: "native", providerIds: { coingecko: "ethereum" } },
  ];
  return { registry, v1Refs };
}

function rebuild(registry) {
  registry.contentHash = computeContentHash(SCHEMA, registry.entries);
  registry.catalogVersion = computeCatalogVersion(SCHEMA, registry.entries);
  registry.entryCount = registry.entries.length;
  return registry;
}

// 1. Valid fixture passes cleanly.
{
  const { registry, v1Refs } = makeValid();
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("valid 250-entry proposal passes", errors.length === 0);
}

// 2. Wrong entry count rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries.pop();
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("249 entries rejected", errors.some((e) => /exactly 250 entries/.test(e)));
}

// 3. Three anchors rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[5].eligibilityTier = "anchor";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("three anchors rejected", errors.some((e) => /exactly 2 anchor/.test(e)));
}

// 4. V1 tokenId reassignment (changed CoinGecko id) rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[0].providerIds = { coingecko: "not-bitcoin" };
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("V1 provider-id reassignment rejected", errors.some((e) => /CoinGecko id changed/.test(e)));
}

// 5. Active wrapped asset rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].assetClass = "wrapped";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("active wrapped asset rejected", errors.some((e) => /wrapped\/bridged/.test(e)));
}

// 6. Duplicate symbol without symbolConflictGroup rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].symbol = registry.entries[11].symbol;
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("duplicate symbol without group rejected", errors.some((e) => /symbolConflictGroup/.test(e)));
}

// 7. Unknown category still rejected even with the expanded V2 set.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].category = "not-a-category";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("unknown category rejected", errors.some((e) => /unknown category/.test(e)));
}

// 8. Excluded tier rejected.
{
  const { registry, v1Refs } = makeValid();
  registry.entries[10].eligibilityTier = "excluded";
  rebuild(registry);
  const { errors } = validateProposalEntries(registry, v1Refs);
  check("excluded tier rejected", errors.some((e) => /must not be "excluded"/.test(e)));
}

// 9. Manifest: missing entry + non-zero version + forbidden field rejected.
{
  const tokenIds = new Set(["rpt-0001", "rpt-0002"]);
  const bad = [
    { tokenId: "rpt-0001", status: "pending", version: 1, requiresRasterization: null },
    { tokenId: "rpt-0002", status: "pending", version: 0, requiresRasterization: null, url64: "x" },
  ];
  const errs = validateProposalManifest(tokenIds, bad);
  check("manifest version!=0 rejected", errs.some((e) => /version must be 0/.test(e)));
  check("manifest forbidden field rejected", errs.some((e) => /forbidden field "url64"/.test(e)));
}
{
  const tokenIds = new Set(["rpt-0001", "rpt-0002"]);
  const good = [
    { tokenId: "rpt-0001", status: "pending", version: 0, requiresRasterization: null },
    { tokenId: "rpt-0002", status: "pending", version: 0, requiresRasterization: null },
  ];
  check("valid manifest passes", validateProposalManifest(tokenIds, good).length === 0);
}

// 10. Image URL + secret scanners.
check("image URL detected", findImageUrls('{"x":"https://coin-images.coingecko.com/a/large/b.png"}').length > 0);
check("plain endpoint not flagged as image", findImageUrls('{"endpoint":"https://api.coingecko.com/api/v3/coins/markets"}').length === 0);
check("secret detected", findSecrets('{"api_key":"zzz"}').length > 0);

// 11. Provider snapshot: bad rank + stray image field rejected.
{
  const errs = validateProviderSnapshot({ rows: [{ id: "x", marketCapRank: 0 }, { id: "y", marketCapRank: 5, image: "u" }] });
  check("non-positive rank rejected", errs.some((e) => /positive integer or null/.test(e)));
  check("snapshot image field rejected", errs.some((e) => /must not carry an image field/.test(e)));
}

// 12. Author-assigned tokenId workflow (12C-1B1.1).
{
  const v1 = new Set(["rpt-0001", "rpt-0002"]);
  check("selection input cannot omit tokenId", validateSelectionInput([{ id: "x" }], v1).some((e) => /missing explicit tokenId/.test(e)));
  check("selection input rejects duplicate tokenId", validateSelectionInput([{ id: "x", tokenId: "rpt-0037" }, { id: "y", tokenId: "rpt-0037" }], v1).some((e) => /duplicate tokenId/.test(e)));
  check("selection input rejects V1 collision", validateSelectionInput([{ id: "x", tokenId: "rpt-0001" }], v1).some((e) => /collides with a frozen V1 tokenId/.test(e)));
  check("selection input rejects bad format", validateSelectionInput([{ id: "x", tokenId: "rpt-37" }], v1).some((e) => /must match/.test(e)));
  check("valid selection input passes", validateSelectionInput([{ id: "x", tokenId: "rpt-0037" }, { id: "y", tokenId: "rpt-0038" }], v1).length === 0);
}

// 13. Reordering the input preserves the providerId->tokenId map AND the hash
// (tokenIds are copied, never index-derived).
{
  const input = [
    { id: "aaa", tokenId: "rpt-0037" },
    { id: "bbb", tokenId: "rpt-0038" },
    { id: "ccc", tokenId: "rpt-0039" },
  ];
  const toEntries = (sel) => sel.map((s) => entry({ tokenId: s.tokenId, providerIds: { coingecko: s.id }, name: `N-${s.id}`, symbol: `S-${s.id}`, slug: `sl-${s.id}` }));
  const forward = toEntries(input);
  const reversed = toEntries(input.slice().reverse());
  const pairMap = (es) => es.map((e) => `${e.providerIds.coingecko}=${e.tokenId}`).sort().join(",");
  check("reorder preserves providerId->tokenId map", pairMap(forward) === pairMap(reversed));
  check("reorder preserves registry contentHash", computeContentHash(SCHEMA, forward) === computeContentHash(SCHEMA, reversed));
}

// 14. Explicit diversity-substitution invariants (12C-1B1.2).
{
  const selected = new Set(["k_sc", "k_oracle", "k_defi"]);
  const cats = { stablecoin: 15, defi: 41, oracle: 3, "smart-contract": 42, ai: 11 };
  const pair = (sel, disp, code, exp) => ({ selected: { providerId: sel.id, name: sel.name, symbol: sel.sym, marketCapRank: sel.r, category: sel.c }, displaced: { providerId: disp.id, name: disp.name, symbol: disp.sym, marketCapRank: disp.r, category: disp.c }, rationaleCode: code, explanation: exp });
  const scSel = { id: "k_sc", name: "Kava", sym: "KAVA", r: 445, c: "smart-contract" };
  const stableDisp = { id: "d_usd", name: "Global Dollar", sym: "USDG", r: 28, c: "stablecoin" };
  const oracleSel = { id: "k_oracle", name: "Tellor", sym: "TRB", r: 500, c: "oracle" };
  const defiDisp = { id: "d_defi", name: "Olympus", sym: "OHM", r: 137, c: "defi" };
  const defiSel = { id: "k_defi", name: "Venus", sym: "XVS", r: 457, c: "defi" };
  const perpDisp = { id: "d_perp", name: "Aster", sym: "ASTER", r: 47, c: "defi" };
  const good = [
    pair(scSel, stableDisp, "stablecoin-overweight-avoidance", "Global Dollar (USDG) is a ~$1 peg; Kava is a distinctly-priced smart-contract L1 that adds real price movement."),
    pair(oracleSel, defiDisp, "category-coverage", "Olympus is a DeFi token (DeFi at 41); Tellor strengthens the far thinner oracle category (3)."),
    pair(defiSel, perpDisp, "redundant-subsector", "Aster is a perpetuals-DEX subsector already covered; Venus supplies the distinct money-market lending subsector."),
  ];
  const divIds = new Set(["d_usd", "d_defi", "d_perp"]);
  check("valid explicit substitution set passes", validateSubstitutionSets(good, selected, divIds, cats).length === 0);

  // stablecoin rule: displaced must be a stablecoin.
  const badStable = [pair(scSel, defiDisp, "stablecoin-overweight-avoidance", "Olympus is a DeFi token; Kava is a smart-contract L1 kept instead of it.")];
  check("stablecoin rationale w/ non-stable displaced rejected", validateSubstitutionSets(badStable, selected, new Set(["d_defi"]), cats).some((e) => /requires the displaced asset to be a stablecoin/.test(e)));

  // category-coverage rule: selected category must be thinner.
  const badCov = [pair({ id: "k_sc", name: "Kava", sym: "KAVA", r: 445, c: "smart-contract" }, defiDisp, "category-coverage", "Olympus is DeFi (41); Kava is a smart-contract L1 (42) kept over it.")];
  check("category-coverage w/ deeper selected rejected", validateSubstitutionSets(badCov, selected, new Set(["d_defi"]), cats).some((e) => /less represented/.test(e)));

  // redundant-subsector rule: categories must match.
  const badSub = [pair(oracleSel, defiDisp, "redundant-subsector", "Olympus is a DeFi subsector token; Tellor is an oracle kept over it.")];
  check("redundant-subsector across categories rejected", validateSubstitutionSets(badSub, selected, new Set(["d_defi"]), cats).some((e) => /share the broad category/.test(e)));

  // rank inversion rejected (selectedRank must be > displacedRank).
  const inv = [pair({ id: "k_defi", name: "Venus", sym: "XVS", r: 40, c: "defi" }, perpDisp, "redundant-subsector", "Aster perpetuals-DEX subsector covered; Venus adds a lending subsector.")];
  check("rank inversion rejected", validateSubstitutionSets(inv, selected, new Set(["d_perp"]), cats).some((e) => /numerically greater/.test(e)));

  // generic explanation (does not name both sides) rejected.
  const generic = [pair(defiSel, perpDisp, "redundant-subsector", "Kept a lower-ranked distinct-category asset for diversity in this subsector context.")];
  check("generic explanation rejected", validateSubstitutionSets(generic, selected, new Set(["d_perp"]), cats).some((e) => /name both/.test(e)));

  // overlap + count guards still hold.
  const overlap = [pair(defiSel, { id: "k_sc", name: "Kava", sym: "KAVA", r: 10, c: "smart-contract" }, "redundant-subsector", "Kava subsector context; Venus adds lending.")];
  check("substitution overlap rejected", validateSubstitutionSets(overlap, selected, new Set(["k_sc"]), cats).some((e) => /also selected/.test(e)));
  const tooMany = Array.from({ length: 31 }, (_, i) => pair({ id: `k${i}`, name: `Sel${i}`, sym: `S${i}`, r: 400 + i, c: "defi" }, { id: `d${i}`, name: `Usd${i}`, sym: `U${i}`, r: 10, c: "stablecoin" }, "stablecoin-overweight-avoidance", `Usd${i} is a peg; Sel${i} adds price movement.`));
  const selMany = new Set(tooMany.map((p) => p.selected.providerId));
  const divMany = new Set(tooMany.map((p) => p.displaced.providerId));
  check("more than 30 substitutions rejected", validateSubstitutionSets(tooMany, selMany, divMany, {}).some((e) => /exceed the max/.test(e)));
}

// 14b. No rank-zipped implicit pairing helper remains.
{
  const mod = await import("./lib/v2Baseline.mjs");
  check("pairSubstitutions helper removed", typeof mod.pairSubstitutions === "undefined");
}

// 14c. Authored substitutions file: every entry has selectedId+displacedId and
// the explicit pairs exactly cover the computed baseline sets.
{
  const { V2_DIVERSITY_SUBSTITUTIONS } = await import("./data/v2-substitutions.mjs");
  check("every substitution entry has selectedId and displacedId", V2_DIVERSITY_SUBSTITUTIONS.every((s) => typeof s.selectedId === "string" && typeof s.displacedId === "string"));
  const { computeBaseline } = await import("./lib/v2Baseline.mjs");
  const { V2_NEW_ENTRIES } = await import("./data/v2-metadata.mjs");
  const { V2_RECOGNIZED_ELIGIBLE } = await import("./data/v2-recognized-eligible.mjs");
  const { readFileSync } = await import("node:fs");
  const cap = JSON.parse(readFileSync("tools/registry/data/v2-provider-capture.json", "utf8"));
  const v1 = JSON.parse(readFileSync("registry/tokens/v1/registry.json", "utf8"));
  const base = computeBaseline({
    rows: cap.rows,
    v1Ids: new Set(v1.entries.map((e) => e.providerIds.coingecko)),
    selectedNonV1: new Set(V2_NEW_ENTRIES.map((e) => e.id)),
    recognizedEligible: new Set(V2_RECOGNIZED_ELIGIBLE.map((r) => r.id)),
    targetCount: 250,
  });
  const selPairs = new Set(V2_DIVERSITY_SUBSTITUTIONS.map((s) => s.selectedId));
  const dispPairs = new Set(V2_DIVERSITY_SUBSTITUTIONS.map((s) => s.displacedId));
  const coversExtra = base.extra.length === selPairs.size && base.extra.every((id) => selPairs.has(id));
  const coversDisplaced = base.displaced.length === dispPairs.size && base.displaced.every((id) => dispPairs.has(id));
  check("explicit pairs exactly cover the proposal extra set", coversExtra);
  check("explicit pairs exactly cover the baseline displaced set", coversDisplaced);
}

// 15. Uncertain review invariants.
{
  const expected = ["a", "b"];
  const inCatalog = new Set(["a", "b"]);
  const goodRev = expected.map((id) => ({ providerId: id, uncertaintyType: "rebrand", reviewOutcome: "verified", canonicalNameDecision: "x", symbolDecision: "x", categoryDecision: "x", providerEvidenceReference: "cg", reviewedAt: "t", note: "n", officialEvidenceReferences: ["u"] }));
  check("valid uncertain review passes", validateUncertainReview(goodRev, expected, inCatalog).length === 0);
  check("missing uncertain entry rejected", validateUncertainReview([goodRev[0]], expected, inCatalog).some((e) => /missing expected entry: b/.test(e)));
  const stillIn = [{ ...goodRev[0], reviewOutcome: "excluded-unresolved" }];
  check("excluded-unresolved still in catalog rejected", validateUncertainReview(stillIn, ["a"], inCatalog).some((e) => /still present in the catalog/.test(e)));
}

if (failures > 0) {
  console.error(`\nV2 selftest FAILED: ${failures} check(s) did not hold.`);
  process.exit(1);
}
console.log("\nV2 selftest OK: all V2 proposal constraints are enforced.");
