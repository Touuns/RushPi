# Canonical token registry tools (Phase 12C-1A, hardened in 12C-1A.1)

Foundation only — does not change Daily selection, Supabase, or deployment.

## Field categories

- **Production parity fields** — proven byte-for-byte equal to
  `api/_lib/tokenCatalog.ts` for all 36 V1 entries: CoinGecko ID
  (`providerIds.coingecko`), `symbol`, `category`, Daily eligibility
  (`eligibilityTier !== "excluded"`), and entry presence/count. Checked by
  `parity.mjs`.
- **Curated canonical metadata** — `name`, `slug`, `tokenId`,
  `eligibilityTier`, `assetClass`. Authored fresh for this registry; the
  legacy catalog has no equivalent field to compare against, so these are
  **not** production-parity claims. Sanity-checked (non-empty, trimmed, not
  equal to the CoinGecko ID or tokenId) by `lib/validateEntries.mjs`.
- **Registry logo metadata** (`CanonicalTokenEntry.logo`, `TokenLogoAsset` in
  `api/_lib/tokenRegistry/types.ts`) — a lightweight per-entry summary
  (status/version/contentHash/url64/url128/source). All 36 V1 entries are
  `pending`.
- **Ingestion manifest state** (`registry/tokens/v1/logo-manifest.json`,
  `LogoManifestEntry` in `api/_lib/tokenRegistry/logoManifest.ts`) — a
  separate, richer contract tracking the full future ingestion pipeline
  (sourceType/sourceReference/sourceMimeType/requiresRasterization/
  rejectionReason). **No logo has been retrieved, converted or authorized in
  any phase** — every V1 manifest entry is `pending` with every
  ingestion-specific field null and `sourceType: "authorized-provider"` used
  purely as a placeholder *planned* category.

## Scripts

- `build-v1.mjs` — regenerates `registry/tokens/v1/{registry,logo-manifest,legacy-id-map}.json`
  from `api/_lib/tokenCatalog.ts` + `data/v1-metadata.mjs`. Deterministic: no
  current time, no randomness, no network access, entries hashed in
  tokenId order regardless of input order. Run twice to confirm
  byte-identical output.
- `validate.mjs` — runs `lib/validateEntries.mjs` + `lib/validateManifest.mjs`
  against the committed artifacts. Fails on: duplicate tokenId/slug/CoinGecko
  id, missing required fields, unknown enum values, tokenId format
  (`^rpt-[0-9]{4}$`) or identity collision with any symbol/slug/provider
  ID/alias, invalid aliases/networks, an invalid "ready" logo, a logo
  manifest entry with no matching registry tokenId (or vice versa),
  duplicate manifest tokenId, mismatched manifest/registry entry count,
  unknown logo status/source type, `normalizedSizes` other than exactly
  `[64, 128]`, pending/ready/rejected state violations, an unapproved active
  wrapped/bridged entry, or a mismatched entry count/content hash/catalogVersion.
- `parity.mjs` — V1 PARITY CHECK, scoped to the production-parity fields
  listed above only (see the comment at the top of the file for the exact
  claim).
- `selftest.mjs` — in-memory negative fixtures proving the validators reject
  each violation class (never touches the committed artifacts).

Logo policy (enforced later, documented now): authorized/provider assets
only, never AI-generated, rasterized before delivery when sourced as SVG
(only once the source format is known — never defaults to true), normalized
to transparent 64px/128px, content-hashed and immutable once ready.

```
node tools/registry/build-v1.mjs
node tools/registry/validate.mjs
node tools/registry/parity.mjs
node tools/registry/selftest.mjs
```
