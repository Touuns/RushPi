#!/usr/bin/env node
// In-memory / temp-directory self-tests for the token-logo ingestion tooling
// (Phase 12C-1B2B). Never touches tools/logos/intake, public/assets or the
// real registry/tokens data - all filesystem-touching tests use a fresh
// os.tmpdir() subdirectory, removed on exit. No real token logo is ever
// generated, downloaded or committed; every image fixture is an abstract
// synthetic shape (see fixtures/generate.mjs).
import { readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { loadV2Registry } from "./lib/registry.mjs";
import { validateSourcePlan } from "./lib/validate-source-plan.mjs";
import { assertProcessable, ProcessingNotPermittedError } from "./lib/process-gate.mjs";
import { resolveSafePath, UnsafePathError } from "./lib/path-safety.mjs";
import { sniffMime } from "./lib/mime.mjs";
import { scanSvgText } from "./lib/scan-svg.mjs";
import { inspectRasterBuffer, RasterRejectedError } from "./lib/inspect-raster.mjs";
import { inspectSource, SourceRejectedError } from "./lib/inspect-source.mjs";
import { normalizeToOutputs, rasterizeSvg, NormalizationError } from "./lib/normalize.mjs";
import { sha256Hex } from "./lib/hashes.mjs";
import { writeOutputAtomically, assertNoVersionConflict, outputPathFor, OutputConflictError } from "./lib/output-paths.mjs";
import { buildReleaseManifest, validateReleaseManifest, FORBIDDEN_PUBLIC_FIELDS } from "./lib/release-manifest.mjs";
import * as fx from "./fixtures/generate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let failures = 0;
let passed = 0;
function check(name, condition) {
  if (condition) {
    passed += 1;
  } else {
    failures += 1;
    console.error(` FAIL: ${name}`);
  }
}
async function checkAsync(name, fn) {
  try {
    check(name, await fn());
  } catch (e) {
    failures += 1;
    console.error(` FAIL (threw): ${name}: ${e.message}`);
  }
}
async function checkRejects(name, fn, matchErrorClassOrReason) {
  try {
    await fn();
    failures += 1;
    console.error(` FAIL (did not reject): ${name}`);
  } catch (e) {
    const ok = typeof matchErrorClassOrReason === "function"
      ? e instanceof matchErrorClassOrReason
      : e.reason === matchErrorClassOrReason || e.message.includes(matchErrorClassOrReason);
    check(name, ok);
    if (!ok) console.error(`   (got: ${e.name ?? e.constructor.name} ${e.reason ?? e.message})`);
  }
}

const registry = loadV2Registry(repoRoot);

function baseEntry(overrides = {}) {
  return {
    tokenId: "rpt-0001",
    catalogVersion: registry.catalogVersion,
    providerId: "bitcoin",
    canonicalName: "Bitcoin",
    symbol: "BTC",
    sourceReviewStatus: "unresearched",
    permissionReviewStatus: "unreviewed",
    sourceType: null,
    sourceReference: null,
    sourcePageReference: null,
    permittedVariant: null,
    variantType: null,
    cropMode: null,
    expectedMimeClass: null,
    approvedBy: null,
    approvedAt: null,
    permissionEvidenceReference: null,
    providerFallbackApproved: false,
    notes: "",
    intakePath: null,
    expectedLogoVersion: 1,
    ...overrides,
  };
}

function approvedEntry(overrides = {}) {
  return baseEntry({
    sourceReviewStatus: "source-approved",
    permissionReviewStatus: "permission-confirmed",
    sourceType: "official-brand-kit",
    sourceReference: "https://example.invalid/brand/mark.svg",
    sourcePageReference: "https://example.invalid/brand",
    permittedVariant: "primary mark",
    variantType: "icon",
    cropMode: "alpha-bounds",
    expectedMimeClass: "image/png",
    approvedBy: "product-owner",
    approvedAt: "2026-01-01T00:00:00Z",
    notes: "pilot fixture",
    ...overrides,
  });
}

async function main() {
  const tmpRoot = mkdtempSync(path.join(tmpdir(), "rushpi-logo-selftest-"));
  const intakeRoot = path.join(tmpRoot, "intake");
  const outputRoot = path.join(tmpRoot, "output");
  mkdirSync(intakeRoot, { recursive: true });
  mkdirSync(outputRoot, { recursive: true });

  try {
    // ---------------------------------------------------------------
    // 1. valid PNG / valid SVG accepted
    // ---------------------------------------------------------------
    {
      const png = await fx.validPngMark();
      const info = await inspectRasterBuffer(png);
      check("valid transparent PNG accepted", info.width === 200 && info.height === 200 && info.hasAlpha);

      const scan = scanSvgText(fx.validSimpleSvg);
      check("valid simple SVG accepted by scanner", scan.ok);
      const raster = rasterizeSvg(fx.validSimpleSvg);
      const svgInfo = await inspectRasterBuffer(raster);
      check("valid simple SVG rasterizes to inspectable raster", svgInfo.width > 0 && svgInfo.height > 0);
    }

    // ---------------------------------------------------------------
    // 2-9. malicious SVG constructs rejected
    // ---------------------------------------------------------------
    check("SVG script rejected", !scanSvgText(fx.svgWithScript).ok && scanSvgText(fx.svgWithScript).reasons.includes("script-tag"));
    check("SVG event handler rejected", !scanSvgText(fx.svgWithEventHandler).ok && scanSvgText(fx.svgWithEventHandler).reasons.includes("event-handler-attribute"));
    check("SVG external href rejected", !scanSvgText(fx.svgWithExternalHref).ok && scanSvgText(fx.svgWithExternalHref).reasons.includes("external-href-reference"));
    check("SVG data URL rejected", !scanSvgText(fx.svgWithDataUrl).ok && scanSvgText(fx.svgWithDataUrl).reasons.includes("embedded-data-url"));
    check("SVG foreignObject rejected", !scanSvgText(fx.svgWithForeignObject).ok && scanSvgText(fx.svgWithForeignObject).reasons.includes("foreign-object"));
    check("SVG animation rejected", !scanSvgText(fx.svgWithAnimation).ok && scanSvgText(fx.svgWithAnimation).reasons.includes("animation-element"));
    check("SVG entity/DOCTYPE rejected", !scanSvgText(fx.svgWithEntityDoctype).ok && scanSvgText(fx.svgWithEntityDoctype).reasons.includes("xml-entity"));
    check("SVG remote font rejected", !scanSvgText(fx.svgWithRemoteFont).ok && scanSvgText(fx.svgWithRemoteFont).reasons.includes("remote-font"));
    check("malformed SVG rejected", !scanSvgText(fx.malformedSvg).ok);
    check("oversized SVG rejected", !scanSvgText(fx.oversizedSvg).ok);

    // ---------------------------------------------------------------
    // 10-15. raster security limits
    // ---------------------------------------------------------------
    await checkRejects("oversized file (bytes) rejected", async () => {
      const buf = await fx.oversizedBytesPng();
      const entry = approvedEntry({ expectedMimeClass: "image/png" });
      await inspectSource(buf, entry);
    }, "raster-exceeds-max-bytes");

    await checkRejects("excessive dimensions rejected", async () => {
      await inspectRasterBuffer(await fx.oversizedDimensionsPng());
    }, RasterRejectedError);

    await checkRejects("wrong MIME (JPEG bytes, expected PNG) rejected", async () => {
      const entry = approvedEntry({ expectedMimeClass: "image/png" });
      await inspectSource(fx.wrongMimeJpegLike(), entry);
    }, "mime-mismatch");

    check("MIME sniff identifies JPEG-like bytes correctly (not PNG)", sniffMime(fx.wrongMimeJpegLike()) === "image/jpeg");

    await checkRejects("truncated PNG rejected", async () => {
      await inspectRasterBuffer(fx.truncatedPng());
    }, RasterRejectedError);

    await checkRejects("empty transparent image rejected", async () => {
      await inspectRasterBuffer(await fx.emptyTransparentPng());
    }, "raster-empty-transparent");

    await checkRejects("extreme aspect ratio rejected by default", async () => {
      await inspectRasterBuffer(await fx.extremeAspectRatioPng());
    }, "raster-extreme-aspect-ratio");

    await checkAsync("extreme aspect ratio allowed when source plan permits it", async () => {
      const info = await inspectRasterBuffer(await fx.extremeAspectRatioPng(), { allowExtremeAspectRatio: true });
      return info.width === 1200 && info.height === 40;
    });

    // ---------------------------------------------------------------
    // 16-17. explicit cropMode behaviour (preserve-canvas vs alpha-bounds)
    // ---------------------------------------------------------------
    await checkAsync("alpha-bounds crops padding more aggressively than preserve-canvas", async () => {
      const src = await fx.validPngMark({ canvas: 200, markSize: 60 });
      const alphaBounds = await normalizeToOutputs(src, "alpha-bounds");
      const preserveCanvas = await normalizeToOutputs(src, "preserve-canvas");
      const areaOf = async (buf) => {
        const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let count = 0;
        for (let i = 3; i < data.length; i += info.channels) if (data[i] !== 0) count += 1;
        return count;
      };
      const areaAlpha = await areaOf(alphaBounds.buf64);
      const areaPreserve = await areaOf(preserveCanvas.buf64);
      return areaAlpha > areaPreserve;
    });

    // ---------------------------------------------------------------
    // 18-20. approval / permission / provider-fallback gating
    // ---------------------------------------------------------------
    {
      const errs = validateSourcePlan([baseEntry({ sourceReviewStatus: "source-approved" })], registry);
      check("missing approval fields rejected", errs.some((e) => /requires approvedBy/.test(e)));
    }
    {
      const errs = validateSourcePlan(
        [approvedEntry({ permissionReviewStatus: "unreviewed" })],
        registry,
      );
      check("missing/insufficient permission review rejected", errs.some((e) => /permissionReviewStatus to be permission-confirmed/.test(e)));
    }
    {
      const errs = validateSourcePlan([baseEntry({ sourceType: "authorized-provider" })], registry);
      check(
        "provider fallback without authorization rejected",
        errs.some((e) => /providerFallbackApproved=true/.test(e)) &&
          errs.some((e) => /requires approvedBy/.test(e)) &&
          errs.some((e) => /requires permissionEvidenceReference/.test(e)),
      );
    }
    {
      try {
        assertProcessable(baseEntry());
        check("process-gate blocks unresearched entry", false);
      } catch (e) {
        check("process-gate blocks unresearched entry", e instanceof ProcessingNotPermittedError);
      }
      try {
        assertProcessable(approvedEntry({ permissionReviewStatus: "needs-legal-review" }));
        check("process-gate blocks approved-but-permission-pending entry", false);
      } catch (e) {
        check("process-gate blocks approved-but-permission-pending entry", e instanceof ProcessingNotPermittedError);
      }
      // A fully approved + permission-confirmed entry must pass the gate.
      let gatePassed = true;
      try {
        assertProcessable(approvedEntry());
      } catch {
        gatePassed = false;
      }
      check("process-gate allows fully approved + permission-confirmed entry", gatePassed);
    }

    // ---------------------------------------------------------------
    // 21. path traversal
    // ---------------------------------------------------------------
    {
      let rejected = false;
      try {
        resolveSafePath(intakeRoot, "../../etc/passwd");
      } catch (e) {
        rejected = e instanceof UnsafePathError;
      }
      check("path traversal rejected", rejected);
    }

    // ---------------------------------------------------------------
    // 22-24. source-plan structural validation
    // ---------------------------------------------------------------
    check("orphan tokenId rejected", validateSourcePlan([baseEntry({ tokenId: "rpt-9999" })], registry).some((e) => /absent from the approved V2 registry/.test(e)));
    check(
      "duplicate source-plan tokenId rejected",
      validateSourcePlan([baseEntry(), baseEntry()], registry).some((e) => /duplicate tokenId/.test(e)),
    );
    check(
      "wrong catalogVersion rejected",
      validateSourcePlan([baseEntry({ catalogVersion: "token-registry-v2-deadbeefdeadbeef" })], registry).some((e) => /catalogVersion/.test(e)),
    );
    check(
      "manually authored output path field rejected",
      validateSourcePlan([{ ...baseEntry(), output64Path: "x" }], registry).some((e) => /must never be authored manually/.test(e)),
    );

    // ---------------------------------------------------------------
    // 25-28. normalization determinism + output shape
    // ---------------------------------------------------------------
    {
      const src = await fx.validPngMark();
      const runA = await normalizeToOutputs(src, "alpha-bounds");
      const runB = await normalizeToOutputs(src, "alpha-bounds");
      check("repeat normalization produces byte-identical 64px PNG", sha256Hex(runA.buf64) === sha256Hex(runB.buf64));
      check("repeat normalization produces byte-identical 128px PNG", sha256Hex(runA.buf128) === sha256Hex(runB.buf128));

      const meta64 = await sharp(runA.buf64).metadata();
      const meta128 = await sharp(runA.buf128).metadata();
      check("output 64 has exact dimensions 64x64", meta64.width === 64 && meta64.height === 64);
      check("output 128 has exact dimensions 128x128", meta128.width === 128 && meta128.height === 128);
      check("output 64 contains alpha channel", meta64.hasAlpha === true);
      check("output 128 contains alpha channel", meta128.hasAlpha === true);
      check("output 64 has no embedded metadata", meta64.exif === undefined && meta64.icc === undefined);
      check("output 128 has no embedded metadata", meta128.exif === undefined && meta128.icc === undefined);
    }

    // ---------------------------------------------------------------
    // 29-31. output path hashing, overwrite prevention, stale-version conflict
    // ---------------------------------------------------------------
    {
      const src = await fx.validPngMark({ color: { r: 10, g: 200, b: 60 } });
      const { buf64 } = await normalizeToOutputs(src, "alpha-bounds");
      const hash = sha256Hex(buf64);
      const written = writeOutputAtomically(outputRoot, "rpt-0001", 1, 64, hash, buf64);
      check("output path hash matches written bytes", path.basename(written) === `${hash}.png` && sha256Hex(readFileSync(written)) === hash);

      // Idempotent re-write of the identical bytes must succeed silently.
      let idempotentOk = true;
      try {
        writeOutputAtomically(outputRoot, "rpt-0001", 1, 64, hash, buf64);
      } catch {
        idempotentOk = false;
      }
      check("re-writing identical output bytes is idempotent (no conflict)", idempotentOk);

      // A different hash at the same (tokenId, version, size) slot must be rejected.
      let conflictRejected = false;
      try {
        assertNoVersionConflict(outputRoot, "rpt-0001", 1, 64, "0000000000000000000000000000000000000000000000000000000000000000");
      } catch (e) {
        conflictRejected = e instanceof OutputConflictError;
      }
      check("stale logoVersion / existing output overwrite attempt rejected", conflictRejected);

      // Bumping the version is unaffected by the existing v1 content.
      let versionBumpOk = true;
      try {
        assertNoVersionConflict(outputRoot, "rpt-0001", 2, 64, "1111111111111111111111111111111111111111111111111111111111111111");
      } catch {
        versionBumpOk = false;
      }
      check("bumping logoVersion resolves a conflict", versionBumpOk);

      check("outputPathFor produces the documented immutable layout", outputPathFor(outputRoot, "rpt-0001", 1, 64, hash) === path.join(outputRoot, "rpt-0001", "v1", "64", `${hash}.png`));
    }

    // ---------------------------------------------------------------
    // 32. public release manifest contains no private/admin fields
    // ---------------------------------------------------------------
    {
      const cleanManifest = buildReleaseManifest({
        catalogVersion: registry.catalogVersion,
        entries: [{ tokenId: "rpt-0001", logoVersion: 1, output64Path: "a", output128Path: "b", output64Hash: "h1", output128Hash: "h2", output64MimeType: "image/png", output128MimeType: "image/png" }],
      });
      check("clean release manifest passes validation", validateReleaseManifest(cleanManifest).length === 0);

      const dirtyManifest = {
        ...cleanManifest,
        entries: [{ ...cleanManifest.entries[0], sourceReference: "https://leak.invalid", approvedBy: "someone" }],
      };
      const dirtyErrors = validateReleaseManifest(dirtyManifest);
      check(
        "release manifest with forbidden private fields is rejected",
        dirtyErrors.some((e) => e.includes("sourceReference")) && dirtyErrors.some((e) => e.includes("approvedBy")),
      );
      check("FORBIDDEN_PUBLIC_FIELDS covers approval identity and source references", FORBIDDEN_PUBLIC_FIELDS.includes("sourceReference") && FORBIDDEN_PUBLIC_FIELDS.includes("approvedBy") && FORBIDDEN_PUBLIC_FIELDS.includes("intakePath"));
    }

    // ---------------------------------------------------------------
    // 33. no runtime module imports the V2 registry or tools/logos data
    // ---------------------------------------------------------------
    {
      const offenders = [];
      const scanDirs = ["src", "api"];
      for (const dir of scanDirs) {
        walkTsFiles(path.join(repoRoot, dir), (filePath, contents) => {
          if (/v2-proposal/.test(contents) || /tools\/logos/.test(contents)) {
            offenders.push(path.relative(repoRoot, filePath));
          }
        });
      }
      check("no src/ or api/ module imports registry/tokens/v2-proposal or tools/logos data", offenders.length === 0);
      if (offenders.length > 0) console.error("   offenders:", offenders.join(", "));
    }

    // ---------------------------------------------------------------
    // End-to-end: full approved pipeline against a synthetic fixture, using
    // ONLY the temp intake/output roots created above.
    // ---------------------------------------------------------------
    await checkAsync("end-to-end pipeline succeeds for a fully approved synthetic fixture", async () => {
      const svgPath = path.join(intakeRoot, "synthetic-mark.svg");
      writeFileSync(svgPath, fx.validPaddedSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0002",
        providerId: "ethereum",
        canonicalName: "Ethereum",
        symbol: "ETH",
        expectedMimeClass: "image/svg+xml",
        cropMode: "preserve-canvas",
      });
      const buf = readFileSync(resolveSafePath(intakeRoot, "synthetic-mark.svg"));
      const inspected = await inspectSource(buf, entry);
      const { buf64, buf128 } = await normalizeToOutputs(inspected.rasterForNormalization, entry.cropMode);
      const h64 = sha256Hex(buf64);
      const h128 = sha256Hex(buf128);
      writeOutputAtomically(outputRoot, "rpt-0002", 1, 64, h64, buf64);
      writeOutputAtomically(outputRoot, "rpt-0002", 1, 128, h128, buf128);
      const meta = await sharp(buf128).metadata();
      return meta.width === 128 && meta.height === 128 && meta.hasAlpha;
    });

    // Sanity: the pilot template itself must remain fully unresearched and
    // internally valid (guards against accidental drift while iterating).
    {
      const pilotPath = path.join(here, "data", "pilot-source-plan.json");
      const pilot = JSON.parse(readFileSync(pilotPath, "utf8"));
      const errs = validateSourcePlan(pilot.entries, registry, { intakeRoot: path.join(here, "intake") });
      check("pilot-source-plan.json is internally valid", errs.length === 0);
      check("pilot-source-plan.json has exactly 12 entries", pilot.entries.length === 12);
      check(
        "pilot-source-plan.json entries are all unresearched/unreviewed with null references/approvals",
        pilot.entries.every(
          (e) =>
            e.sourceReviewStatus === "unresearched" &&
            e.permissionReviewStatus === "unreviewed" &&
            e.sourceReference === null &&
            e.sourcePageReference === null &&
            e.approvedBy === null &&
            e.approvedAt === null,
        ),
      );
      check("pilot-source-plan.json catalogVersion matches the approved registry", pilot.catalogVersion === registry.catalogVersion);
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log(`\n${passed} check(s) passed, ${failures} failed.`);
  if (failures > 0) {
    console.error("Logo tooling selftest FAILED.");
    process.exit(1);
  }
  console.log("Logo tooling selftest OK.");
}

function walkTsFiles(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, onFile);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      onFile(full, readFileSync(full, "utf8"));
    }
  }
}

main();
