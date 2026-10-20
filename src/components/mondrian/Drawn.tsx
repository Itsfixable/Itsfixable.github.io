"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";
import { FILL, type Tone } from "./tone";

/**
 * The page's one motion idea: the painting is drawn as you arrive at it.
 * Black lines draw along their length, colour drops into the corner two lines
 * make, and the words come last. Different things draw differently (a section
 * opens with a line and a T, a demo's frame runs round clockwise, a list's
 * rules tick in left to right), but it is always the same painter.
 *
 * Everything moves only `transform` and `opacity` on small elements, so the
 * browser composites it without repainting the page. Calm mode renders the
 * finished painting with no movement.
 *
 * `at` is seconds after the enclosing `Drawing` starts, so one group reads as
 * one sequence.
 */

/** A group starts as soon as its top is a little way onto the screen. */
const IN_VIEW = { once: true, margin: "0px 0px -12% 0px" } as const;

type DrawingProps = {
  className?: string;
  children: ReactNode;
  /** "load" draws straight away (the hero); "view" waits until it is scrolled to. */
  start?: "view" | "load";
};

/** A group whose parts draw in sequence. */
export function Drawing({ className = "", children, start = "view" }: DrawingProps) {
  return start === "load" ? (
    <motion.div className={className} initial="hidden" animate="shown">
      {children}
    </motion.div>
  ) : (
    <motion.div className={className} initial="hidden" whileInView="shown" viewport={IN_VIEW}>
      {children}
    </motion.div>
  );
}

type LineProps = {
  /** "x" draws a horizontal line along its width, "y" a vertical one down its height. */
  axis?: "x" | "y";
  /** Draw right-to-left (x) or bottom-to-top (y). */
  reverse?: boolean;
  at?: number;
  duration?: number;
  /** Position and size, e.g. "absolute inset-x-0 top-0 h-[var(--rule)]". */
  className?: string;
};

/** A black line that draws itself. */
export function Line({ axis = "x", reverse = false, at = 0, duration = 0.8, className = "" }: LineProps) {
  const calm = useIsCalm();
  const origin = axis === "x" ? (reverse ? "100% 50%" : "0% 50%") : reverse ? "50% 100%" : "50% 0%";
  const from = axis === "x" ? { scaleX: 0 } : { scaleY: 0 };
  const to = axis === "x" ? { scaleX: 1 } : { scaleY: 1 };

  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none bg-ink ${className}`}
      style={{ transformOrigin: origin }}
      variants={
        calm ? undefined : { hidden: from, shown: { ...to, transition: { duration, ease: EASE_IN_OUT, delay: at } } }
      }
    />
  );
}

/** A block of colour that drops down from the line above it. */
export function Block({ tone, at = 0, className = "" }: { tone: Tone; at?: number; className?: string }) {
  const calm = useIsCalm();
  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none block ${FILL[tone]} ${className}`}
      style={{ transformOrigin: "50% 0%" }}
      variants={
        calm
          ? undefined
          : { hidden: { scaleY: 0 }, shown: { scaleY: 1, transition: { duration: 0.55, ease: EASE_OUT, delay: at } } }
      }
    />
  );
}

/** Words and other content: fade in while lifting a little. */
export function Rise({ at = 0, className = "", children }: { at?: number; className?: string; children: ReactNode }) {
  const calm = useIsCalm();
  return (
    <motion.div
      className={className}
      variants={
        calm
          ? undefined
          : {
              hidden: { opacity: 0, y: 14 },
              shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: at } },
            }
      }
    >
      {children}
    </motion.div>
  );
}

/** Content that should not move (a canvas, a table): fade only. */
export function Fade({ at = 0, className = "", children }: { at?: number; className?: string; children: ReactNode }) {
  const calm = useIsCalm();
  return (
    <motion.div
      className={className}
      variants={
        calm
          ? undefined
          : { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 0.6, ease: "easeOut", delay: at } } }
      }
    >
      {children}
    </motion.div>
  );
}

const EDGE = 0.34;

/**
 * The frame around something you can play with. Its four sides draw in one
 * clockwise run (top, right, bottom, left), then the contents fade up inside.
 * The only fully framed things on the page are the ones you can touch.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <Drawing className="relative bg-surface p-[var(--rule)]">
      <Line duration={EDGE} className="absolute inset-x-0 top-0 h-[var(--rule)]" />
      <Line axis="y" at={EDGE * 0.9} duration={EDGE} className="absolute inset-y-0 right-0 w-[var(--rule)]" />
      <Line reverse at={EDGE * 1.8} duration={EDGE} className="absolute inset-x-0 bottom-0 h-[var(--rule)]" />
      <Line axis="y" reverse at={EDGE * 2.7} duration={EDGE} className="absolute inset-y-0 left-0 w-[var(--rule)]" />
      <Fade at={EDGE * 1.4}>{children}</Fade>
    </Drawing>
  );
}
