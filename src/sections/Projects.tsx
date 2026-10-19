"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { projects } from "@/data/profile";
import { sections } from "@/lib/sections";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";
import { Cell, Grid } from "@/components/mondrian/Grid";
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
 * Projects without a case study of their own (EcoPulse has one): the card's
 * details in one cell, its interactive in the big cell beside it. Today that
 * is Korean Quest.
 */
const listed = projects.filter((project) => !project.caseStudy);

export function Projects() {
  return (
    <section id="projects" className="shell">
      <Grid joined className="grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)_5rem]">
        <Cell tone="yellow" order={0} className="flex items-end p-5 sm:p-6 lg:p-8">
          <p className="eyebrow !text-ink">Project</p>
        </Cell>
        <Cell className="p-5 sm:p-6 lg:p-8">
          <h2 className="text-headline font-semibold">{META?.title ?? "Projects"}</h2>
        </Cell>
        <Cell tone="black" order={1} className="hidden lg:block" />

        {listed.map((project, index) => (
          <Fragment key={project.id}>
            <Cell>
              <ProjectCard project={project} index={index} total={listed.length} variant="cell" showName={false} />
            </Cell>
            {project.playable === "hangul" ? (
              <Cell className="lg:col-span-2">
                <LazyMount minHeight={PLAYGROUND_HEIGHT} label="Learn some Hangul">
                  <HangulPlayground />
                </LazyMount>
              </Cell>
            ) : (
              <Cell tone="red" order={index + 2} className="hidden lg:col-span-2 lg:block" />
            )}
          </Fragment>
        ))}
      </Grid>
    </section>
  );
}
