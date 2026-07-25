import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LOGOS_DIR = fileURLToPath(new URL(".", import.meta.url));

function sourceFiles(): string[] {
  return readdirSync(LOGOS_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
}

/**
 * Extracts only actual `import ... from "..."` / `export ... from "..."`
 * specifiers (static analysis of real dependencies), deliberately ignoring
 * doc-comment prose — several modules here explain in comments why they do
 * NOT depend on Phaser/tokenAssetCache, which would otherwise false-positive
 * a naive full-text scan.
 */
function importSpecifiers(text: string): string[] {
  const specifiers: string[] = [];
  const re = /\bfrom\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

test("no source file in src/logos imports Phaser", () => {
  for (const file of sourceFiles()) {
    const specifiers = importSpecifiers(readFileSync(`${LOGOS_DIR}${file}`, "utf8"));
    for (const spec of specifiers) {
      assert.doesNotMatch(spec, /^phaser$/i, `${file} must not import Phaser (found "${spec}")`);
    }
  }
});

test("no source file in src/logos imports a Daily/game scene module", () => {
  for (const file of sourceFiles()) {
    const specifiers = importSpecifiers(readFileSync(`${LOGOS_DIR}${file}`, "utf8"));
    for (const spec of specifiers) {
      assert.doesNotMatch(spec, /\/game\//i, `${file} must not import from src/game (found "${spec}")`);
    }
  }
});

test("no source file in src/logos imports or mutates tokenAssetCache", () => {
  for (const file of sourceFiles()) {
    const specifiers = importSpecifiers(readFileSync(`${LOGOS_DIR}${file}`, "utf8"));
    for (const spec of specifiers) {
      assert.doesNotMatch(spec, /tokenAssetCache/i, `${file} must not import tokenAssetCache (found "${spec}")`);
    }
  }
});

test("importing the module performs no network request", async () => {
  let callCount = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount += 1;
    throw new Error("fetch must not be called merely by importing src/logos");
  }) as typeof fetch;
  try {
    // Cache-busting query so this dynamic import is fresh even if another
    // test file already imported the module in the same test process. Built
    // from a computed expression (not a string literal) so the TypeScript
    // compiler does not try to statically resolve it as a module specifier.
    const specifier = ["./index.ts", "isolation-check"].join("?");
    await import(specifier);
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(callCount, 0);
});
