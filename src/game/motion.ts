/**
 * Reduced-motion preference (Phase 12B-3B): resolved once per scene/run from the
 * OS-level `prefers-reduced-motion` media query. Never read every frame, never
 * live-updated mid-run — a run started before an OS change finishes in the mode
 * it started in.
 */
export function resolveReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
