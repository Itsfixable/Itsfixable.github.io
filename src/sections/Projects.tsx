"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { projects } from "@/data/profile";
import { useReveal } from "@/lib/motion";
import { sections } from "@/lib/sections";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";
import { SectionRule } from "@/components/mondrian/SectionRule";
import { ProjectCard } from "./_projects/ProjectCard";

const META = sections.find((section) => section.id === "projects");

const PLAYGROUND_HEIGHT = "36rem";

/** Korean Quest's tracing and syllable builder, fetched as you scroll near. */
const HangulPlayground = dynamic(
  () => import("@/interactives/hangul/HangulPlayground").then((module) => module.HangulPlayground),
  {
    ssr: false,
    loading: () => <InteractiveLoading minHeight={PLAYGROUND_HEIGHT} label="Loading Korean Quest" />,
  },
);

/**
 * Projects without a case study of their own (EcoPulse has one), each shown
 * as its card beside its interactive. Today that is Korean Quest.
 */
const listed = projects.filter((project) => !project.caseStudy);

export function Projects() {
  const reveal = useReveal({ amount: 0.4 });

  return (
    <section id="projects" className="shell section-y">
      <SectionRule tone="yellow" />

      <motion.header {...reveal} className="mt-14 md:mt-20">
        <p className="eyebrow">Project</p>
        <h2 className="mt-4 text-headline font-semibold text-text">{META?.title ?? "Projects"}</h2>
      </motion.header>

      <div className="mt-12 flex flex-col gap-8 md:mt-16">
        {listed.map((project, index) => (
          <div
            key={project.id}
            className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8"
          >
            <ol className="contents">
              <ProjectCard project={project} index={index} total={listed.length} variant="stack" showName={false} />
            </ol>
            {project.playable === "hangul" ? (
              <LazyMount minHeight={PLAYGROUND_HEIGHT} label="Learn some Hangul">
                <HangulPlayground />
              </LazyMount>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
