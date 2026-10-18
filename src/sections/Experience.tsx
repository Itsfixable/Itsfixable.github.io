"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { experience, type ExperienceEntry } from "@/data/profile";
import { revealVariants, staggerParent, useReveal, viewportOnce } from "@/lib/motion";
import { sections } from "@/lib/sections";
import { useIsCalm } from "@/store/ui";
import { SectionRule } from "@/components/mondrian/SectionRule";
import { TechChip } from "@/components/TechChip";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";

const META = sections.find((section) => section.id === "experience");

const LAB_HEIGHT = "44rem";

/**
 * The lab pulls in supabase-js and TanStack Table, so it is split into its own
 * chunk and only requested once a visitor scrolls near it.
 */
const QueryLab = dynamic(
  () => import("@/interactives/query-lab/QueryLab").then((module) => module.QueryLab),
  {
    ssr: false,
    loading: () => <InteractiveLoading minHeight={LAB_HEIGHT} label="Loading the Query lab" />,
  },
);

function Entry({ entry }: { entry: ExperienceEntry }) {
  const calm = useIsCalm();
  const parent = staggerParent(calm);
  const child = revealVariants(calm, 16);

  return (
    <motion.li
      initial="hidden"
      whileInView="shown"
      viewport={viewportOnce}
      variants={parent}
      className="border-t border-line py-10 md:py-12"
    >
      <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <motion.p variants={child} className="font-mono text-xs tracking-[0.12em] text-faint uppercase lg:pt-2">
          {entry.when}
        </motion.p>

        <div className="min-w-0">
          <motion.h3 variants={child} className="text-2xl font-semibold tracking-tight text-text md:text-3xl">
            {entry.org}
          </motion.h3>
          <motion.p variants={child} className="mt-1 text-base text-muted">
            {entry.role}
          </motion.p>

          <motion.ul variants={child} className="mt-5 flex flex-col gap-2.5">
            {entry.highlights.map((highlight) => (
              <li key={highlight} className="flex items-baseline gap-3 text-base leading-relaxed text-text">
                <span aria-hidden="true" className="size-1.5 shrink-0 translate-y-[-0.1em] rounded-none bg-accent" />
                <span>{highlight}</span>
              </li>
            ))}
          </motion.ul>

          {entry.stack.length > 0 ? (
            <motion.ul variants={child} className="mt-5 flex flex-wrap gap-2">
              {entry.stack.map((item) => (
                <li key={item}>
                  <TechChip name={item} />
                </li>
              ))}
            </motion.ul>
          ) : null}
        </div>
      </div>

      {entry.demo === "query-lab" ? (
        <motion.div variants={child} className="mt-10">
          <LazyMount minHeight={LAB_HEIGHT} label="Query lab">
            <QueryLab />
          </LazyMount>
        </motion.div>
      ) : null}
    </motion.li>
  );
}

export function Experience() {
  const reveal = useReveal();

  return (
    <section id="experience" className="shell section-y">
      <SectionRule tone="red" />

      <motion.header {...reveal} className="mt-14 md:mt-20">
        <p className="eyebrow">{META?.label ?? "Experience"}</p>
        <h2 className="mt-4 text-headline font-medium text-text">Internship, competitions, hardware</h2>
      </motion.header>

      <ol className="mt-12 md:mt-16">
        {experience.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ol>
    </section>
  );
}
