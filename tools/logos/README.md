# Token logo ingestion tooling (Phase 12C-1B2B, hardened in 12C-1B2B.1)

Secure, deterministic tooling for sourcing, validating, normalizing and
publishing the 250 canonical V2 token logos. **This phase implements tooling
only** - it retrieves, generates, redraws or publishes no real token logo.
`public/assets/rushpi/token-logos/` and `tools/logos/intake/` are empty.

## Architecture decisions

### 1. Token catalog and logo release are separate

The approved V2 catalog (`registry/tokens/v2-proposal/registry.json`,
`catalogVersion: token-registry-v2-7b98c60e767128c1`) is never modified by
this tooling. Logos are versioned independently via a content-derived
`logoReleaseVersion` (see `lib/release-manifest.mjs`) that changes only when
the *set of published logo outputs* changes. A logo source, logo version or
`normalizationPolicyVersion` change can never change `catalogVersion`, Daily
selection, the challenge seed, token eligibility or scoring - nothing in this
directory touches those systems.

### 2. Storage

First production version: repository-hosted static assets under
`public/assets/rushpi/token-logos/`. No Supabase Storage bucket is created or
configured by this phase.

### 3. Output format

Transparent PNG only, at 64x64 and 128x128. No WebP output.

### 4. Approval

Every processed source requires human approval - there is no "low risk, no
approval needed" path. Processing (`logos:inspect` / `logos:normalize`) is
permitted only when, on the source-plan entry:

- `sourceReviewStatus = "source-approved"`, **and**
- `permissionReviewStatus` is `"permission-confirmed"` or
  `"explicit-product-exception"`.

`lib/process-gate.mjs` enforces this before any file is even read; a source
URL alone is never sufficient (`lib/validate-source-plan.mjs` requires the
full set of approval + permission + variant/crop/MIME-class fields together).

### 4a. Approval is bound to an exact file and an exact byte hash (12C-1B2B.1)

Neither CLI accepts a `--file` argument. The file processed is **always and
only** `entry.intakePath` - resolved, existence-checked, and required to be a
real regular file that is **not itself a symlink** (regardless of what it
points at), inside `tools/logos/intake/` (`lib/path-safety.mjs`
`assertRegularNonSymlinkFile` + `lib/inspect-source.mjs`
`readApprovedIntakeFile`). A `source-approved` entry must carry a non-null,
safe `intakePath`; an unapproved template entry keeps it `null`.

Every approved entry must also carry `approvedSourceContentHash` - the exact
lowercase SHA-256 of the bytes a human reviewed and approved. Before any
rasterization or normalization, the tooling recomputes the intake file's
SHA-256 and stops with `source-hash-mismatch` if it differs
(`lib/inspect-source.mjs` `inspectApprovedIntake`). The two-stage workflow
this enables:

- **A.** A Codex *candidate-research* task may retrieve a candidate into
  local intake and report its hash - it cannot normalize or publish it.
- **B.** A human approves the exact candidate; its hash is written into
  `approvedSourceContentHash` in the source plan.
- **C.** A Codex *processing* task (`logos:normalize`) operates only when the
  local bytes still match that approved hash.

A diagnostic in-memory override (`fileBufferOverride`) exists **only** as an
internal parameter on `lib/inspect-source.mjs`'s `inspectApprovedIntake` and
`lib/normalize-pipeline.mjs`'s `normalizeApprovedToken` - used exclusively by
`selftest.mjs`. It is never reachable from any CLI flag.

`expectedLogoVersion` works the same way: neither CLI accepts a
`--logo-version` argument. A `source-approved` entry must carry a positive
integer `expectedLogoVersion`, and the normalizer uses exactly that value -
never overridable. Changing source, variant or normalization policy requires
an explicitly approved *new* `expectedLogoVersion`; writing to an
already-published version with different bytes is rejected
(`lib/output-paths.mjs` `assertNoVersionConflict`) unless the bytes are
byte-identical (idempotent no-op).

### 5. Provider fallback

