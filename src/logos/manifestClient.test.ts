import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchTokenLogoManifest, TOKEN_LOGO_MANIFEST_URL } from "./manifestClient.ts";

const VALID_MANIFEST_JSON = {
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
};

function withMockFetch<T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test("HTTP success parses and indexes the manifest", async () => {
  let callCount = 0;
  let requestedUrl = "";
  const result = await withMockFetch(
    (async (url: string) => {
      callCount += 1;
      requestedUrl = url;
      return new Response(JSON.stringify(VALID_MANIFEST_JSON), { status: 200 });
    }) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(callCount, 1);
  assert.equal(requestedUrl, TOKEN_LOGO_MANIFEST_URL);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.manifest.entryCount, 1);
    assert.equal(result.index.get("rpt-0001")?.tokenId, "rpt-0001");
  }
});

test("HTTP 404 returns a typed http-error failure", async () => {
  const result = await withMockFetch(
    (async () => new Response("not found", { status: 404 })) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "http-error");
    assert.equal(result.status, 404);
  }
});

test("malformed JSON returns a typed malformed-json failure", async () => {
  const result = await withMockFetch(
    (async () => new Response("{not valid json", { status: 200 })) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "malformed-json");
});

test("schema failure returns a typed schema-invalid failure", async () => {
  const invalid = { ...VALID_MANIFEST_JSON, entryCount: 999 };
  const result = await withMockFetch(
    (async () => new Response(JSON.stringify(invalid), { status: 200 })) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "schema-invalid");
    assert.equal(result.code, "entry-count-mismatch");
  }
});

test("network failure returns a typed network-error failure", async () => {
  const result = await withMockFetch(
    (async () => {
      throw new TypeError("network down");
    }) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "network-error");
});

test("timeout returns a typed timeout failure", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const result = await withMockFetch(
      ((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        })) as typeof fetch,
      async () => {
        const pending = fetchTokenLogoManifest();
        t.mock.timers.tick(8000);
        return pending;
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "timeout");
  } finally {
    t.mock.timers.reset();
  }
});

test("never retries: fetch is called exactly once even on failure", async () => {
  let callCount = 0;
  await withMockFetch(
    (async () => {
      callCount += 1;
      return new Response("nope", { status: 500 });
    }) as typeof fetch,
    () => fetchTokenLogoManifest(),
  );
  assert.equal(callCount, 1);
});
