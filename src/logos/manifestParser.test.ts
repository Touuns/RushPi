import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseTokenLogoManifest, SUPPORTED_MANIFEST_SCHEMA_VERSION } from "./manifestParser.ts";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function validFixture() {
  return {
    schemaVersion: 1,
    catalogVersion: "token-registry-v2-7b98c60e767128c1",
    logoReleaseVersion: "logo-release-v1-b04b94bca7a50eb3",
    normalizationPolicyVersion: 1,
    entryCount: 2,
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
      {
        tokenId: "rpt-0002",
        logoVersion: 1,
        output64Path:
          "public/assets/rushpi/token-logos/rpt-0002/v1/64/43d87326044016ef895bfd75164f7c73213649fb661821fb8db5ced18965327f.png",
        output128Path:
          "public/assets/rushpi/token-logos/rpt-0002/v1/128/31cbfc7110f0ce915249259fbf929ce7cfbca54bb04e251423d4a30e75c386fa.png",
        output64Hash: "43d87326044016ef895bfd75164f7c73213649fb661821fb8db5ced18965327f",
        output128Hash: "31cbfc7110f0ce915249259fbf929ce7cfbca54bb04e251423d4a30e75c386fa",
        output64MimeType: "image/png",
        output128MimeType: "image/png",
      },
    ],
  };
}

test("current committed manifest parses successfully", () => {
  const raw = readFileSync(`${REPO_ROOT}public/data/token-logos/release-manifest.json`, "utf8");
  const result = parseTokenLogoManifest(JSON.parse(raw));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.manifest.entryCount, 11);
    assert.equal(result.manifest.entries.length, 11);
    assert.equal(result.manifest.catalogVersion, "token-registry-v2-7b98c60e767128c1");
    assert.equal(result.manifest.logoReleaseVersion, "logo-release-v1-b04b94bca7a50eb3");
    assert.equal(SUPPORTED_MANIFEST_SCHEMA_VERSION, 1);
  }
});

test("valid fixture parses successfully", () => {
  const result = parseTokenLogoManifest(validFixture());
  assert.equal(result.ok, true);
});

test("rejects a non-object root", () => {
  for (const bad of [null, "string", 42, [], undefined]) {
    const result = parseTokenLogoManifest(bad);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "invalid-root");
  }
});

test("rejects an unsupported schemaVersion", () => {
  const fixture = validFixture();
  (fixture as { schemaVersion: number }).schemaVersion = 2;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "unsupported-schema-version");
});

test("catalogVersion mismatch still parses (compatibility is a separate concern)", () => {
  const fixture = validFixture();
  fixture.catalogVersion = "token-registry-v2-someotherversion";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.manifest.catalogVersion, "token-registry-v2-someotherversion");
});

test("rejects entryCount mismatch", () => {
  const fixture = validFixture();
  fixture.entryCount = 99;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "entry-count-mismatch");
});

test("rejects duplicate tokenId (same logoVersion)", () => {
  const fixture = validFixture();
  fixture.entries[1] = { ...fixture.entries[0] };
  fixture.entryCount = fixture.entries.length;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "duplicate-token-id");
});

test("rejects duplicate tokenId + logoVersion combination (different logoVersion, same tokenId)", () => {
  const fixture = validFixture();
  fixture.entries[1] = { ...fixture.entries[0], logoVersion: 2 };
  fixture.entryCount = fixture.entries.length;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "duplicate-token-id");
});

test("rejects a malformed tokenId", () => {
  for (const bad of ["rpt-1", "rpt-00001", "RPT-0001", "rpt_0001", "rpt-0001x", ""]) {
    const fixture = validFixture();
    fixture.entries[0].tokenId = bad;
    const result = parseTokenLogoManifest(fixture);
    assert.equal(result.ok, false, `expected rejection for tokenId ${JSON.stringify(bad)}`);
    if (!result.ok) assert.equal(result.code, "invalid-entry");
  }
});

test("rejects a malformed logoVersion", () => {
  for (const bad of [0, -1, 1.5, "1", null]) {
    const fixture = validFixture();
    (fixture.entries[0] as { logoVersion: unknown }).logoVersion = bad;
    const result = parseTokenLogoManifest(fixture);
    assert.equal(result.ok, false, `expected rejection for logoVersion ${JSON.stringify(bad)}`);
    if (!result.ok) assert.equal(result.code, "invalid-entry");
  }
});

test("rejects the wrong MIME type", () => {
  const fixture = validFixture();
  fixture.entries[0].output64MimeType = "image/jpeg";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects an uppercase hash", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Hash = fixture.entries[0].output64Hash.toUpperCase();
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects a filename/hash mismatch", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Hash =
    "0000000000000000000000000000000000000000000000000000000000000000".slice(0, 64);
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects a wrong size segment (64 path placed under /128/)", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Path = fixture.entries[0].output128Path;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects a path tokenId mismatch", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Path = fixture.entries[0].output64Path.replace("rpt-0001", "rpt-0002");
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects an external URL", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Path =
    "https://evil.example.com/assets/rushpi/token-logos/rpt-0001/v1/64/10482668d504a4ca571ba67f7077f60157940de27cfd42ea5012c485b8e58409.png";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects path traversal", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Path =
    "public/assets/rushpi/token-logos/rpt-0001/v1/64/../../../../etc/passwd.png";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects an SVG path", () => {
  const fixture = validFixture();
  fixture.entries[0].output64Path = fixture.entries[0].output64Path.replace(/\.png$/, ".svg");
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("rejects a missing required top-level field", () => {
  const fixture = validFixture() as Record<string, unknown>;
  delete fixture.catalogVersion;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "missing-field");
});

test("rejects a missing required entry field", () => {
  const fixture = validFixture();
  const entry = fixture.entries[0] as Record<string, unknown>;
  delete entry.output128MimeType;
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});

test("tolerates the committed manifest's extra top-level contentHash field", () => {
  const fixture = validFixture() as Record<string, unknown>;
  fixture.contentHash = "b04b94bca7a50eb3bc124b2c0b6b963495bb0bb90759dad6035824e9564e54e4";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, true);
});

test("rejects a genuinely unknown top-level field", () => {
  const fixture = validFixture() as Record<string, unknown>;
  fixture.unexpectedAdminField = "should not be here";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "unknown-field");
});

test("rejects an unknown field on an entry", () => {
  const fixture = validFixture();
  (fixture.entries[0] as Record<string, unknown>).unexpectedField = "nope";
  const result = parseTokenLogoManifest(fixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid-entry");
});