`sourceType = "authorized-provider"` is schema-supported but processing fails
unless `providerFallbackApproved = true` **and** `approvedBy`, `approvedAt`,
`permissionEvidenceReference` and explanatory `notes` are all present. **No
CoinGecko source URL or image has been added anywhere in this phase** -
CoinGecko imagery is not pre-approved.

## Manifest layers

| Layer | Location | Client-safe? |
| --- | --- | --- |
| A. Canonical token registry | `registry/tokens/v2-proposal/registry.json` | n/a (existing, untouched) |
| B. Source-plan / audit manifest | `tools/logos/data/*-source-plan.json` | **No** - admin/non-client. Never imported by runtime or copied into the frontend bundle. Contains provenance (source URL, page, approval identity, `approvedSourceContentHash`) but no API credentials or personal email addresses (approvals use a role/identifier, e.g. `"product-owner"`). |
| B2. Processing receipts | `tools/logos/receipts/<tokenId>-v<logoVersion>.json` | **No** - committed, non-runtime, but not client-safe (carries `approvedSourceContentHash`/`actualSourceContentHash`/source dimensions). The **sole trust boundary** for the release-manifest builder - see below. |
| C. Public logo-release manifest | built by `logos:manifest` (not committed in this phase - zero receipts exist yet) | **Yes** - machine-generated, contains only `schemaVersion`, `logoReleaseVersion`, `normalizationPolicyVersion`, `catalogVersion`, and per-entry `tokenId`/`logoVersion`/output paths+hashes+MIME types. Never a source URL, approval identity, permission notes, intake path, or source-hash field (enforced by `lib/release-manifest.mjs` `FORBIDDEN_PUBLIC_FIELDS` + `validateReleaseManifest`). |

### Processing receipts (12C-1B2B.1)

A receipt (`lib/receipt.mjs`) is generated **only** after: complete
source-plan validation, the approval gate, an exact source-hash match,
security inspection, successful normalization, and output re-verification
(`lib/normalize-pipeline.mjs` `normalizeApprovedToken`). It is deterministic
except for the embedded toolchain fingerprint, and contains no current time.
A receipt must never be handwritten - `verifyReceiptAgainstOutputs`
recomputes and verifies every receipt/output relationship from scratch
(registry membership, `catalogVersion`, `normalizationPolicyVersion`, the
exact immutable path convention, real file existence, recomputed SHA-256,
real dimensions/alpha/PNG format).

`logos:manifest` (`build-release-manifest.mjs`) trusts **only** verified
receipts - it never scans the output directory for entries. A token with
more than one verified receipted `logoVersion` requires an explicit entry in
`tools/logos/data/release-selection.json` naming the chosen version; the
highest version number is **never** auto-inferred, and an unresolved
ambiguity fails the build loudly rather than silently picking one.
`logos:verify` cross-checks the reverse direction too: any published output
file with no matching receipt is rejected as an **orphan**.

## Source-plan fields (layer B)

`tokenId, catalogVersion, providerId, canonicalName, symbol,
sourceReviewStatus, permissionReviewStatus, sourceType, sourceReference,
sourcePageReference, permittedVariant, variantType, cropMode,
expectedMimeClass, approvedBy, approvedAt, permissionEvidenceReference,
providerFallbackApproved, notes, intakePath, expectedLogoVersion,
approvedSourceContentHash`.

Plus documented pilot-only metadata (`pilotInclusionReason`,
`expectedSourceClass`, `anticipatedRisk`, `humanApprovalRequired`) and one
extra optional field beyond the phase brief's literal list:
**`allowExtremeAspectRatio`** (boolean, default false) - the brief requires
"reject extreme aspect ratios unless source plan explicitly permits them" but
does not name a field for that permission, so this one was added and is
validated/tested like any other field.

`approvedSourceContentHash` must be `null` until `sourceReviewStatus =
"source-approved"`, at which point it must be an exact lowercase sha256 hex
string (see "Approval is bound to an exact file and hash" above).
`expectedLogoVersion` must always be a positive integer when present, and is
required once approved.

