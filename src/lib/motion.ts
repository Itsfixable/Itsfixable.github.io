"use client";

import { useEffect, useLayoutEffect } from "react";
import type { Transition } from "framer-motion";

/**
 * Shared motion vocabulary. Every section imports from here so the whole page
 * eases the same way, and so "calm" means the same thing everywhere.
 *
 * The rule for calm mode: the end state is identical, the journey is not.
 * Opacity is allowed (it never induces motion sickness); transform, blur,
 * parallax and stagger are not.
 */

/**
 * `useLayoutEffect` on the client, `useEffect` during the static prerender
 * (where `useLayoutEffect` would warn — there is no paint to get ahead of).
 *
 * Picking the hook at module scope is not the same thing as branching rendered
 * markup on `typeof window`: the tree React produces is identical either way.
 * This only decides whether a pre-paint correction (which mode is active,
 * whether a pinned layout fits) lands before or after the first paint —
 * before is what every such correction wants, so the user never sees one
 * frame of the wrong state.
 */
export const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Durations in seconds, keyed by how far the thing has to travel. */
export const durations = { fast: 0.25, base: 0.5, slow: 0.9 } as const;

/**
 * Collapses a transition to near-instant for calm mode instead of disabling
 * it, which keeps `onAnimationComplete` and `AnimatePresence` exits working.
 */
export function calmTransition(transition: Transition, calm: boolean): Transition {
  if (!calm) return transition;
  return { duration: 0.01, delay: 0 };
}
