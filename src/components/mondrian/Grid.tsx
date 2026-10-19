"use client";

import { createContext, useContext, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

/**
 * The Mondrian building block every section is made of.
 *
 * `Grid` is a CSS grid painted black, with the gap and frame set to the rule
 * thickness, so the black lines are simply the grid showing between cells.
 * `Cell` is one rectangle. Colour is used sparingly: narrow accent strips and
 * small squares, never big filled fields.
 *
 * Each section enters its own way (`entrance`), so scrolling the page is not
 * the same animation six times:
 *   wipe    – the painting is drawn across from the left
 *   drop    – it unrolls from the top
 *   split   – it opens from the centre outwards, like a door
 *   iris    – it grows from the middle point
 *   cascade – the cells grow into place one by one from their corners, so
 *             the black lines start thick and settle
 *   rise    – it lifts into place
 * Accent strips then grow along their long edge. Calm mode paints everything
 * finished, with no movement.
 */

export type Tone = "paper" | "red" | "blue" | "yellow" | "black";
export type Entrance = "wipe" | "drop" | "split" | "iris" | "cascade" | "rise";

const FILL: Record<Exclude<Tone, "paper">, string> = {
  red: "bg-m-red",
  blue: "bg-m-blue",
  yellow: "bg-m-yellow",
  black: "bg-ink",
};

/** Clockwise: top-left, top-right, bottom-right, bottom-left. */
const CORNERS = ["0% 0%", "100% 0%", "100% 100%", "0% 100%"];

const CLIP_FROM: Partial<Record<Entrance, string>> = {
  wipe: "inset(0% 100% 0% 0%)",
  drop: "inset(0% 0% 100% 0%)",
  split: "inset(0% 50% 0% 50%)",
  iris: "inset(50% 50% 50% 50%)",
};

const EntranceContext = createContext<Entrance>("wipe");

function gridVariants(entrance: Entrance, calm: boolean): Variants | undefined {
  if (calm || entrance === "cascade") return undefined;
  if (entrance === "rise") {
    return {
      hidden: { opacity: 0, y: 48 },
      shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
    };
  }
  return {
    hidden: { clipPath: CLIP_FROM[entrance] },
    shown: {
      clipPath: "inset(0% 0% 0% 0%)",
      transition: { duration: entrance === "iris" ? 0.9 : 0.8, ease: EASE_IN_OUT },
      // Leave nothing clipped afterwards: focus rings and tooltips must be
      // free to reach the edge.
      transitionEnd: { clipPath: "none" },
    },
  };
}

type GridProps = {
  className?: string;
  children: ReactNode;
  entrance?: Entrance;
  /** Shares its top rule with the section above, so the page reads as one painting. */
  joined?: boolean;
};

export function Grid({ className = "", children, entrance = "wipe", joined = false }: GridProps) {
  const calm = useIsCalm();

  // Two layers on purpose. IntersectionObserver applies an element's own
  // clip-path, so a grid that starts fully clipped reports 0% visible forever
  // and never reveals. The unclipped outer layer is what gets observed; the
  // inner layer animates, driven by the inherited variant.
  return (
    <EntranceContext.Provider value={entrance}>
      <motion.div initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.12 }}>
        <motion.div
          className={`mondrian-grid ${joined ? "border-t-0" : ""} ${className}`}
          variants={gridVariants(entrance, calm)}
        >
          {children}
        </motion.div>
      </motion.div>
    </EntranceContext.Provider>
  );
}

type CellProps = {
  tone?: Tone;
  /** Position in the entrance sequence: sets delays and which corner it grows from. */
  order?: number;
  /**
   * How a coloured cell's colour arrives: along its width ("x"), along its
   * height ("y"), or from a corner.
   */
  grow?: "x" | "y" | "corner";
  className?: string;
  children?: ReactNode;
};

export function Cell({ tone = "paper", order = 0, grow = "corner", className = "", children }: CellProps) {
  const calm = useIsCalm();
  const entrance = useContext(EntranceContext);
  const cascade = entrance === "cascade" && !calm;
  const colourDelay = (cascade ? 0.25 : 0.55) + order * 0.08;

  const origin =
    grow === "x"
      ? order % 2 === 0
        ? "0% 50%"
        : "100% 50%"
      : grow === "y"
        ? order % 2 === 0
          ? "50% 0%"
          : "50% 100%"
        : CORNERS[order % CORNERS.length];

  const colourFrom = grow === "x" ? { scaleX: 0 } : grow === "y" ? { scaleY: 0 } : { scale: 0 };
  const colourTo = grow === "x" ? { scaleX: 1 } : grow === "y" ? { scaleY: 1 } : { scale: 1 };

  return (
    <motion.div
      className={`relative isolate min-w-0 bg-surface ${tone === "paper" || tone === "yellow" ? "text-text" : "text-white"} ${className}`}
      style={cascade ? { transformOrigin: CORNERS[order % CORNERS.length] } : undefined}
      variants={
        cascade
          ? {
              // White cells start shrunk, so the black lines read thick and
              // then settle as each cell grows into place. No opacity: a
              // fading cell would show the black grid through it as a slab.
              hidden: { scale: 0.9 },
              shown: {
                scale: 1,
                transition: { duration: 0.6, ease: EASE_OUT, delay: order * 0.07 },
              },
            }
          : undefined
      }
    >
      {tone !== "paper" ? (
        // Behind the content (negative z inside the isolated cell).
        <motion.span
          aria-hidden="true"
          className={`absolute inset-0 -z-10 ${FILL[tone]}`}
          style={{ transformOrigin: origin }}
          variants={
            calm
              ? undefined
              : {
                  hidden: colourFrom,
                  shown: { ...colourTo, transition: { duration: 0.6, ease: EASE_OUT, delay: colourDelay } },
                }
          }
        />
      ) : null}
      {children}
    </motion.div>
  );
}

/** A small solid square of colour, for marking a label or a link. */
export function Swatch({ tone, className = "" }: { tone: Exclude<Tone, "paper">; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 ${FILL[tone]} ${className}`} />;
}
