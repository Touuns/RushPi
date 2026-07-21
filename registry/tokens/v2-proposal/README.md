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
| `exclusions.json` | Every considered-but-excluded candidate with a controlled reason code, neutral explanation, and (where relevant) the underlying asset id / evidence reference. Displaced diversity substitutions carry `reasonCode: "diversity-substitution"` and point back at the retained `displacedForTokenId`. |
| `curation-report.json` | Provenance + counts: tiers, categories, assetClasses, exclusions by reason, the rank-based baseline accounting, the true diversity-substitution pairs, and the structured identity review of the uncertain entries. |

## Author-assigned token identities (12C-1B1.1)

Every entry in `tools/registry/data/v2-selection-input.mjs` carries an
**explicit, author-assigned `tokenId`**. `gen-v2-metadata.mjs` **copies**
`tokenId` and never allocates one from array position, so reordering or
inserting a selection can never renumber another asset (proven by
`registry:v2:selftest`). Adding an asset requires manually choosing an unused
`rpt-####` id — including one vacated by removing a proposal-only entry. The
retained `providerId → tokenId` mapping is preserved from the previous commit.

## Rank-based baseline and true diversity substitutions

The proposal is measured against a deterministic **rank-based baseline**
(`tools/registry/lib/v2Baseline.mjs`): preserve the 36 V1 assets, apply the
hard exclusions (wrapped/bridged, duplicate-underlying, leveraged/derivative,
unsupported asset forms, inactive/abandoned, missing-data, and
identity-not-sufficiently-verified), then fill the remaining slots with the
highest-ranked eligible assets to exactly 250.

The differences from that baseline are reported separately in
`curation-report.json → baseline`:

- **mandatoryV1OutsideNaturalCutoff** — V1 kept past the natural rank cutoff.
- **hardExclusionTailFills** — baseline members past rank 250 pulled in only
  because higher-ranked candidates were hard-excluded (not discretionary).
- **trueDiversitySubstitutions** — the ≤ 30 deliberate choices of a lower-ranked
  distinct-category asset over a higher-ranked eligible one. Each is an
  **explicit, human-curated 1:1 pair** authored in
  `tools/registry/data/v2-substitutions.mjs` — `selectedId` ↔ `displacedId`,
  a controlled `rationaleCode`, and a pair-specific explanation naming both
  sides. The displaced asset appears in `exclusions.json` with
  `reasonCode: "diversity-substitution"` and `displacedForTokenId` pointing at
  the retained selection.

  **Pairs are NOT rank-zipped (12C-1B1.2).** The build only *validates* the
  authored pairs against the computed baseline sets (selected must be a proposal
  entry outside the baseline; displaced a baseline member outside the proposal;
  `selectedRank > displacedRank`; strict bijection covering both sets). Semantic
  rules per `rationaleCode` are enforced by `lib/validateV2.mjs`:
  `stablecoin-overweight-avoidance` (displaced is a stablecoin, selected is not),
  `category-coverage` (selected category thinner than the displaced category),
  `redundant-subsector` (same broad category; the shared subsector is named),
  `identity-ambiguity-preference` (displaced identity ambiguous, selected
  verified). Four picks that could not be honestly paired under the fixed
  extra/displaced sets were swapped toward the baseline (out: `concordium`,
  `pharos-network`, `ontology`, `xyo-network`; in: `zama`, `lorenzo-protocol`,
  `proton`, `stronghold-token`), leaving the eligible universe unchanged and
  **26** honest substitutions.

## Uncertain-entry identity review

The ten highest-uncertainty included entries were verified against official
project sites/docs and official CoinGecko identity metadata (no blogs/socials,
no image URLs) — see `curation-report.json → uncertainEntries` and
`tools/registry/data/v2-uncertain-review.mjs`. All ten resolved to a confident
canonical identity; none required exclusion.

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
