"use client";

import type Lenis from "lenis";

/**
 * The live Lenis instance, published by LenisProvider.
 *
 * A module-level handle rather than React context on purpose: the nav and the
 * ⌘K palette just need "scroll to this id", and should not have to be
 * descendants of a provider or re-render when scrolling happens.
 */
let lenisInstance: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenisInstance = instance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

/** Height of the fixed nav, so a section does not land underneath it. */
const SCROLL_OFFSET = -72;

/**
 * Scroll to a section by DOM id. Falls back to native scrolling when Lenis is
 * absent (calm mode destroys the instance), so this is always safe to call.
 */
export function scrollToSection(id: string, options: { immediate?: boolean } = {}) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;

  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset: SCROLL_OFFSET, immediate: options.immediate });
    return;
  }

  // Native path: respects the user's reduced-motion preference by itself.
  const top = target.getBoundingClientRect().top + window.scrollY + SCROLL_OFFSET;
  window.scrollTo({ top, behavior: options.immediate ? "auto" : "smooth" });
}
