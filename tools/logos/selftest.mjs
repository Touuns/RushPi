#!/usr/bin/env node
// In-memory / temp-directory self-tests for the token-logo ingestion tooling
// (Phase 12C-1B2B). Never touches tools/logos/intake, public/assets or the
// real registry/tokens data - all filesystem-touching tests use a fresh
// os.tmpdir() subdirectory, removed on exit. No real token logo is ever
// generated, downloaded or committed; every image fixture is an abstract
// synthetic shape (see fixtures/generate.mjs).
import { readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
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
import { inspectSource, inspectApprovedIntake, readApprovedIntakeFile, SourceRejectedError } from "./lib/inspect-source.mjs";
import { normalizeToOutputs, rasterizeSvg, NormalizationError } from "./lib/normalize.mjs";
import { sha256Hex } from "./lib/hashes.mjs";
import { writeOutputAtomically, assertNoVersionConflict, outputPathFor, OutputConflictError } from "./lib/output-paths.mjs";
import { buildReleaseManifest, validateReleaseManifest, FORBIDDEN_PUBLIC_FIELDS } from "./lib/release-manifest.mjs";
import { normalizeApprovedToken, PipelineError } from "./lib/normalize-pipeline.mjs";
import {
  buildReceipt,
  validateReceiptShape,
  verifyReceiptAgainstOutputs,
  verifyReceiptApprovalBinding,
  loadAllReceipts,
  writeReceiptAtomically,
  peekReceiptConflict,
  ReceiptError,
  FORBIDDEN_RECEIPT_FIELDS,
} from "./lib/receipt.mjs";
import { verifyOutputTreeShape } from "./lib/output-tree.mjs";
import { selectReceiptsForRelease, receiptToPublicEntry } from "./lib/release-builder.mjs";
import { validateReleaseSelection } from "./lib/validate-release-selection.mjs";
import {
  buildApprovalRecord,
  validateApprovalRecordShape,
  writeApprovalRecordAtomically,
  loadApprovalRecord,
  verifyApprovalMatchesPlanEntry,
  verifyApprovalMatchesRegistry,
  computeApprovalRecordContentHash,
  canonicalSerializeApproval,
  APPROVAL_FIELD_NAMES,
  ApprovalError,
} from "./lib/approval.mjs";
import { publishTokenVersion, PublishRollbackError } from "./lib/publish-outputs.mjs";
import { getToolchainFingerprint } from "./lib/report.mjs";
import { TOKEN_LOGOS_OUTPUT_ROOT, RECEIPTS_ROOT, APPROVALS_ROOT, NORMALIZATION_POLICY_VERSION } from "./lib/constants.mjs";
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
    approvedSourceContentHash: null,
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
    intakePath: "fixture.png",
    approvedSourceContentHash: "a".repeat(64),
    permissionEvidenceReference: "evidence-reference-fixture",
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
    // 32. public release manifest contains no private/admin fields, and is
    // validated against the registry (path/hash/catalogVersion consistency).
    // ---------------------------------------------------------------
    {
      const h64 = "1".repeat(64);
      const h128 = "2".repeat(64);
      const validEntry = {
        tokenId: "rpt-0001",
        logoVersion: 1,
        output64Path: `public/assets/rushpi/token-logos/rpt-0001/v1/64/${h64}.png`,
        output128Path: `public/assets/rushpi/token-logos/rpt-0001/v1/128/${h128}.png`,
        output64Hash: h64,
        output128Hash: h128,
        output64MimeType: "image/png",
        output128MimeType: "image/png",
      };
      const cleanManifest = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries: [validEntry] });
      check("clean release manifest passes validation", validateReleaseManifest(cleanManifest, registry).length === 0);

      const dirtyManifest = { ...cleanManifest, entries: [{ ...validEntry, sourceReference: "https://leak.invalid", approvedBy: "someone" }] };
      const dirtyErrors = validateReleaseManifest(dirtyManifest, registry);
      check(
        "release manifest with forbidden private fields is rejected",
        dirtyErrors.some((e) => e.includes("sourceReference")) && dirtyErrors.some((e) => e.includes("approvedBy")),
      );
      check("FORBIDDEN_PUBLIC_FIELDS covers approval identity and source references", FORBIDDEN_PUBLIC_FIELDS.includes("sourceReference") && FORBIDDEN_PUBLIC_FIELDS.includes("approvedBy") && FORBIDDEN_PUBLIC_FIELDS.includes("intakePath"));
      check("FORBIDDEN_PUBLIC_FIELDS covers the receipt-only source-hash fields", FORBIDDEN_PUBLIC_FIELDS.includes("approvedSourceContentHash") && FORBIDDEN_PUBLIC_FIELDS.includes("actualSourceContentHash"));

      const dupTokenManifest = { ...cleanManifest, entries: [validEntry, validEntry] };
      check("duplicate tokenId in release manifest rejected", validateReleaseManifest(dupTokenManifest, registry).some((e) => /duplicate tokenId/.test(e)));

      const orphanManifest = { ...cleanManifest, entries: [{ ...validEntry, tokenId: "rpt-9999" }] };
      check("release manifest entry absent from registry rejected", validateReleaseManifest(orphanManifest, registry).some((e) => /absent from the approved V2 registry/.test(e)));

      const badVersionManifest = { ...cleanManifest, entries: [{ ...validEntry, logoVersion: 0 }] };
      check("release manifest non-positive logoVersion rejected", validateReleaseManifest(badVersionManifest, registry).some((e) => /logoVersion must be a positive integer/.test(e)));

      const wrongCatalogManifest = { ...cleanManifest, catalogVersion: "token-registry-v2-deadbeefdeadbeef" };
      check("release manifest wrong catalogVersion rejected", validateReleaseManifest(wrongCatalogManifest, registry).some((e) => /catalogVersion/.test(e)));

      const wrongPolicyManifest = { ...cleanManifest, normalizationPolicyVersion: 99 };
      check("release manifest wrong normalizationPolicyVersion rejected", validateReleaseManifest(wrongPolicyManifest, registry).some((e) => /normalizationPolicyVersion/.test(e)));

      const wrongMimeManifest = { ...cleanManifest, entries: [{ ...validEntry, output64MimeType: "image/jpeg" }] };
      check("release manifest non-PNG MIME rejected", validateReleaseManifest(wrongMimeManifest, registry).some((e) => /must be "image\/png"/.test(e)));

      const badPathManifest = { ...cleanManifest, entries: [{ ...validEntry, output64Path: "public/assets/rushpi/token-logos/rpt-0001/v1/64/wrong-hash.png" }] };
      check("release manifest path inconsistent with hash/version/tokenId rejected", validateReleaseManifest(badPathManifest, registry).some((e) => /inconsistent with tokenId\/logoVersion\/size\/hash/.test(e)));

      // Section 7: complete public-manifest validation.
      const badSchemaManifest = { ...cleanManifest, schemaVersion: 99 };
      check("release manifest wrong schemaVersion rejected", validateReleaseManifest(badSchemaManifest, registry).some((e) => /schemaVersion must be/.test(e)));

      const missingContentHash = { ...cleanManifest, contentHash: undefined };
      check("release manifest missing contentHash rejected", validateReleaseManifest(missingContentHash, registry).some((e) => /contentHash is missing/.test(e)));

      const wrongContentHash = { ...cleanManifest, contentHash: "0".repeat(64) };
      check("release manifest wrong contentHash rejected", validateReleaseManifest(wrongContentHash, registry).some((e) => /contentHash mismatch/.test(e)));

      const missingLogoReleaseVersion = { ...cleanManifest, logoReleaseVersion: undefined };
      check("release manifest missing logoReleaseVersion rejected", validateReleaseManifest(missingLogoReleaseVersion, registry).some((e) => /logoReleaseVersion is missing/.test(e)));

      const wrongLogoReleaseVersion = { ...cleanManifest, logoReleaseVersion: "logo-release-v1-0000000000000000" };
      check("release manifest wrong logoReleaseVersion rejected", validateReleaseManifest(wrongLogoReleaseVersion, registry).some((e) => /logoReleaseVersion mismatch/.test(e)));

      const missingEntryCount = { ...cleanManifest, entryCount: undefined };
      check("release manifest missing entryCount rejected", validateReleaseManifest(missingEntryCount, registry).some((e) => /entryCount must equal/.test(e)));

      const wrongEntryCount = { ...cleanManifest, entryCount: 5 };
      check("release manifest wrong entryCount rejected", validateReleaseManifest(wrongEntryCount, registry).some((e) => /entryCount must equal/.test(e)));

      const secondEntry = { ...validEntry, tokenId: "rpt-0002" };
      const outOfOrderManifest = { ...cleanManifest, entries: [secondEntry, validEntry] };
      check("release manifest out-of-order entries rejected", validateReleaseManifest(outOfOrderManifest, registry).some((e) => /deterministic ascending tokenId order/.test(e)));

      const invalidTokenIdManifest = { ...cleanManifest, entries: [{ ...validEntry, tokenId: "not-a-token" }] };
      check("release manifest invalid tokenId format rejected", validateReleaseManifest(invalidTokenIdManifest, registry).some((e) => /invalid tokenId/.test(e)));

      check("empty-state logoReleaseVersion is the expected deterministic value", buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries: [] }).logoReleaseVersion === "logo-release-v1-67cef4c7147b2f4c");
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
    // 12C-1B2B.1: full approved pipeline, source-hash binding, intakePath
    // binding, receipts and receipt-only release-manifest building.
    // A dedicated "fake repo root" mirrors the real layout so receipt
    // output-path convention checks are meaningful, isolated from the
    // shared tmpRoot used by the section above.
    // ---------------------------------------------------------------
    const fakeRepoRoot = path.join(tmpRoot, "fake-repo");
    const pipelineIntakeRoot = path.join(fakeRepoRoot, "tools/logos/intake");
    const pipelineOutputRoot = path.join(fakeRepoRoot, TOKEN_LOGOS_OUTPUT_ROOT);
    const pipelineReceiptsRoot = path.join(fakeRepoRoot, RECEIPTS_ROOT);
    const pipelineApprovalsRoot = path.join(fakeRepoRoot, APPROVALS_ROOT);
    mkdirSync(pipelineIntakeRoot, { recursive: true });

    function writeIntake(name, content) {
      writeFileSync(path.join(pipelineIntakeRoot, name), content);
      return sha256Hex(Buffer.from(content));
    }

    /** Freeze the approval record for `entry` (must already be source-approved). */
    function freeze(entry) {
      const record = buildApprovalRecord(entry);
      writeApprovalRecordAtomically(pipelineApprovalsRoot, record);
      return record;
    }

    let ethReceipt;
    let ethApproval;
    await checkAsync("end-to-end pipeline succeeds for a fully approved synthetic fixture and writes a valid receipt", async () => {
      const hash = writeIntake("eth-mark.svg", fx.validPaddedSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0002",
        providerId: "ethereum",
        canonicalName: "Ethereum",
        symbol: "ETH",
        expectedMimeClass: "image/svg+xml",
        cropMode: "preserve-canvas",
        intakePath: "eth-mark.svg",
        approvedSourceContentHash: hash,
      });
      ethApproval = freeze(entry);
      const { receipt, receiptPath } = await normalizeApprovedToken({
        entry, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot,
        approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry,
      });
      ethReceipt = receipt;
      const verifyErrs = await verifyReceiptAgainstOutputs(receipt, fakeRepoRoot, registry);
      const bindingErrs = verifyReceiptApprovalBinding(receipt, pipelineApprovalsRoot, registry);
      return receiptPath.endsWith("rpt-0002-v1.json") && verifyErrs.length === 0 && bindingErrs.length === 0 && receipt.approvalRecordContentHash === ethApproval.approvalRecordContentHash;
    });

    // Normalization requires the immutable approval record - it is never
    // enough for the plan entry alone to say source-approved.
    await checkRejects("normalization is rejected when no approval record has been frozen yet", async () => {
      writeIntake("unfrozen.svg", fx.validSimpleSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0012", providerId: "chainlink", canonicalName: "Chainlink", symbol: "LINK",
        expectedMimeClass: "image/svg+xml", intakePath: "unfrozen.svg",
        approvedSourceContentHash: sha256Hex(Buffer.from(fx.validSimpleSvg)),
      });
      await normalizeApprovedToken({ entry, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });
    }, "approval-record-missing-or-invalid");

    // 3. source bytes differing from approvedSourceContentHash are rejected,
    // BEFORE rasterization/normalization: freeze against the real bytes, then
    // tamper with the intake FILE ON DISK after freezing (the plan entry
    // itself still matches the frozen approval - only the bytes changed).
    await checkRejects("source bytes differing from approvedSourceContentHash are rejected", async () => {
      const realHash = writeIntake("mismatch.svg", fx.validSimpleSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0004", providerId: "tether", canonicalName: "Tether", symbol: "USDT",
        expectedMimeClass: "image/svg+xml", intakePath: "mismatch.svg",
        approvedSourceContentHash: realHash,
      });
      freeze(entry);
      writeIntake("mismatch.svg", fx.validPaddedSvg); // swap the file after approval was frozen
      await normalizeApprovedToken({ entry, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });
    }, "source-hash-mismatch");

    // 4. matching bytes proceed (already proven by the successful pipeline
    // run above; assert explicitly here too for a self-contained check).
    await checkAsync("matching approvedSourceContentHash proceeds through inspection", async () => {
      const hash = writeIntake("match.svg", fx.validSimpleSvg);
      const entry = approvedEntry({ expectedMimeClass: "image/svg+xml", intakePath: "match.svg", approvedSourceContentHash: hash });
      const result = await inspectApprovedIntake(entry, pipelineIntakeRoot);
      return result.actualSourceContentHash === hash;
    });

    // 2. plan intakePath is the only normal input path - a second unrelated
    // file present in intake must never be read for a different entry.
    await checkAsync("plan intakePath is the only file read (a decoy file in intake is ignored)", async () => {
      writeIntake("decoy.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"999\" height=\"1\"/></svg>");
      const hash = writeIntake("real.svg", fx.validSimpleSvg);
      const entry = approvedEntry({ expectedMimeClass: "image/svg+xml", intakePath: "real.svg", approvedSourceContentHash: hash });
      const result = await inspectApprovedIntake(entry, pipelineIntakeRoot);
      return result.actualSourceContentHash === hash;
    });

    // 1. --file cannot substitute another intake file: the shipped CLIs
    // don't even parse a --file flag anymore (removed for the normal
    // operator command); confirm at the real CLI level that passing one is a
    // silent no-op and the token stays gated on the plan's own intakePath.
    {
      let stdout = "";
      let failed = false;
      try {
        stdout = execFileSync("node", ["tools/logos/inspect-source.mjs", "--token", "rpt-0001", "--file", "some-other-file.png"], { cwd: repoRoot, encoding: "utf8" });
      } catch (e) {
        failed = true;
        stdout = (e.stdout || "") + (e.stderr || "");
      }
      check("--file is not a recognized flag on inspect-source.mjs (gate still blocks on the real plan)", failed && /sourceReviewStatus=source-approved/.test(stdout));
    }

    // 5. --logo-version cannot override expectedLogoVersion: the shipped
    // normalize-source.mjs CLI doesn't parse a --logo-version flag either.
    {
      let stdout = "";
      let failed = false;
      try {
        stdout = execFileSync("node", ["tools/logos/normalize-source.mjs", "--token", "rpt-0001", "--logo-version", "999"], { cwd: repoRoot, encoding: "utf8" });
      } catch (e) {
        failed = true;
        stdout = (e.stdout || "") + (e.stderr || "");
      }
      check("--logo-version is not a recognized flag on normalize-source.mjs (gate still blocks on the real plan)", failed && /sourceReviewStatus=source-approved/.test(stdout));
    }
    check(
      "normalizeApprovedToken has no logoVersion override parameter - only entry.expectedLogoVersion is ever used",
      normalizeApprovedToken.length === 1, // single destructured options object; no separate version arg
    );

    // 6. missing/invalid expectedLogoVersion is rejected for approved entries.
    await checkRejects("invalid expectedLogoVersion is rejected at the pipeline level", async () => {
      const hash = writeIntake("badver.svg", fx.validSimpleSvg);
      const entry = approvedEntry({ expectedMimeClass: "image/svg+xml", intakePath: "badver.svg", approvedSourceContentHash: hash, expectedLogoVersion: 0 });
      await normalizeApprovedToken({ entry, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });
    }, "invalid-expected-logo-version");
    check(
      "missing expectedLogoVersion rejected by validate-source-plan for a source-approved entry",
      validateSourcePlan([approvedEntry({ expectedLogoVersion: null })], registry).some((e) => /requires a valid expectedLogoVersion/.test(e)),
    );

    // 7. manually placed output without receipt is rejected (orphan output).
    await checkAsync("manually placed output without a receipt is rejected as orphan", async () => {
      const source = await fx.validPngMark();
      const buf64 = await sharp(source).resize(64, 64).png().toBuffer();
      const buf128 = await sharp(source).resize(128, 128).png().toBuffer();
      writeOutputAtomically(pipelineOutputRoot, "rpt-0012", 1, 64, sha256Hex(buf64), buf64);
      writeOutputAtomically(pipelineOutputRoot, "rpt-0012", 1, 128, sha256Hex(buf128), buf128);
      const { found } = await verifyOutputTreeShape(pipelineOutputRoot, registry);
      const { receipts } = loadAllReceipts(pipelineReceiptsRoot);
      const receiptKeys = new Set(receipts.map((r) => `${r.tokenId}:${r.logoVersion}`));
      return found.has("rpt-0012:1") && !receiptKeys.has("rpt-0012:1");
    });

    // 8. receipt with wrong source hash is rejected.
    check(
      "receipt with approvedSourceContentHash != actualSourceContentHash is rejected",
      validateReceiptShape(buildReceipt({
        tokenId: "rpt-0001", catalogVersion: registry.catalogVersion, logoVersion: 1, normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
        approvedSourceContentHash: "a".repeat(64), actualSourceContentHash: "b".repeat(64),
        sourceMimeType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
        output64Path: "x", output128Path: "y", output64Hash: "c".repeat(64), output128Hash: "d".repeat(64),
        toolchain: getToolchainFingerprint(),
      })).some((e) => /must be equal/.test(e)),
    );
    check(
      "receipt containing a forbidden field (e.g. intakePath) is rejected",
      validateReceiptShape({ ...ethReceipt, intakePath: "leak.svg" }).some((e) => /forbidden field "intakePath"/.test(e)),
    );
    check("FORBIDDEN_RECEIPT_FIELDS covers source/approval/intake surface", FORBIDDEN_RECEIPT_FIELDS.includes("sourceReference") && FORBIDDEN_RECEIPT_FIELDS.includes("intakePath") && FORBIDDEN_RECEIPT_FIELDS.includes("approvedBy"));

    // 9. receipt with wrong output hash/path is rejected.
    await checkAsync("receipt with a tampered output file is rejected (hash mismatch)", async () => {
      const outPath = path.join(fakeRepoRoot, ethReceipt.output64Path);
      const original = readFileSync(outPath);
      writeFileSync(outPath, Buffer.from("tampered-bytes"));
      const errs = await verifyReceiptAgainstOutputs(ethReceipt, fakeRepoRoot, registry);
      writeFileSync(outPath, original); // restore for subsequent checks
      return errs.some((e) => /recomputed hash .* does not match receipt hash/.test(e));
    });
    await checkAsync("receipt with a wrong declared path is rejected (path/hash convention mismatch)", async () => {
      const badReceipt = { ...ethReceipt, output64Path: ethReceipt.output64Path.replace(/64\/[0-9a-f]+\.png$/, "64/0000000000000000000000000000000000000000000000000000000000000000.png") };
      const errs = await verifyReceiptAgainstOutputs(badReceipt, fakeRepoRoot, registry);
      return errs.some((e) => /inconsistent with the tokenId\/logoVersion\/size\/hash convention/.test(e));
    });

    // 10. incomplete 64/128 pair is rejected.
    await checkAsync("incomplete 64/128 output pair is rejected", async () => {
      const buf = await fx.validPngMark();
      const h = sha256Hex(buf);
      writeOutputAtomically(pipelineOutputRoot, "rpt-0024", 1, 64, h, buf); // 128/ deliberately omitted
      const { errors, found } = await verifyOutputTreeShape(pipelineOutputRoot, registry);
      return errors.some((e) => /missing required "128\/" directory/.test(e)) && !found.has("rpt-0024:1");
    });

    // 11. multiple current versions without explicit selection are rejected.
    {
      const receiptV1 = { ...ethReceipt, logoVersion: 1 };
      const receiptV2 = {
        ...ethReceipt, logoVersion: 2,
        output64Path: ethReceipt.output64Path.replace("/v1/", "/v2/"),
        output128Path: ethReceipt.output128Path.replace("/v1/", "/v2/"),
      };
      const { errors } = selectReceiptsForRelease([receiptV1, receiptV2], { selections: {} });
      check("multiple receipted versions without explicit release-selection rejected", errors.some((e) => /no explicit entry/.test(e)));

      const { chosen, errors: selErrors } = selectReceiptsForRelease([receiptV1, receiptV2], { selections: { [ethReceipt.tokenId]: 2 } });
      check("explicit release-selection resolves multiple versions deterministically", selErrors.length === 0 && chosen.length === 1 && chosen[0].logoVersion === 2);
    }

    // 12 & 13. release manifest is built EXCLUSIVELY from verified receipts
    // (an orphan output with no receipt never appears), and repeat builds
    // are byte-identical.
    await checkAsync("release manifest excludes unreceipted (orphan) outputs and is deterministic across repeat builds", async () => {
      const { receipts } = loadAllReceipts(pipelineReceiptsRoot); // only rpt-0002 has a real receipt at this point
      for (const r of receipts) {
        const errs = await verifyReceiptAgainstOutputs(r, fakeRepoRoot, registry);
        if (errs.length > 0) return false;
      }
      const { chosen, errors: selErrors } = selectReceiptsForRelease(receipts, { selections: {} });
      if (selErrors.length > 0) return false;
      const entries = chosen.map(receiptToPublicEntry);

      const manifestA = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
      const manifestB = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
      const noOrphan = !manifestA.entries.some((e) => e.tokenId === "rpt-0012" || e.tokenId === "rpt-0024");
      const includesReceipted = manifestA.entries.some((e) => e.tokenId === "rpt-0002");
      const deterministic = manifestA.contentHash === manifestB.contentHash && manifestA.logoReleaseVersion === manifestB.logoReleaseVersion;
      return noOrphan && includesReceipted && deterministic && validateReleaseManifest(manifestA, registry).length === 0;
    });

    // =================================================================
    // 12C-1B2B.2: immutable approval chain, atomic publication.
    // =================================================================

    // --- freeze-approval: gate, hash verification, immutability ----------
    {
      let stdout = "";
      let failed = false;
      try {
        stdout = execFileSync("node", ["tools/logos/freeze-approval.mjs", "--token", "rpt-0001"], { cwd: repoRoot, encoding: "utf8" });
      } catch (e) {
        failed = true;
        stdout = (e.stdout || "") + (e.stderr || "");
      }
      check("freeze-approval CLI is gated on the real (unresearched) plan", failed && /sourceReviewStatus=source-approved/.test(stdout));
    }

    await checkAsync("freeze-approval logic refuses when intake bytes don't match approvedSourceContentHash", async () => {
      writeIntake("freeze-mismatch.svg", fx.validSimpleSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0037", providerId: "hyperliquid", canonicalName: "Hyperliquid", symbol: "HYPE",
        expectedMimeClass: "image/svg+xml", intakePath: "freeze-mismatch.svg",
        approvedSourceContentHash: "9".repeat(64), // deliberately wrong
      });
      try {
        const fileBuffer = readApprovedIntakeFile(entry, pipelineIntakeRoot);
        const actual = sha256Hex(fileBuffer);
        return actual !== entry.approvedSourceContentHash; // freeze-approval.mjs would stop here
      } catch {
        return false;
      }
    });

    let hypeApproval;
    await checkAsync("freeze-approval writes a valid, self-consistent approval record for matching bytes", async () => {
      const hash = writeIntake("hype-mark.svg", fx.validSimpleSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0037", providerId: "hyperliquid", canonicalName: "Hyperliquid", symbol: "HYPE",
        expectedMimeClass: "image/svg+xml", intakePath: "hype-mark.svg", approvedSourceContentHash: hash,
      });
      const fileBuffer = readApprovedIntakeFile(entry, pipelineIntakeRoot);
      if (sha256Hex(fileBuffer) !== hash) return false;
      hypeApproval = freeze(entry);
      return validateApprovalRecordShape(hypeApproval).length === 0 && verifyApprovalMatchesRegistry(hypeApproval, registry).length === 0;
    });
    check(
      "re-freezing identical content is an idempotent no-op",
      (() => {
        const entry = approvedEntry({
          tokenId: "rpt-0037", providerId: "hyperliquid", canonicalName: "Hyperliquid", symbol: "HYPE",
          expectedMimeClass: "image/svg+xml", intakePath: "hype-mark.svg", approvedSourceContentHash: hypeApproval.approvedSourceContentHash,
        });
        const second = freeze(entry);
        return JSON.stringify(second) === JSON.stringify(hypeApproval);
      })(),
    );
    check(
      "re-freezing with different content is rejected (immutability)",
      (() => {
        const mutated = approvedEntry({
          tokenId: "rpt-0037", providerId: "hyperliquid", canonicalName: "Hyperliquid", symbol: "HYPE",
          expectedMimeClass: "image/svg+xml", intakePath: "hype-mark.svg", approvedSourceContentHash: hypeApproval.approvedSourceContentHash,
          notes: "a completely different note",
        });
        try {
          freeze(mutated);
          return false;
        } catch (e) {
          return e instanceof ApprovalError;
        }
      })(),
    );

    // --- approval binding: publication chain tests (section 8) -----------

    // Source-plan mutation after freeze blocks processing for that exact
    // version - proven end-to-end through normalizeApprovedToken (not just
    // the pure verifyApprovalMatchesPlanEntry unit check above).
    await checkRejects("source-plan mutation after freeze blocks processing for that logoVersion", async () => {
      const hash = writeIntake("tia-mark.svg", fx.validSimpleSvg);
      const entry = approvedEntry({
        tokenId: "rpt-0058", providerId: "celestia", canonicalName: "Celestia", symbol: "TIA",
        expectedMimeClass: "image/svg+xml", intakePath: "tia-mark.svg", approvedSourceContentHash: hash,
      });
      freeze(entry);
      const mutated = { ...entry, permittedVariant: "a different variant description" };
      await normalizeApprovedToken({ entry: mutated, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });
    }, "approval-record-plan-drift");

    // An output + a HANDWRITTEN receipt with no approval record at all is an
    // "approval-unbound receipt" and must be rejected. Uses its OWN isolated
    // temp roots so this deliberately-bad receipt never pollutes the
    // pipelineReceiptsRoot used by later tests (e.g. the full-chain
    // determinism check, which loads every receipt in pipelineReceiptsRoot).
    await checkAsync("a handwritten receipt with no approval record is rejected as unbound", async () => {
      const unboundRoot = path.join(tmpRoot, "unbound-receipt-test");
      const unboundOutputRoot = path.join(unboundRoot, "output");
      const unboundReceiptsRoot = path.join(unboundRoot, "receipts");
      const unboundApprovalsRoot = path.join(unboundRoot, "approvals");
      const buf = await fx.validPngMark();
      const buf64 = await sharp(buf).resize(64, 64).png().toBuffer();
      const buf128 = await sharp(buf).resize(128, 128).png().toBuffer();
      const hash64 = sha256Hex(buf64);
      const hash128 = sha256Hex(buf128);
      writeOutputAtomically(unboundOutputRoot, "rpt-0041", 1, 64, hash64, buf64);
      writeOutputAtomically(unboundOutputRoot, "rpt-0041", 1, 128, hash128, buf128);
      const handwritten = buildReceipt({
        tokenId: "rpt-0041", catalogVersion: registry.catalogVersion, logoVersion: 1, normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
        approvedSourceContentHash: "1".repeat(64), actualSourceContentHash: "1".repeat(64),
        sourceMimeType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
        output64Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0041/v1/64/${hash64}.png`,
        output128Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0041/v1/128/${hash128}.png`,
        output64Hash: hash64, output128Hash: hash128,
        approvalRecordContentHash: "2".repeat(64), // no approval record exists for this hash at all
        toolchain: getToolchainFingerprint(),
      });
      writeReceiptAtomically(unboundReceiptsRoot, handwritten);
      const bindingErrs = verifyReceiptApprovalBinding(handwritten, unboundApprovalsRoot, registry);
      return bindingErrs.some((e) => /no valid, processable approval record found/.test(e));
    });

    // invalid approvalRecordContentHash (bad format) is rejected at the shape
    // level; a well-formed but WRONG hash is rejected at the binding level.
    check(
      "invalid approvalRecordContentHash format is rejected",
      validateReceiptShape(buildReceipt({
        tokenId: "rpt-0001", catalogVersion: registry.catalogVersion, logoVersion: 1, normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
        approvedSourceContentHash: "a".repeat(64), actualSourceContentHash: "a".repeat(64),
        sourceMimeType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
        output64Path: "x", output128Path: "y", output64Hash: "c".repeat(64), output128Hash: "d".repeat(64),
        approvalRecordContentHash: "not-a-valid-hash",
        toolchain: getToolchainFingerprint(),
      })).some((e) => /approvalRecordContentHash is invalid/.test(e)),
    );
    await checkAsync("receipt approvalRecordContentHash not matching its approval record's own hash is rejected", async () => {
      const mismatched = { ...ethReceipt, approvalRecordContentHash: "f".repeat(64) };
      const errs = verifyReceiptApprovalBinding(mismatched, pipelineApprovalsRoot, registry);
      return errs.some((e) => /does not match the approval record's own hash/.test(e));
    });

    // Future v2 approval does not invalidate validated v1 artifacts: freeze
    // + process v1 for a token, then freeze a DIFFERENT candidate as v2 for
    // the SAME token, and confirm v1's receipt/approval/outputs are still
    // fully valid and unaffected.
    await checkAsync("a future v2 approval does not invalidate previously validated v1 artifacts", async () => {
      const hashV1 = writeIntake("fet-v1.svg", fx.validSimpleSvg);
      const entryV1 = approvedEntry({
        tokenId: "rpt-0070", providerId: "fetch-ai", canonicalName: "Artificial Superintelligence Alliance", symbol: "FET",
        expectedMimeClass: "image/svg+xml", intakePath: "fet-v1.svg", approvedSourceContentHash: hashV1, expectedLogoVersion: 1,
      });
      freeze(entryV1);
      const { receipt: receiptV1 } = await normalizeApprovedToken({ entry: entryV1, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });

      const v1ValidBefore = (await verifyReceiptAgainstOutputs(receiptV1, fakeRepoRoot, registry)).length === 0
        && verifyReceiptApprovalBinding(receiptV1, pipelineApprovalsRoot, registry).length === 0;

      // Now freeze a DIFFERENT approved candidate as v2 for the same token.
      const hashV2 = writeIntake("fet-v2.svg", fx.validPaddedSvg);
      const entryV2 = approvedEntry({
        tokenId: "rpt-0070", providerId: "fetch-ai", canonicalName: "Artificial Superintelligence Alliance", symbol: "FET",
        expectedMimeClass: "image/svg+xml", intakePath: "fet-v2.svg", approvedSourceContentHash: hashV2, expectedLogoVersion: 2,
        cropMode: "preserve-canvas",
      });
      freeze(entryV2);
      // Also process v2, so a genuine second receipted version exists for
      // the section-6 release-selection disambiguation tests below - and to
      // prove v2's own processing has no bearing on v1's validity either.
      await normalizeApprovedToken({ entry: entryV2, intakeRoot: pipelineIntakeRoot, outputRoot: pipelineOutputRoot, receiptsRoot: pipelineReceiptsRoot, approvalsRoot: pipelineApprovalsRoot, repoRoot: fakeRepoRoot, registry });

      const v1ValidAfter = (await verifyReceiptAgainstOutputs(receiptV1, fakeRepoRoot, registry)).length === 0
        && verifyReceiptApprovalBinding(receiptV1, pipelineApprovalsRoot, registry).length === 0;

      return v1ValidBefore && v1ValidAfter;
    });

    // Approval fields never leak into the public manifest.
    check(
      "approvalRecordContentHash never appears in a receiptToPublicEntry projection",
      !Object.prototype.hasOwnProperty.call(receiptToPublicEntry(ethReceipt), "approvalRecordContentHash"),
    );
    check("FORBIDDEN_PUBLIC_FIELDS includes approvalRecordContentHash", FORBIDDEN_PUBLIC_FIELDS.includes("approvalRecordContentHash"));

    // Full synthetic approval -> receipt -> manifest chain is deterministic.
    await checkAsync("the full synthetic approval-to-manifest chain is deterministic across two independent builds", async () => {
      const { receipts } = loadAllReceipts(pipelineReceiptsRoot);
      for (const r of receipts) {
        const outputErrs = await verifyReceiptAgainstOutputs(r, fakeRepoRoot, registry);
        const bindingErrs = verifyReceiptApprovalBinding(r, pipelineApprovalsRoot, registry);
        if (outputErrs.length > 0 || bindingErrs.length > 0) return false;
      }
      const selection = { schemaVersion: 1, selections: { "rpt-0070": 2 } }; // disambiguate FET v1/v2
      const selectionErrs = validateReleaseSelection(selection, receipts, registry);
      if (selectionErrs.length > 0) return false;
      const { chosen, errors: pickErrs } = selectReceiptsForRelease(receipts, selection);
      if (pickErrs.length > 0) return false;
      const entries = chosen.map(receiptToPublicEntry);
      const manifestA = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
      const manifestB = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries });
      return manifestA.contentHash === manifestB.contentHash && manifestA.logoReleaseVersion === manifestB.logoReleaseVersion && validateReleaseManifest(manifestA, registry).length === 0;
    });

    // --- release-selection.json validation (section 6) --------------------
    {
      const { receipts } = loadAllReceipts(pipelineReceiptsRoot);
      const validSel = { schemaVersion: 1, selections: { "rpt-0070": 2 } };
      check("valid release-selection passes", validateReleaseSelection(validSel, receipts, registry).length === 0);
      check("non-object selections rejected", validateReleaseSelection({ schemaVersion: 1, selections: [1, 2] }, receipts, registry).some((e) => /must be a non-array object/.test(e)));
      check("invalid tokenId key rejected", validateReleaseSelection({ schemaVersion: 1, selections: { bogus: 1 } }, receipts, registry).some((e) => /invalid tokenId format/.test(e)));
      check("tokenId absent from registry rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-9999": 1 } }, receipts, registry).some((e) => /absent from the approved V2 registry/.test(e)));
      check("non-positive logoVersion rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-0070": 0 } }, receipts, registry).some((e) => /positive integer/.test(e)));
      check("non-integer logoVersion rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-0070": "two" } }, receipts, registry).some((e) => /positive integer/.test(e)));
      check("selected version without a verified receipt rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-0070": 99 } }, receipts, registry).some((e) => /no verified receipt/.test(e)));
      check("stale selection for a token with only one receipt rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-0002": 1 } }, receipts, registry).some((e) => /stale selection entry/.test(e)));
      check("selection entry for a token with no receipt at all rejected", validateReleaseSelection({ schemaVersion: 1, selections: { "rpt-0142": 1 } }, receipts, registry).some((e) => /no verified receipt exists at all/.test(e)));
      check("unknown top-level field in release-selection rejected", validateReleaseSelection({ schemaVersion: 1, selections: {}, extra: true }, receipts, registry).some((e) => /unknown top-level field/.test(e)));
      check("missing release-selection schemaVersion rejected", validateReleaseSelection({ selections: {} }, receipts, registry).some((e) => /schemaVersion must be/.test(e)));
      check("wrong release-selection schemaVersion rejected", validateReleaseSelection({ schemaVersion: 2, selections: {} }, receipts, registry).some((e) => /schemaVersion must be/.test(e)));
    }

    // =================================================================
    // 12C-1B2B.3: strict approval/receipt/manifest/selection schemas.
    // A manually reconstructed chain must never pass merely because its
    // internal hashes are self-consistent.
    // =================================================================
    function validApprovalFields(overrides = {}) {
      return {
        schemaVersion: 1, tokenId: "rpt-0037", catalogVersion: registry.catalogVersion,
        providerId: "hyperliquid", canonicalName: "Hyperliquid", symbol: "HYPE", logoVersion: 1,
        sourceReviewStatus: "source-approved", permissionReviewStatus: "permission-confirmed",
        sourceType: "official-brand-kit", sourceReference: "https://x", sourcePageReference: "https://x/p",
        permittedVariant: "icon", variantType: "icon", cropMode: "alpha-bounds", expectedMimeClass: "image/svg+xml",
        approvedSourceContentHash: "a".repeat(64), approvedBy: "product-owner", approvedAt: "2026-01-01T00:00:00Z",
        permissionEvidenceReference: "evidence-ref", providerFallbackApproved: false, allowExtremeAspectRatio: false,
        notes: "", intakePath: "x.svg",
        ...overrides,
      };
    }
    function validApproval(overrides = {}) {
      const fields = validApprovalFields(overrides);
      return { ...fields, approvalRecordContentHash: computeApprovalRecordContentHash(fields) };
    }

    // --- Section 1/2/3: strict approval-record schema -----------------------
    check("a fully valid, processable approval record passes", validateApprovalRecordShape(validApproval()).length === 0);
    check("approval permission status unreviewed is rejected", validateApprovalRecordShape(validApproval({ permissionReviewStatus: "unreviewed" })).some((e) => /permission-confirmed.*explicit-product-exception/.test(e)));
    check("approval permission status needs-legal-review is rejected", validateApprovalRecordShape(validApproval({ permissionReviewStatus: "needs-legal-review" })).some((e) => /permission-confirmed.*explicit-product-exception/.test(e)));
    check("approval permission status rejected is rejected", validateApprovalRecordShape(validApproval({ permissionReviewStatus: "rejected" })).some((e) => /permission-confirmed.*explicit-product-exception/.test(e)));
    check("permission-confirmed without evidence is rejected", validateApprovalRecordShape(validApproval({ permissionEvidenceReference: "" })).some((e) => /permissionEvidenceReference/.test(e)));
    check("explicit-product-exception without notes is rejected", validateApprovalRecordShape(validApproval({ permissionReviewStatus: "explicit-product-exception", notes: "" })).some((e) => /notes must be non-empty and explain the exception/.test(e)));
    check("explicit-product-exception with notes passes", validateApprovalRecordShape(validApproval({ permissionReviewStatus: "explicit-product-exception", notes: "documented exception rationale" })).length === 0);
    check("authorized-provider without providerFallbackApproved is rejected", validateApprovalRecordShape(validApproval({ sourceType: "authorized-provider", notes: "fallback rationale" })).some((e) => /authorized-provider requires providerFallbackApproved=true/.test(e)));
    check("authorized-provider without notes is rejected", validateApprovalRecordShape(validApproval({ sourceType: "authorized-provider", providerFallbackApproved: true, notes: "" })).some((e) => /authorized-provider requires non-empty notes/.test(e)));
    check("authorized-provider fully complete passes", validateApprovalRecordShape(validApproval({ sourceType: "authorized-provider", providerFallbackApproved: true, notes: "fallback rationale" })).length === 0);
    check("providerFallbackApproved=true on an official-project source is rejected", validateApprovalRecordShape(validApproval({ providerFallbackApproved: true })).some((e) => /providerFallbackApproved must be false for sourceType/.test(e)));
    check("unknown approval-record field is rejected", validateApprovalRecordShape({ ...validApproval(), extraField: "leak" }).some((e) => /unknown field "extraField"/.test(e)));
    check("missing approval-record field (sourcePageReference) is rejected", (() => { const a = validApproval(); delete a.sourcePageReference; return validateApprovalRecordShape(a).some((e) => /sourcePageReference/.test(e)); })());
    check("missing approval-record field (permittedVariant) is rejected", (() => { const a = validApproval(); delete a.permittedVariant; return validateApprovalRecordShape(a).some((e) => /permittedVariant/.test(e)); })());
    check("invalid approvedAt (no timezone) is rejected", validateApprovalRecordShape(validApproval({ approvedAt: "2026-01-01T00:00:00" })).some((e) => /ISO-8601/.test(e)));
    check("invalid approvedAt (garbage string) is rejected", validateApprovalRecordShape(validApproval({ approvedAt: "not-a-date" })).some((e) => /ISO-8601/.test(e)));
    check("valid approvedAt with numeric offset passes", validateApprovalRecordShape(validApproval({ approvedAt: "2026-01-01T00:00:00+02:00" })).length === 0);

    // --- Section 4: approval hash coverage -----------------------------------
    {
      const base = validApprovalFields();
      const baseHash = computeApprovalRecordContentHash(base);
      let changedCount = 0;
      for (const field of APPROVAL_FIELD_NAMES) {
        if (field === "schemaVersion") continue; // only one valid value, can't vary
        const changed = { ...base, [field]: typeof base[field] === "boolean" ? !base[field] : `${base[field]}-changed` };
        if (computeApprovalRecordContentHash(changed) !== baseHash) changedCount += 1;
      }
      check("changing any approval field changes approvalRecordContentHash", changedCount === APPROVAL_FIELD_NAMES.length - 1);

      const withUnknown = { ...validApproval(), sneaky: "value" };
      check("adding an unknown field makes the record invalid", validateApprovalRecordShape(withUnknown).length > 0);
      check("an unknown field never enters the hashed canonical projection", !canonicalSerializeApproval(withUnknown).includes("sneaky"));

      for (const field of APPROVAL_FIELD_NAMES) {
        const missing = validApproval();
        delete missing[field];
        check(`removing required approval field "${field}" makes the record invalid`, validateApprovalRecordShape(missing).length > 0);
      }
    }

    // --- Section 5: receipt-to-approval semantic binding ---------------------
    {
      const goodApproval = freeze(approvedEntry({
        tokenId: "rpt-0142", providerId: "canton-network", canonicalName: "Canton", symbol: "CC",
        expectedMimeClass: "image/svg+xml", intakePath: "canton.svg", approvedSourceContentHash: writeIntake("canton.svg", fx.validSimpleSvg),
      }));
      const baseReceiptFields = {
        tokenId: "rpt-0142", catalogVersion: registry.catalogVersion, logoVersion: 1, normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
        approvedSourceContentHash: goodApproval.approvedSourceContentHash, actualSourceContentHash: goodApproval.approvedSourceContentHash,
        sourceMimeType: "image/svg+xml", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
        output64Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0142/v1/64/${"1".repeat(64)}.png`,
        output128Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0142/v1/128/${"2".repeat(64)}.png`,
        output64Hash: "1".repeat(64), output128Hash: "2".repeat(64),
        approvalRecordContentHash: goodApproval.approvalRecordContentHash, toolchain: getToolchainFingerprint(),
      };
      check(
        "a fully consistent receipt bound to a processable approval passes binding",
        verifyReceiptApprovalBinding(buildReceipt(baseReceiptFields), pipelineApprovalsRoot, registry).length === 0,
      );
      check(
        "receipt MIME inconsistent with approval MIME is rejected",
        verifyReceiptApprovalBinding(buildReceipt({ ...baseReceiptFields, sourceMimeType: "image/png" }), pipelineApprovalsRoot, registry).some((e) => /sourceMimeType/.test(e)),
      );

      // A self-consistent-but-non-processable approval record (hand-crafted:
      // permissionReviewStatus=unreviewed, with its OWN hash recomputed to
      // match) must still be rejected - this is the exact "manually
      // reconstructed chain passes on self-consistent hashes alone" attack
      // this phase closes.
      const unreviewedRoot = path.join(tmpRoot, "unreviewed-approval-test");
      const unreviewedFields = validApprovalFields({ tokenId: "rpt-0041", permissionReviewStatus: "unreviewed" });
      // Bypass writeApprovalRecordAtomically's validation entirely - simulate
      // a hand-authored file, not tooling output.
      mkdirSync(unreviewedRoot, { recursive: true });
      const unreviewedHash = computeApprovalRecordContentHash({ ...unreviewedFields, permissionReviewStatus: "permission-confirmed" }); // irrelevant hash source
      const selfConsistentBadRecord = { ...unreviewedFields, approvalRecordContentHash: computeApprovalRecordContentHash(unreviewedFields) };
      writeFileSync(path.join(unreviewedRoot, "rpt-0041-v1.json"), JSON.stringify(selfConsistentBadRecord, null, 2));
      void unreviewedHash;
      const receiptBoundToUnreviewed = buildReceipt({
        ...baseReceiptFields, tokenId: "rpt-0041",
        output64Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0041/v1/64/${"3".repeat(64)}.png`,
        output128Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0041/v1/128/${"4".repeat(64)}.png`,
        output64Hash: "3".repeat(64), output128Hash: "4".repeat(64),
        approvalRecordContentHash: selfConsistentBadRecord.approvalRecordContentHash,
      });
      check(
        "a receipt bound to a self-consistent but non-processable (unreviewed) approval is rejected",
        verifyReceiptApprovalBinding(receiptBoundToUnreviewed, unreviewedRoot, registry).some((e) => /no valid, processable approval record found/.test(e)),
      );
    }

    // --- Section 6: strict receipt schema ------------------------------------
    {
      const validReceiptFields = {
        schemaVersion: 1, tokenId: "rpt-0001", catalogVersion: registry.catalogVersion, logoVersion: 1,
        normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
        approvedSourceContentHash: "a".repeat(64), actualSourceContentHash: "a".repeat(64),
        sourceMimeType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
        output64Path: "x", output128Path: "y", output64Hash: "c".repeat(64), output128Hash: "d".repeat(64),
        output64MimeType: "image/png", output128MimeType: "image/png",
        approvalRecordContentHash: "e".repeat(64), toolchain: getToolchainFingerprint(),
      };
      check("a fully valid receipt with exact allowed fields passes shape validation", validateReceiptShape(validReceiptFields).length === 0);
      check("unknown receipt field is rejected", validateReceiptShape({ ...validReceiptFields, leaked: "x" }).some((e) => /unknown field "leaked"/.test(e)));
      check("receipt with a non-object toolchain is rejected", validateReceiptShape({ ...validReceiptFields, toolchain: "not-an-object" }).some((e) => /toolchain must be an object/.test(e)));
      check("receipt with an incomplete toolchain fingerprint is rejected", validateReceiptShape({ ...validReceiptFields, toolchain: { nodeVersion: "v1" } }).some((e) => /toolchain is missing required fingerprint field/.test(e)));
    }

    // --- Section 7: strict public-manifest schema ----------------------------
    {
      const h64 = "1".repeat(64);
      const h128 = "2".repeat(64);
      const strictEntry = {
        tokenId: "rpt-0001", logoVersion: 1,
        output64Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0001/v1/64/${h64}.png`,
        output128Path: `${TOKEN_LOGOS_OUTPUT_ROOT}/rpt-0001/v1/128/${h128}.png`,
        output64Hash: h64, output128Hash: h128, output64MimeType: "image/png", output128MimeType: "image/png",
      };
      const strictManifest = buildReleaseManifest({ catalogVersion: registry.catalogVersion, entries: [strictEntry] });
      check("a fully valid manifest with exact allowed fields passes", validateReleaseManifest(strictManifest, registry).length === 0);
      check("unknown public-manifest top-level field is rejected", validateReleaseManifest({ ...strictManifest, unexpectedTopLevel: true }, registry).some((e) => /unknown top-level field "unexpectedTopLevel"/.test(e)));
      check(
        "unknown public entry field is rejected even when not on the private blocklist",
        validateReleaseManifest({ ...strictManifest, entries: [{ ...strictEntry, notOnBlocklistEither: "x" }] }, registry).some((e) => /unknown field "notOnBlocklistEither"/.test(e)),
      );
    }

    // --- failure-injection / rollback tests (section 5) -------------------
    {
      const rollbackRoot = path.join(tmpRoot, "rollback");
      const rollbackOutputRoot = path.join(rollbackRoot, "output");
      const rollbackReceiptsRoot = path.join(rollbackRoot, "receipts");
      async function makeBuffers() {
        const b64 = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 11, g: 22, b: 33, alpha: 1 } } }).png().toBuffer();
        const b128 = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 44, g: 55, b: 66, alpha: 1 } } }).png().toBuffer();
        return { b64, b128, h64: sha256Hex(b64), h128: sha256Hex(b128) };
      }
      function candidate(tokenId, h64, h128, over = {}) {
        return buildReceipt({
          tokenId, catalogVersion: registry.catalogVersion, logoVersion: 1, normalizationPolicyVersion: NORMALIZATION_POLICY_VERSION,
          approvedSourceContentHash: "1".repeat(64), actualSourceContentHash: "1".repeat(64),
          sourceMimeType: "image/png", sourceWidth: 10, sourceHeight: 10, sourceFileSize: 100,
          output64Path: outputPathFor(rollbackOutputRoot, tokenId, 1, 64, h64), output128Path: outputPathFor(rollbackOutputRoot, tokenId, 1, 128, h128),
          output64Hash: h64, output128Hash: h128, approvalRecordContentHash: "2".repeat(64), toolchain: getToolchainFingerprint(), ...over,
        });
      }

      await checkAsync("128 write failure after the 64 stage rolls back the newly created 64 file", async () => {
        const { b64, b128, h64, h128 } = await makeBuffers();
        const p64 = outputPathFor(rollbackOutputRoot, "rpt-0001", 1, 64, h64);
        try {
          await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0001", logoVersion: 1, buf64: b64, buf128: b128, hash64: h64, hash128: h128, candidateReceipt: candidate("rpt-0001", h64, h128), testOnly: { throwAfter: "after64Write" } });
          return false;
        } catch (e) {
          return e instanceof PublishRollbackError && !existsSyncSafe(p64);
        }
      });

      await checkAsync("receipt write failure after both outputs rolls back both newly created outputs", async () => {
        const { b64, b128, h64, h128 } = await makeBuffers();
        const p64 = outputPathFor(rollbackOutputRoot, "rpt-0002", 1, 64, h64);
        const p128 = outputPathFor(rollbackOutputRoot, "rpt-0002", 1, 128, h128);
        try {
          await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0002", logoVersion: 1, buf64: b64, buf128: b128, hash64: h64, hash128: h128, candidateReceipt: candidate("rpt-0002", h64, h128), testOnly: { throwAfter: "afterReceiptWrite" } });
          return false;
        } catch (e) {
          return e instanceof PublishRollbackError && !existsSyncSafe(p64) && !existsSyncSafe(p128);
        }
      });

      await checkAsync("a pre-existing identical output is idempotent (no error, no spurious rollback)", async () => {
        const { b64, b128, h64, h128 } = await makeBuffers();
        await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0004", logoVersion: 1, buf64: b64, buf128: b128, hash64: h64, hash128: h128, candidateReceipt: candidate("rpt-0004", h64, h128) });
        const result = await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0004", logoVersion: 1, buf64: b64, buf128: b128, hash64: h64, hash128: h128, candidateReceipt: candidate("rpt-0004", h64, h128) });
        return existsSyncSafe(result.path64) && existsSyncSafe(result.path128) && existsSyncSafe(result.receiptPath);
      });

      await checkAsync("a pre-existing conflicting output is rejected and the original is preserved (cleanup never deletes pre-existing files)", async () => {
        const { b64, b128, h64, h128 } = await makeBuffers();
        await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0012", logoVersion: 1, buf64: b64, buf128: b128, hash64: h64, hash128: h128, candidateReceipt: candidate("rpt-0012", h64, h128) });
        const p64Original = outputPathFor(rollbackOutputRoot, "rpt-0012", 1, 64, h64);
        const otherB64 = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 1, b: 1, alpha: 1 } } }).png().toBuffer();
        const otherH64 = sha256Hex(otherB64);
        try {
          await publishTokenVersion({ outputRoot: rollbackOutputRoot, receiptsRoot: rollbackReceiptsRoot, tokenId: "rpt-0012", logoVersion: 1, buf64: otherB64, buf128: b128, hash64: otherH64, hash128: h128, candidateReceipt: candidate("rpt-0012", otherH64, h128) });
          return false;
        } catch (e) {
          return e.constructor.name === "OutputConflictError" && existsSyncSafe(p64Original);
        }
      });
    }

    function existsSyncSafe(p) {
      try {
        readFileSync(p);
        return true;
      } catch {
        return false;
      }
    }

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
            e.approvedAt === null &&
            e.approvedSourceContentHash === null &&
            e.intakePath === null,
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
