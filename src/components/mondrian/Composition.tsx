"use client";

import { motion } from "framer-motion";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

/**
 * The hero's Mondrian composition. The black lines draw in one after another
 * as an inward spiral — down, across, up, back, down, across — each shorter
 * than the last, closing in on the red block at the eye of the spiral. Then
 * the colour blocks fill from their outer corners.
 *
 * Coordinates are a 640 × 336 grid. Calm mode shows the finished painting.
 */

type Line = { x1: number; y1: number; x2: number; y2: number };

/** In draw order: the spiral first, then two short closing strokes. */
const LINES: Line[] = [
  { x1: 180, y1: 0, x2: 180, y2: 336 },
  { x1: 180, y1: 234, x2: 640, y2: 234 },
  { x1: 560, y1: 234, x2: 560, y2: 0 },
  { x1: 560, y1: 66, x2: 180, y2: 66 },
  { x1: 250, y1: 66, x2: 250, y2: 234 },
  { x1: 250, y1: 188, x2: 560, y2: 188 },
  { x1: 0, y1: 118, x2: 180, y2: 118 },
  { x1: 430, y1: 234, x2: 430, y2: 336 },
];

type Block = { x: number; y: number; width: number; height: number; fill: string; origin: string };

/* Fills/strokes are Tailwind classes (fill-m-red, stroke-ink) rather than raw
   var(--…) strings, so the colours can never silently drop out of the CSS. */

/** Fill order: the red eye, then the corners. `origin` is where each grows from. */
const BLOCKS: Block[] = [
  { x: 250, y: 66, width: 310, height: 122, fill: "fill-m-red", origin: "0% 0%" },
  { x: 0, y: 234, width: 180, height: 102, fill: "fill-m-blue", origin: "0% 100%" },
  { x: 560, y: 234, width: 80, height: 102, fill: "fill-m-yellow", origin: "100% 100%" },
  { x: 180, y: 0, width: 70, height: 66, fill: "fill-ink", origin: "0% 0%" },
];

const LINE_STEP = 0.16;
const LINE_DRAW = 0.42;

export function Composition({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  const calm = useIsCalm();
  const blocksStart = delay + LINES.length * LINE_STEP + 0.15;

  return (
    <div className={`border-4 border-ink bg-surface ${className}`}>
      <svg viewBox="0 0 640 336" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        {BLOCKS.map((block, index) => (
          <motion.rect
            key={index}
            x={block.x}
            y={block.y}
            width={block.width}
            height={block.height}
            className={block.fill}
            style={{ transformBox: "fill-box", transformOrigin: block.origin }}
            initial={{ scale: calm ? 1 : 0 }}
            animate={{ scale: 1 }}
            transition={
              calm ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT, delay: blocksStart + index * 0.12 }
            }
          />
        ))}
        {LINES.map((line, index) => (
          <motion.line
            key={index}
            {...line}
            className="stroke-ink"
            strokeWidth={8}
            // Butt caps: a square cap paints a stray dot at length zero, before
            // the line starts drawing. Every line ends on another line's centre
            // or the frame, so the joins still close.
            strokeLinecap="butt"
            initial={{ pathLength: calm ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={
              calm ? { duration: 0 } : { duration: LINE_DRAW, ease: EASE_IN_OUT, delay: delay + index * LINE_STEP }
            }
          />
        ))}
      </svg>
    </div>
  );
}
