# V2 curated 250-token catalog — PROPOSAL (Phase 12C-1B1)

**This is a PROPOSAL, not a production catalog.** It is a reviewable, immutable
snapshot of a curated 250-asset Rush Pi catalog. It is **not** wired into any
runtime, does **not** replace the frozen V1 registry, and must **never** be
imported by runtime code or labelled `latest`.

- `catalogStage: "proposal"` is set in every artifact's metadata.
- The current Daily runtime, token selection, ranked validation, Supabase,
  logos and deployment are untouched by this phase.
- No logos were downloaded, generated, converted or uploaded. Every logo entry
  is `pending`.

## What it contains

Exactly **250** entries:

- **36 frozen V1 assets** (`rpt-0001`..`rpt-0036`) preserved verbatim — same
  tokenId, CoinGecko provider id, name, symbol, slug, category and assetClass.
  These are re-emitted from `registry/tokens/v1/registry.json`, never
  re-authored, and the V1 artifact and its hash are not modified.
- **214 new assets** (`rpt-0037`..`rpt-0250`) selected from the current
  CoinGecko top-500 by market cap. Their tokenIds are **explicit literals** in
  `tools/registry/data/v2-metadata.mjs` (never derived from array position).

## Files

| File | Purpose |
| --- | --- |
| `registry.json` | The 250-entry proposal: `schemaVersion`, immutable content-derived `catalogVersion`, `entryCount`, `contentHash`, canonical tokenId ordering. No current time enters the hashed content. |
| `logo-manifest.json` | Exactly one `pending`, `version: 0` entry per token — no source, URL, hash or ingestion fields. Nothing has been sourced. |
| `provider-snapshot.json` | Audit-only market identity/ranking for the top-500 capture (id, symbol, name, rank, market cap, `last_updated`). No image URLs, no price history, no credentials. |
| `exclusions.json` | Every considered-but-excluded candidate with a controlled reason code, neutral explanation, and (where relevant) the underlying asset id / evidence reference. |
| `curation-report.json` | Provenance + counts: tiers, categories, assetClasses, exclusions by reason, diversity substitutions, ambiguous reviews, and the highest-uncertainty included entries. |

## Selection policy (transparent, not raw top-250-by-rank)

1. Preserve all 36 V1 assets.
2. Take a strong rank-based crypto-native foundation from the top 500.
3. Remove prohibited/duplicate asset forms — wrapped, bridged, LP/receipt,
   leveraged, tokenized stocks/ETFs, tokenized funds/T-bills/credit,
   tokenized commodities, duplicate representations, and unverifiable identities.
4. Use a controlled number of diversity picks from ranks 251–500 to widen
   category coverage (see `diversitySubstitutions` in the curation report).

Eligibility tiers (`anchor` / `core` / `established` / `discovery`) are
**collection/selection metadata only** — they do not alter token points or
scoring. Exactly two anchors: Bitcoin and Ethereum.

## Canonical categories

The proposal introduces a **registry-only** canonical category enum
(`tools/registry/lib/v2Categories.mjs`) that extends — but does not change — the
legacy runtime `TokenCategory`. The 9 legacy V1 categories are a strict subset,
so every V1 entry maps into the canonical set with no category change.
`category` (what the asset does) and `assetClass` (native / token / stablecoin /
meme / …) are independent concepts.

## Reproduce & validate

```
# One-time provider capture (live network; re-run only to refresh ranks):
node tools/registry/fetch-v2-snapshot.mjs

# Deterministic, offline build + validation:
npm run registry:v2:build      # regenerate all artifacts from frozen inputs
npm run registry:v2:validate   # validate the proposal contract
npm run registry:v2:selftest   # negative self-tests for the V2 constraints
```

The build is deterministic: running it twice from the same frozen capture and
`data/v2-metadata.mjs` produces byte-identical artifacts and an identical
`catalogVersion` / `contentHash`. To change the selection, edit
`data/v2-selection-input.mjs`, re-run `node tools/registry/gen-v2-metadata.mjs`,
then rebuild.
