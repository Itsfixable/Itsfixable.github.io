"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { timeline } from "@/data/profile";
import { useReveal, springs } from "@/lib/motion";
import { sections } from "@/lib/sections";
import { useIsCalm } from "@/store/ui";
import { SPINE_TOP, SPINE_X } from "./_timeline/layout";
import { TimelineEntryItem } from "./_timeline/TimelineEntryItem";

/**
 * The learning path: which tool, why it was worth learning, what it shipped.
 *
 * Two pieces of motion, both scroll-driven and both neutralised in calm mode:
 *   1. the spine draws itself from the first node downward as the list passes
 *      through the viewport (scroll-linked scaleY, smoothed by springs.scrub)
 *   2. each node lights from a dim outline to the accent as its entry arrives
 *      (once: true — the accent reads as "progress reached here")
 *
 * In calm mode the spine is rendered fully drawn with no scroll binding at all
 * and every node starts lit, so the section says exactly the same thing with
 * none of the theatre.
 */

const meta = sections.find((section) => section.id === "timeline");

export function Timeline() {
  const listRef = useRef<HTMLOListElement>(null);
  const calm = useIsCalm();
  const headerReveal = useReveal();

  // Target the list, not the section: the section's bottom padding would make
  // the line finish a screen after the last entry.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start center", "end end"],
  });
  const drawn = useSpring(scrollYProgress, springs.scrub);

  // Calm mode: a plain number, so nothing is bound to scroll position.
  const fillStyle = calm
    ? { scaleY: 1, transformOrigin: "top" as const }
    : { scaleY: drawn, transformOrigin: "top" as const };

  return (
    <section id="timeline" aria-labelledby="timeline-heading" className="shell section-y">
      <motion.header className="max-w-2xl" {...headerReveal}>
        <p className="eyebrow">{meta?.label ?? "Timeline"}</p>
        <h2
          id="timeline-heading"
          className="mt-4 text-headline font-semibold text-text"
        >
          {meta?.title ?? "Learning timeline"}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted">
          {timeline.length} tools, in the order they were picked up.
        </p>
      </motion.header>

      {/* role="list" is redundant in spec but Safari drops list semantics
          once Tailwind's preflight removes the marker. */}
      <ol ref={listRef} role="list" className="relative mt-16 md:mt-24">
        {/* Decorative spine. The track is always fully visible; the accent
            fill is what the scroll draws. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute ${SPINE_X} ${SPINE_TOP} bottom-0 w-px -translate-x-1/2`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-line)_0%,var(--color-line)_88%,transparent_100%)]" />
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-accent-dim),var(--color-accent))]"
            style={fillStyle}
          />
        </div>

        {timeline.map((entry, index) => (
          <TimelineEntryItem
            key={entry.id}
            entry={entry}
            isLast={index === timeline.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}
