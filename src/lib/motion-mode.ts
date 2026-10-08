/**
 * Motion-mode primitives with no "use client" directive, so both the server
 * (the no-flash script in the root layout) and the client store can import the
 * real values. Exports of a "use client" module arrive on the server as opaque
 * client references, which is why these cannot live in the store itself.
 */

/**
 * "wild" = the full motion design. "calm" = the same site with the showy
 * movement removed (no parallax, no letter-by-letter reveal, no long easing).
 *
 * Calm is not a lesser version: every section must still be readable and
 * complete in calm mode, it just arrives without the choreography.
 */
export type MotionMode = "wild" | "calm";

export const MOTION_STORAGE_KEY = "koji-portfolio:motion-mode";

/** Kept in one place so the store and the no-flash script agree. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function isMotionMode(value: unknown): value is MotionMode {
  return value === "wild" || value === "calm";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function readStoredMotionMode(): MotionMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    return isMotionMode(stored) ? stored : null;
  } catch {
    // Private mode / storage disabled. Fall through to the OS preference.
    return null;
  }
}

/**
 * An explicit choice wins, otherwise the OS preference decides. Resolved
 * synchronously on the client so the very first render already has the right
 * value and no animation plays that the user asked not to see.
 */
export function resolveInitialMotionMode(): MotionMode {
  return readStoredMotionMode() ?? (prefersReducedMotion() ? "calm" : "wild");
}
