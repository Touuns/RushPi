# Token logo ingestion tooling (Phase 12C-1B2B)

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
| B. Source-plan / audit manifest | `tools/logos/data/*-source-plan.json` | **No** - admin/non-client. Never imported by runtime or copied into the frontend bundle. Contains provenance (source URL, page, approval identity) but no API credentials or personal email addresses (approvals use a role/identifier, e.g. `"product-owner"`). |
| C. Public logo-release manifest | built by `logos:manifest` (not committed in this phase - nothing has been approved yet) | **Yes** - machine-generated, contains only `schemaVersion`, `logoReleaseVersion`, `normalizationPolicyVersion`, `catalogVersion`, and per-entry `tokenId`/`logoVersion`/output paths+hashes+MIME types. Never a source URL, approval identity, permission notes or intake path (enforced by `lib/release-manifest.mjs` `FORBIDDEN_PUBLIC_FIELDS` + `validateReleaseManifest`). |

## Source-plan fields (layer B)

`tokenId, catalogVersion, providerId, canonicalName, symbol,
sourceReviewStatus, permissionReviewStatus, sourceType, sourceReference,
sourcePageReference, permittedVariant, variantType, cropMode,
expectedMimeClass, approvedBy, approvedAt, permissionEvidenceReference,
providerFallbackApproved, notes, intakePath, expectedLogoVersion`.

Plus documented pilot-only metadata (`pilotInclusionReason`,
`expectedSourceClass`, `anticipatedRisk`, `humanApprovalRequired`) and one
extra optional field beyond the phase brief's literal list:
**`allowExtremeAspectRatio`** (boolean, default false) - the brief requires
"reject extreme aspect ratios unless source plan explicitly permits them" but
does not name a field for that permission, so this one was added and is
validated/tested like any other field.

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
npm run logos:inspect  -- --token <tokenId> --file <relative-intake-path>
npm run logos:normalize -- --token <tokenId> --file <relative-intake-path> [--logo-version N]
npm run logos:verify          # verify committed outputs (safe on an empty/absent tree)
npm run logos:manifest        # build the public release manifest from committed outputs
npm run logos:selftest        # full self-test suite (temp dirs only, no repo file writes)
```

No command performs an HTTP download. `logos:inspect`/`logos:normalize` only
read a file already placed locally under `tools/logos/intake/` (gitignored,
excluded from git tracking) by a separate, later, approved task - and both
refuse to run at all unless the named token's source-plan entry is fully
approved.

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
- the intake destination (a path under `tools/logos/intake/`);
- the exact commands to run (`logos:inspect` then `logos:normalize`, with
  `--token`/`--file`);
- the expected output directories (`public/assets/rushpi/token-logos/<tokenId>/v<logoVersion>/{64,128}/`);
- the evidence/hashes Codex must report back (source SHA-256, dimensions,
  output hashes, toolchain fingerprint from the printed report);
- explicit stop conditions.

Codex must **stop and report instead of deciding autonomously** when: the
source is unavailable; a redirect reaches an unapproved domain; downloaded
bytes differ from the reviewed candidate; the sniffed MIME is unexpected;
multiple official variants exist; a rebrand/trademark ambiguity exists;
permission is unclear; any security validation fails; the source has a
coloured background only; or output/hash verification fails. This contract is
documented here for the next phase; no Codex execution prompt exists yet and
no per-token record has been issued.