`output64Path`, `output128Path`, `output64Hash`, `output128Hash`,
`sourceContentHash`, `sourceWidth`, `sourceHeight`, `sourceFileSize` and
`logoVersion` are **tooling-computed only** - `validate-source-plan` rejects a
plan that authors any of them manually.

### Source review states

`unresearched -> candidate-found -> identity-verified -> source-approved`, or
`-> source-rejected` / `-> needs-human-review` at any point.

### Permission review states

`unreviewed -> permission-confirmed | explicit-product-exception | rejected |
needs-legal-review`. An `explicit-product-exception` must still carry
`approvedBy`, `approvedAt`, `permissionEvidenceReference` and `notes`.

## Pilot plan

`data/pilot-source-plan.json` - 12 tokens (5 V1: BTC, ETH, USDT, LINK, SHIB;
7 new V2: HYPE, TON, TAO, TIA, FET, CC, GAS), covering native/application
assets, a stablecoin, a meme asset, two rebrand/migration identity cases (TON,
FET), simple and visually complex marks, and two deliberately difficult
identity/source cases (Canton, Gas). **Every entry is
`unresearched`/`unreviewed` with all references and approvals `null`** - this
is a template, not a plan; `logos:selftest` asserts this invariant so it
cannot silently drift.

## Security validation (`lib/mime.mjs`, `lib/scan-svg.mjs`, `lib/inspect-raster.mjs`)

Raster: magic-byte MIME sniff (PNG only accepted; JPEG/GIF/WebP/BMP/unknown
rejected with a precise reason), max 512 KiB, max 4096px per side, max
16,777,216 px total, malformed/truncated rejected, fully-transparent rejected,
aspect ratio > 3:1 rejected unless `allowExtremeAspectRatio`.

SVG: only when `expectedMimeClass` permits it; max 512 KiB; rejects DOCTYPE,
XML entities, `<script>`, any `on*` event-handler attribute, `foreignObject`,
SMIL/CSS animation, `@font-face`, any non-local (`#...`) `href`/`xlink:href`
or `url(...)` reference, embedded `data:` URLs, malformed XML. **The SVG is
never copied into public assets and never exposed to the browser** - an
approved SVG is rasterized locally with `@resvg/resvg-js`, and only the
rasterized pixels are processed further (`lib/inspect-source.mjs`).

## Normalization (`normalizationPolicyVersion = 1`, `lib/normalize.mjs`)

Permitted only: format decoding, SVG rasterization, transparent-canvas
trimming, proportional scaling, centring, transparent padding, deterministic
PNG encoding, metadata stripping. Never: rotation, recolouring, background
removal/keying, sharpening, contrast/saturation change, shape/text
modification.

`variantType` (`icon` | `full-mark`) and `cropMode` (`alpha-bounds` |
`preserve-canvas`) are **explicit source-plan fields, never inferred**.
`alpha-bounds` crops only fully-transparent outer pixels (never touches a
non-transparent pixel); `preserve-canvas` scales the complete source canvas,
whitespace included, into the target box. A source with only a coloured
background (no transparency) fails alpha-bounds inspection upstream and must
go to `needs-human-review` - backgrounds are never auto-removed.

Fixed rules: sRGB conversion before metadata strip, 8-bit RGBA PNG, max
visible-mark occupancy 88% of the canvas (>=6% padding per limiting side),
Lanczos3 downscale, fixed PNG encoder settings
(`compressionLevel:9, adaptiveFiltering:false, palette:false, effort:10`), no
embedded metadata (`withMetadata()` is never called, so sharp strips it by
default).

## Output paths (`lib/output-paths.mjs`)

```
public/assets/rushpi/token-logos/
  <tokenId>/
    v<logoVersion>/
      64/<output64Hash>.png
      128/<output128Hash>.png
```

