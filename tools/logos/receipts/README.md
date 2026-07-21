# Verified processing receipts

Committed, machine-readable, **non-runtime** receipts - one file per
published `(tokenId, logoVersion)`:

```
tools/logos/receipts/<tokenId>-v<logoVersion>.json
```

A receipt is generated **only** after: complete source-plan validation, the
approval gate, an exact intake-file SHA-256 match against
`approvedSourceContentHash`, security inspection, successful deterministic
normalization, and output re-verification (`lib/normalize-pipeline.mjs`). A
receipt must never be handwritten - `lib/receipt.mjs` `verifyReceiptAgainstOutputs`
recomputes and verifies every receipt/output relationship from scratch
(registry membership, `catalogVersion`, `normalizationPolicyVersion`, the
exact immutable path convention, real file existence, recomputed SHA-256,
real dimensions/alpha/PNG format).

**This directory is currently empty.** Zero token sources are approved yet
(see `tools/logos/data/pilot-source-plan.json`), so zero receipts exist. This
is the expected, valid pre-pilot state - `logos:verify` and `logos:manifest`
both handle it gracefully (0 outputs / 0 receipts / `entries: []`).

A receipt intentionally contains **no** source URL, source page URL,
`approvedBy`, approval notes or intake path - see `lib/receipt.mjs`
`FORBIDDEN_RECEIPT_FIELDS`. `tools/logos/build-release-manifest.mjs` reads
**only** these receipts (never directory discovery) to build the public
release manifest.
