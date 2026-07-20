# Canonical token registry tools (Phase 12C-1A)

Foundation only — does not change Daily selection, Supabase, or deployment.

- `build-v1.mjs` — regenerates `registry/tokens/v1/{registry,logo-manifest,legacy-id-map}.json`
  from `api/_lib/tokenCatalog.ts` + `data/v1-metadata.mjs`. Deterministic: no
  current time, no randomness, no network access. Run twice to confirm
  byte-identical output.
- `validate.mjs` — fails on duplicate tokenId/slug/CoinGecko id, missing
  required fields, unknown enum values, an invalid "ready" logo, a logo
  manifest entry with no matching registry tokenId, an unapproved active
  wrapped/bridged entry, invalid aliases, or a mismatched entry
  count/content hash/catalogVersion.
- `parity.mjs` — compares the frozen V1 artifact against the current
  production 36-token catalog (same CoinGecko IDs, symbols, categories,
  Daily eligibility) so it cannot silently drift before the legacy challenge
  handler lands in 12C-2.

Logo policy (enforced later, documented now — see
`api/_lib/tokenRegistry/logoManifest.ts`): authorized/provider assets only,
never AI-generated, rasterized before delivery when sourced as SVG,
normalized to transparent 64px/128px, content-hashed and immutable once
ready. No logo retrieval happens in this phase.

```
node tools/registry/build-v1.mjs
node tools/registry/validate.mjs
node tools/registry/parity.mjs
```
