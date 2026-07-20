/**
 * Reduced-motion preference (Phase 12B-3B/3C). Resolved once per scene/run —
 * never read every frame, never live-updated mid-run — a run started before a
 * preference change finishes in the mode it started in.
 *
 * Phase 12B-3C adds a manual override on top of the OS-level media query,
 * since Pi Browser does not reliably expose `prefers-reduced-motion`. The
 * preference is stored separately from gameplay progression so "Reset local
 * data" does not need to touch it.
 */

export type MotionPreference = "auto" | "full" | "reduced";

const MOTION_PREFERENCE_KEY = "rushpi.motionPreference.v1";

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === "auto" || value === "full" || value === "reduced";
}

/** Absent, invalid, or unreadable storage all fall back to "auto". */
export function getMotionPreference(): MotionPreference {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return "auto";
  }
  try {
    const stored = window.localStorage.getItem(MOTION_PREFERENCE_KEY);
    return isMotionPreference(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

/** Best-effort persistence; a throwing/unavailable storage is a silent no-op. */
export function setMotionPreference(preference: MotionPreference): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(MOTION_PREFERENCE_KEY, preference);
  } catch {
    // Ignore — the game stays playable without persisted preferences.
  }
}

function matchesOsReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Resolver precedence: "reduced" always wins, "full" always wins, "auto"
 * falls through to the OS media query (false if unavailable/throwing).
 */
export function resolveReducedMotion(): boolean {
  const preference = getMotionPreference();
  if (preference === "reduced") return true;
  if (preference === "full") return false;
  return matchesOsReducedMotion();
}