Each size's hash is that **output** file's own SHA-256 (never the source
hash, never shared between the two sizes). `logoVersion` starts at 1 and
increments only for a newly approved visual source, a different approved
official variant, or a `normalizationPolicyVersion` bump. A
`(tokenId, logoVersion, size)` slot may hold exactly one content hash forever;
`assertNoVersionConflict` refuses to overwrite it with different bytes
(re-writing identical bytes is an idempotent no-op) - a real change must
increment `logoVersion` instead, so every old version stays addressable.

## Dependencies & toolchain

`sharp` (pixel inspection, alpha bounds, scaling, sRGB conversion, PNG
encoding) and `@resvg/resvg-js` (SVG rasterization only) are pinned exact
**devDependencies**, committed to `package-lock.json`. No ImageMagick, no
browser/client dependency added. Every generated report embeds a toolchain
fingerprint (`lib/report.mjs`): Node version, platform, arch, sharp version,
libvips version, resvg version, `normalizationPolicyVersion`.
Byte-identical repeat builds are required and tested *within* this pinned
toolchain (`logos:selftest`); cross-platform byte-identical output is **not**
promised until separately verified. Once a committed output is approved, its
bytes are authoritative and must never be silently regenerated by a different
platform/toolchain.

## Commands

```
npm run logos:validate-plan   # validate a source plan (default: data/pilot-source-plan.json)
npm run logos:inspect  -- --token <tokenId>
npm run logos:normalize -- --token <tokenId>
npm run logos:verify           # verify committed outputs + receipts (safe on an empty/absent tree)
npm run logos:manifest         # build the public release manifest EXCLUSIVELY from verified receipts
npm run logos:selftest         # full self-test suite (temp dirs only, no repo file writes)
```

No command performs an HTTP download. `logos:inspect`/`logos:normalize` take
**only** `--token` (plus optional `--plan`) - the file processed is always
exactly that token's `entry.intakePath`, and the version is always exactly
`entry.expectedLogoVersion`. Both refuse to run at all unless the named
token's source-plan entry is fully approved (`source-approved` +
permission-confirmed/exception) **and** its intake bytes match
`approvedSourceContentHash`.

## Local intake convention

`tools/logos/intake/` and `tools/logos/work/` are excluded via a local
`tools/logos/.gitignore` (the root `.gitignore` is untouched).
`lib/path-safety.mjs` rejects absolute paths, `..` traversal, drive-letter/UNC
paths, and symlink escape for every path resolved against `intake/`.

## Codex handoff contract (documented only - not executed)

Codex will later receive **one record per already-approved token**, each
containing:

- `tokenId`, `catalogVersion`, `providerId`, `canonicalName`, `symbol`;
- the approved source URL and the approved source page URL;
- the approved variant description (`permittedVariant`, `variantType`,
  `cropMode`);
- `sourceType`, `expectedMimeClass`;
- the intake destination (the exact `entry.intakePath` under
  `tools/logos/intake/` the approval is bound to) and `expectedLogoVersion`;
- **the two-stage split**: a candidate-research record (place file, report
  its SHA-256 - no normalization/publication permission) versus a processing
  record (issued only after a human has written that exact hash into
  `approvedSourceContentHash`);
- the exact commands to run (`logos:inspect` then `logos:normalize`, with
  only `--token` - neither takes a file or version argument);
- the expected output directories (`public/assets/rushpi/token-logos/<tokenId>/v<logoVersion>/{64,128}/`)
  and the expected receipt path (`tools/logos/receipts/<tokenId>-v<logoVersion>.json`);
- the evidence/hashes Codex must report back (source SHA-256, dimensions,
  output hashes, toolchain fingerprint - all present in the generated receipt
  and the CLI's printed report);
- explicit stop conditions.

Codex must **stop and report instead of deciding autonomously** when: the
source is unavailable; a redirect reaches an unapproved domain; downloaded
bytes differ from the reviewed candidate; the sniffed MIME is unexpected;
multiple official variants exist; a rebrand/trademark ambiguity exists;
permission is unclear; any security validation fails; the source has a
coloured background only; or output/hash verification fails. This contract is
documented here for the next phase; no Codex execution prompt exists yet and
no per-token record has been issued.
