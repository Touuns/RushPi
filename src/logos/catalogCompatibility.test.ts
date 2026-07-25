import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCatalogCompatibility } from "./catalogCompatibility.ts";
import { parseTokenLogoManifest } from "./manifestParser.ts";

function fixtureManifest(catalogVersion: string) {
  const result = parseTokenLogoManifest({
    schemaVersion: 1,
    catalogVersion,
    logoReleaseVersion: "logo-release-v1-b04b94bca7a50eb3",
    normalizationPolicyVersion: 1,
    entryCount: 0,
    entries: [],
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture must parse");
  return result.manifest;
}

test("matching catalogVersion is compatible", () => {
  const manifest = fixtureManifest("token-registry-v2-7b98c60e767128c1");
  const result = checkCatalogCompatibility("token-registry-v2-7b98c60e767128c1", manifest);
  assert.equal(result.compatible, true);
});

test("mismatched catalogVersion is reported incompatible, not thrown", () => {
  const manifest = fixtureManifest("token-registry-v2-oldversion");
  const result = checkCatalogCompatibility("token-registry-v2-7b98c60e767128c1", manifest);
  assert.equal(result.compatible, false);
  if (!result.compatible) {
    assert.equal(result.expectedCatalogVersion, "token-registry-v2-7b98c60e767128c1");
    assert.equal(result.actualCatalogVersion, "token-registry-v2-oldversion");
  }
});
