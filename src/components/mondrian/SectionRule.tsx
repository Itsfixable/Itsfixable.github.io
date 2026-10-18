"use client";

import { motion } from "framer-motion";
import { EASE_OUT, viewportOnce } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

export type MondrianTone = "red" | "blue" | "yellow";

const TONE: Record<MondrianTone, string> = {
  red: "bg-m-red",
  blue: "bg-m-blue",
  yellow: "bg-m-yellow",
};

/**
 * The opening of every section: a thick black rule that draws in from the
 * left as the section arrives, then a primary-colour block lands on its end,
 * like one line and one rectangle of a Mondrian grid. Calm mode shows the
 * finished rule with no movement.
 */
export function SectionRule({ tone }: { tone: MondrianTone }) {
  const calm = useIsCalm();

  return (
    <motion.div
      aria-hidden="true"
      initial="hidden"
      whileInView="shown"
      viewport={viewportOnce}
      className="flex items-end"
    >
      <motion.span
        className="block h-1 flex-1 origin-left bg-ink"
        variants={{
          hidden: { scaleX: calm ? 1 : 0 },
          shown: { scaleX: 1, transition: calm ? { duration: 0 } : { duration: 0.7, ease: EASE_OUT } },
        }}
      />
      <motion.span
        className={`block h-6 w-12 origin-bottom-left ${TONE[tone]} border-[3px] border-ink sm:w-16`}
        variants={{
          hidden: { scale: calm ? 1 : 0 },
          shown: {
            scale: 1,
            transition: calm ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT, delay: 0.55 },
          },
        }}
      />
    </motion.div>
  );
}
