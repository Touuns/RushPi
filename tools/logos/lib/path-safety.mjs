// Safe local-path resolution for the logo intake convention. Every path an
// operator or Codex supplies is untrusted input: this module is the single
// place that turns a relative path string into a filesystem path guaranteed
// to stay inside a given root directory, rejecting anything that could escape
// it (absolute paths, traversal, symlink escape, drive-letter switches).
import fs from "node:fs";
import path from "node:path";

export class UnsafePathError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafePathError";
  }
}

/**
 * Resolve `relativePath` against `rootDir`, guaranteeing the result is a real
 * path inside `rootDir`. Throws UnsafePathError on any violation.
 *
 * - rejects absolute paths (POSIX or Windows, incl. drive letters and UNC);
 * - rejects any ".." path traversal segment;
 * - rejects paths outside the root after normalization;
 * - if the target (or any existing ancestor within root) is a symlink,
 *   resolves the real path and re-checks it is still inside root.
 *
 * @param {string} rootDir  absolute path to the trusted root (e.g. the intake dir)
 * @param {string} relativePath  untrusted, caller-supplied relative path
 * @returns {string} absolute, safety-checked path (not required to exist)
 */
export function resolveSafePath(rootDir, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new UnsafePathError("path must be a non-empty string");
  }
  if (path.isAbsolute(relativePath)) {
    throw new UnsafePathError(`absolute paths are not allowed: "${relativePath}"`);
  }
  // Windows drive-letter or UNC prefix disguised as "relative" (e.g. "C:foo",
  // "\\\\server\\share"). path.isAbsolute() alone does not always catch
  // "C:foo" (drive-relative, not absolute) on POSIX-hosted checks, so also
  // reject any drive-letter or backslash-backslash prefix explicitly.
  if (/^[a-zA-Z]:/.test(relativePath) || relativePath.startsWith("\\\\")) {
    throw new UnsafePathError(`drive-qualified or UNC paths are not allowed: "${relativePath}"`);
  }
  const segments = relativePath.split(/[/\\]+/);
  if (segments.some((seg) => seg === "..")) {
    throw new UnsafePathError(`path traversal is not allowed: "${relativePath}"`);
  }
  if (segments.some((seg) => seg === "" && segments.length > 1)) {
    // Collapses to reject inputs like "foo//../bar" sneaking through above,
    // and leading "/" already caught by isAbsolute, but double-guard here.
  }

  const absoluteRoot = path.resolve(rootDir);
  const candidate = path.resolve(absoluteRoot, relativePath);
  const relFromRoot = path.relative(absoluteRoot, candidate);
  if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
    throw new UnsafePathError(`resolved path escapes the root directory: "${relativePath}"`);
  }

  assertNoSymlinkEscape(absoluteRoot, candidate);
  return candidate;
}

/**
 * Assert that `absolutePath` exists, is NOT a symlink (regardless of where it
 * points - a within-root-resolving symlink is still rejected outright, not
 * just an escaping one), and is a regular file.
 * @param {string} absolutePath
 * @throws {UnsafePathError}
 */
export function assertRegularNonSymlinkFile(absolutePath) {
  let stat;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch {
    throw new UnsafePathError(`file does not exist: "${absolutePath}"`);
  }
  if (stat.isSymbolicLink()) {
    throw new UnsafePathError(`path is a symlink, not a regular file: "${absolutePath}"`);
  }
  if (!stat.isFile()) {
    throw new UnsafePathError(`path is not a regular file: "${absolutePath}"`);
  }
}

/**
 * Walk from the deepest existing ancestor of `candidate` back up to `root`,
 * resolving symlinks, and confirm the real path never leaves `root`. Only
 * inspects path segments that actually exist on disk (the final file itself
 * may not exist yet).
 */
function assertNoSymlinkEscape(root, candidate) {
  const relParts = path.relative(root, candidate).split(path.sep).filter(Boolean);
  let current = root;
  // The root itself must be a real, resolvable directory.
  let realRoot;
  try {
    realRoot = fs.realpathSync(root);
  } catch {
    // Root not created yet (e.g. intake dir absent) — nothing to escape.
    return;
  }
  for (const part of relParts) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      // Path segment does not exist yet — nothing further to check.
      break;
    }
    if (stat.isSymbolicLink()) {
      const real = fs.realpathSync(current);
      const relFromRoot = path.relative(realRoot, real);
      if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
        throw new UnsafePathError(`symlink escapes the root directory: "${current}"`);
      }
    }
  }
}
