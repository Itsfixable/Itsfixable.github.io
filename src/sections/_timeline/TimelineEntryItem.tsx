"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { TimelineEntry } from "@/data/profile";
import { calmTransition, durations, EASE_OUT, revealVariants } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";
import { ENTRY_GRID } from "./layout";
import { isPlaceholder, PlaceholderChip } from "./PlaceholderChip";

/**
 * One tool on the learning path.
 *
 * Layout is a single grid that re-flows rather than a second DOM tree:
 *   375px   row 1 [node][meta]        row 2 [ ][body]
 *   >=768px row 1 [meta][node][body]
 * so the spine is always at the far left on a phone with every word to its
 * right, and the dates hang off to the left of the spine on desktop.
 */

type TimelineEntryItemProps = {
  entry: TimelineEntry;
  /** True for the final entry — it drops its trailing rhythm. */
  isLast: boolean;
};

export function TimelineEntryItem({ entry, isLast }: TimelineEntryItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const calm = useIsCalm();

  // `once` so a node never un-lights: the accent means "progress reached here".
  const inView = useInView(itemRef, { once: true, amount: 0.4 });
  // Calm mode starts lit. motionMode is corrected in a layout effect before
  // paint, so this flips without ever showing an unlit frame.
  const lit = calm || inView;

  const nodeTransition = calmTransition(
    { duration: durations.base, ease: EASE_OUT },
    calm,
  );

  const whenMissing = isPlaceholder(entry.when);
  const builtMissing = isPlaceholder(entry.built);

  return (
    <li
      ref={itemRef}
      className={`relative ${ENTRY_GRID} ${isLast ? "" : "pb-14 md:pb-20"}`}
    >
      {/* ---- node ------------------------------------------------------- */}
      <span
        aria-hidden
        className="relative col-start-1 row-start-1 flex h-6 w-6 items-center justify-center md:col-start-2"
      >
        {/* Soft halo, only once the entry has been reached. */}
        <motion.span
          className="absolute inset-0 rounded-full bg-accent-soft"
          initial={false}
          animate={{ opacity: lit ? 1 : 0 }}
          transition={nodeTransition}
        />
        {/* The dim outline that is always there. */}
        <span className="relative h-3.5 w-3.5 rounded-full border border-line bg-bg" />
        {/* The accent ring + core that arrive together. */}
        <motion.span
          className="absolute h-3.5 w-3.5 rounded-full border border-accent"
          initial={false}
          animate={{ opacity: lit ? 1 : 0 }}
          transition={nodeTransition}
        />
        <motion.span
          className="absolute h-1.5 w-1.5 rounded-full bg-accent"
          initial={false}
          animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.3 }}
          transition={nodeTransition}
        />
      </span>

      {/* ---- marker + era ---------------------------------------------- */}
      <motion.div
        className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:col-start-1 md:flex-col md:items-end md:gap-y-2.5 md:text-right"
        initial="hidden"
        animate={lit ? "shown" : "hidden"}
        variants={revealVariants(calm, 12)}
      >
        <span className="font-mono text-[0.6875rem] leading-6 tracking-[0.18em] text-faint">
          {entry.marker}
        </span>
        {whenMissing ? (
          <PlaceholderChip />
        ) : (
          <span className="font-mono text-[0.6875rem] leading-5 tracking-[0.14em] text-muted uppercase">
            {entry.when}
          </span>
        )}
      </motion.div>

      {/* ---- tool, why, built ------------------------------------------- */}
      <motion.div
        className="col-start-2 row-start-2 mt-3 min-w-0 md:col-start-3 md:row-start-1 md:mt-0"
        initial="hidden"
        animate={lit ? "shown" : "hidden"}
        variants={revealVariants(calm, 18)}
      >
        <h3 className="text-2xl font-semibold tracking-[-0.02em] text-text md:text-3xl">
          {entry.tool}
        </h3>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-x-8">
          <div className="min-w-0">
            <dt className="eyebrow">Why</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted">{entry.why}</dd>
          </div>
          <div className="min-w-0">
            <dt className="eyebrow">Built with it</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted">
              {builtMissing ? <PlaceholderChip variant="block" /> : entry.built}
            </dd>
          </div>
        </dl>
      </motion.div>
    </li>
  );
}
