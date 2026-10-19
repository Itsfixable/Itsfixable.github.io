"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

/**
 * The Mondrian building block every section is made of.
 *
 * `Grid` is a CSS grid painted black, with the gap and frame set to the rule
 * thickness, so the thick black lines are simply the grid showing between its
 * cells. `Cell` is one rectangle: paper, or a primary.
 *
 * Motion, when a grid scrolls into view: the whole painting wipes in from the
 * left (its lines and paper cells ruling across), then each coloured cell
 * fills from a corner, the corners turning clockwise with `order` so the
 * colour lands in a spiral. Calm mode paints the finished grid at once.
 */

export type Tone = "paper" | "red" | "blue" | "yellow" | "black";

const FILL: Record<Exclude<Tone, "paper">, string> = {
  red: "bg-m-red",
  blue: "bg-m-blue",
  yellow: "bg-m-yellow",
  black: "bg-ink",
};

/** Text that reads on each tone (white on red/blue/black, ink on yellow). */
const INK: Record<Tone, string> = {
  paper: "text-text",
  red: "text-white",
  blue: "text-white",
  yellow: "text-ink",
  black: "text-white",
};

/** Clockwise: top-left, top-right, bottom-right, bottom-left. */
const CORNERS = ["0% 0%", "100% 0%", "100% 100%", "0% 100%"];

type GridProps = {
  className?: string;
  children: ReactNode;
  /** Shares its top rule with the section above, so the page reads as one painting. */
  joined?: boolean;
};

export function Grid({ className = "", children, joined = false }: GridProps) {
  const calm = useIsCalm();

  // Two layers on purpose. IntersectionObserver applies an element's own
  // clip-path, so a grid that starts fully clipped reports 0% visible forever
  // and never reveals. The unclipped outer layer is what gets observed; the
  // inner layer does the wipe, driven by the inherited variant.
  return (
    <motion.div initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.12 }}>
      <motion.div
        className={`mondrian-grid ${joined ? "border-t-0" : ""} ${className}`}
        variants={{
          hidden: { clipPath: calm ? "none" : "inset(0% 100% 0% 0%)" },
          shown: {
            clipPath: "inset(0% 0% 0% 0%)",
            transition: calm ? { duration: 0 } : { duration: 0.8, ease: EASE_IN_OUT },
            // Leave nothing clipped afterwards: focus rings and tooltips must
            // be free to reach the edge.
            transitionEnd: { clipPath: "none" },
          },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

type CellProps = {
  tone?: Tone;
  /** Position in the colour spiral: sets the fill delay and which corner it grows from. */
  order?: number;
  className?: string;
  children?: ReactNode;
};

export function Cell({ tone = "paper", order = 0, className = "", children }: CellProps) {
  const calm = useIsCalm();

  return (
    <div className={`relative isolate min-w-0 bg-surface ${INK[tone]} ${className}`}>
      {tone !== "paper" ? (
        // Behind the content (negative z inside the isolated cell), so text
        // and controls sit on the colour as it lands.
        <motion.span
          aria-hidden="true"
          className={`absolute inset-0 -z-10 ${FILL[tone]}`}
          style={{ transformOrigin: CORNERS[order % CORNERS.length] }}
          variants={{
            hidden: { scale: calm ? 1 : 0 },
            shown: {
              scale: 1,
              transition: calm ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT, delay: 0.5 + order * 0.09 },
            },
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
