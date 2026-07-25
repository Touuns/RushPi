import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTokenLogoManifest } from "./manifestParser.ts";
import { buildManifestIndex, lookupManifestEntry } from "./manifestIndex.ts";
import { toBrowserAssetPath, resolvePreferredLogoAsset } from "./assetResolver.ts";

function parsedFixtureManifest() {
  const result = parseTokenLogoManifest({
    schemaVersion: 1,
    catalogVersion: "token-registry-v2-7b98c60e767128c1",
    logoReleaseVersion: "logo-release-v1-b04b94bca7a50eb3",
    normalizationPolicyVersion: 1,
    entryCount: 1,
    entries: [
      {
        tokenId: "rpt-0001",
        logoVersion: 1,
        output64Path:
          "public/assets/rushpi/token-logos/rpt-0001/v1/64/10482668d504a4ca571ba67f7077f60157940de27cfd42ea5012c485b8e58409.png",
        output128Path:
          "public/assets/rushpi/token-logos/rpt-0001/v1/128/766037e5978eb8e9686d4ca8f9b814536cf6da918b7cde70efc3cae5a5259e34.png",
        output64Hash: "10482668d504a4ca571ba67f7077f60157940de27cfd42ea5012c485b8e58409",
        output128Hash: "766037e5978eb8e9686d4ca8f9b814536cf6da918b7cde70efc3cae5a5259e34",
        output64MimeType: "image/png",
        output128MimeType: "image/png",
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture must parse");
  return result.manifest;
}

test("index: O(1) lookup returns the matching entry", () => {
  const manifest = parsedFixtureManifest();
  const index = buildManifestIndex(manifest);
  const entry = lookupManifestEntry(index, "rpt-0001");
  assert.ok(entry);
  assert.equal(entry?.tokenId, "rpt-0001");
});

test("index: unknown tokenId returns undefined", () => {
  const manifest = parsedFixtureManifest();
  const index = buildManifestIndex(manifest);
  assert.equal(lookupManifestEntry(index, "rpt-9999"), undefined);
});

test("index: repeated lookups are stable and do not mutate the parsed manifest", () => {
  const manifest = parsedFixtureManifest();
  const before = JSON.stringify(manifest);
  const index = buildManifestIndex(manifest);
  const a = lookupManifestEntry(index, "rpt-0001");
  const b = lookupManifestEntry(index, "rpt-0001");
  assert.equal(a, b);
  assert.equal(JSON.stringify(manifest), before);
});

test("toBrowserAssetPath: converts public/... to /...", () => {
  const manifest = parsedFixtureManifest();
  const entry = lookupManifestEntry(buildManifestIndex(manifest), "rpt-0001");
  assert.ok(entry);
  assert.equal(
    toBrowserAssetPath(entry!.output64Path),
    "/assets/rushpi/token-logos/rpt-0001/v1/64/10482668d504a4ca571ba67f7077f60157940de27cfd42ea5012c485b8e58409.png",
  );
});

test("toBrowserAssetPath: throws for a path not shaped by the parser", () => {
  assert.throws(() => toBrowserAssetPath("https://example.com/evil.png"));
  assert.throws(() => toBrowserAssetPath("public/assets/rushpi/token-logos/rpt-0001/v1/64/not-a-hash.png"));
});

test("resolvePreferredLogoAsset: 'standard' selects the 64px asset", () => {
  const manifest = parsedFixtureManifest();
  const entry = lookupManifestEntry(buildManifestIndex(manifest), "rpt-0001")!;
  const resolved = resolvePreferredLogoAsset(entry, "standard");
  assert.equal(resolved.size, 64);
  assert.equal(resolved.sha256, entry.output64Sha256);
  assert.equal(resolved.browserPath, toBrowserAssetPath(entry.output64Path));
});

test("resolvePreferredLogoAsset: 'high-density' selects the 128px asset", () => {
  const manifest = parsedFixtureManifest();
  const entry = lookupManifestEntry(buildManifestIndex(manifest), "rpt-0001")!;
  const resolved = resolvePreferredLogoAsset(entry, "high-density");
  assert.equal(resolved.size, 128);
  assert.equal(resolved.sha256, entry.output128Sha256);
  assert.equal(resolved.browserPath, toBrowserAssetPath(entry.output128Path));
});
