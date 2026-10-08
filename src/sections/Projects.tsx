"use client";

import { motion } from "framer-motion";
import { projects } from "@/data/profile";
import { useReveal } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";
import { PinnedRail } from "./_projects/PinnedRail";
import { ProjectCard } from "./_projects/ProjectCard";
import { useCanPin } from "./_projects/usePinning";

/**
 * Projects, as a pinned horizontal rail — on a roomy viewport, in wild mode.
 *
 * Everywhere else (below `md`, and in calm mode at every width) the exact same
 * cards render as a plain vertical column in document flow: no sticky, no tall
 * spacer, no horizontal transform. `pinned` starts `false`, so the server
 * render, the first client render and the no-JS render all agree on the safe
 * stacked layout, and the one flag drives both the height and the motion —
 * they can never disagree and leave an empty gap behind.
 */
export function Projects() {
  const calm = useIsCalm();
  const canPin = useCanPin();
  const pinned = canPin && !calm;

  const reveal = useReveal({ amount: 0.4 });
  const total = projects.length;

  return (
    <section id="projects" className="relative pb-24 md:pb-34">
      <motion.header {...reveal} className="shell pt-24 pb-10 md:pt-34 md:pb-14">
        <p className="eyebrow">Selected work</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 className="text-headline font-semibold text-text">Projects</h2>
          <p className="font-mono text-xs tracking-[0.14em] text-faint uppercase">
            {String(total).padStart(2, "0")} projects
            {pinned ? " · scroll to pan" : ""}
          </p>
        </div>
        <hr className="hairline mt-8" />
      </motion.header>

      {pinned ? (
        <PinnedRail projects={projects} />
      ) : (
        <ol className="shell flex flex-col gap-5">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              total={total}
              variant="stack"
            />
          ))}
        </ol>
      )}
    </section>
  );
}
