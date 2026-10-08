"use client";

import { useEffect, useLayoutEffect } from "react";
import type { Transition, Variants } from "framer-motion";
import { useIsCalm } from "@/store/ui";

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

export const springs = {
  soft: { type: "spring" as const, stiffness: 120, damping: 20, mass: 0.8 },
  snappy: { type: "spring" as const, stiffness: 320, damping: 28 },
  /** For scroll-linked values: no overshoot, just smoothing. */
  scrub: { stiffness: 140, damping: 30, restDelta: 0.001 },
} satisfies Record<string, Transition>;

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

export function useTransition(transition: Transition): Transition {
  return calmTransition(transition, useIsCalm());
}

/** `distance` is the px offset the element travels in wild mode. */
export function revealVariants(calm: boolean, distance = 24): Variants {
  return {
    hidden: { opacity: 0, y: calm ? 0 : distance },
    shown: {
      opacity: 1,
      y: 0,
      transition: calm
        ? { duration: 0.01 }
        : { duration: durations.base, ease: EASE_OUT },
    },
  };
}

/**
 * Drop-in props for a scroll-triggered reveal:
 *   <motion.div {...useReveal()}>
 * Stagger children by passing an index: `useReveal({ index: 2 })`.
 */
export function useReveal(options: { index?: number; distance?: number; amount?: number } = {}) {
  const calm = useIsCalm();
  const { index = 0, distance = 24, amount = 0.3 } = options;

  return {
    initial: "hidden" as const,
    whileInView: "shown" as const,
    viewport: { once: true, amount },
    variants: {
      hidden: { opacity: 0, y: calm ? 0 : distance },
      shown: {
        opacity: 1,
        y: 0,
        transition: calm
          ? { duration: 0.01 }
          : { duration: durations.base, ease: EASE_OUT, delay: index * 0.07 },
      },
    } satisfies Variants,
  };
}

/** Container/child pair for staggered lists. Stagger is 0 in calm mode. */
export function staggerParent(calm: boolean, stagger = 0.07): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: calm ? 0 : stagger } },
  };
}

export const viewportOnce = { once: true, amount: 0.3 } as const;
