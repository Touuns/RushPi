# Immutable approval records

Committed, machine-readable, **non-runtime, IMMUTABLE** approval records -
one file per `(tokenId, logoVersion)`:

```
tools/logos/approvals/<tokenId>-v<logoVersion>.json
```

An approval record freezes the **complete** approved decision for one
logoVersion the moment `npm run logos:freeze-approval -- --token <tokenId>`
succeeds: identity, provenance (source URL, page, permitted variant, crop
mode, expected MIME class), the exact approved source SHA-256, and the
approval/permission decision itself - each field carried at the time of
freezing, plus `approvalRecordContentHash` (SHA-256 over the canonical
serialization of every other field).

**This is the frozen source of truth** every downstream step is bound to -
never the live, mutable `tools/logos/data/*-source-plan.json` entry directly.
A source-plan entry can be freely edited afterward (e.g. to prepare
`logoVersion` 2) without ever altering a previously frozen record: normalizing
`logoVersion` 1 always re-verifies the *current* plan entry still matches its
*frozen* record field-for-field, and refuses to proceed on any drift.

A record must never be handwritten - it is refused overwrite with different
content (immutability), and re-writing identical content is an idempotent
no-op.

**This directory is currently empty.** Zero token sources are approved yet
(see `tools/logos/data/pilot-source-plan.json`), so zero approval records
exist. This is the expected, valid pre-pilot state.

An approval record intentionally never enters the frontend or the public
logo-release manifest (`lib/release-manifest.mjs`
`FORBIDDEN_PUBLIC_FIELDS` includes `approvalRecordContentHash`). Every
processing receipt (`tools/logos/receipts/`) carries the frozen record's
`approvalRecordContentHash` and is rejected by the release builder if that
hash doesn't match, or if no approval record exists at all for its
`(tokenId, logoVersion)`.
