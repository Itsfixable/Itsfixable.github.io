"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { projects } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";
import { Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { ProjectCard } from "./_projects/ProjectCard";

const META = sectionMeta("projects");

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
 * Projects without a case study of their own (EcoPulse has one): what it is,
 * then try it. Today that is Korean Quest.
 */
const listed = projects.filter((project) => !project.caseStudy);

export function Projects() {
  return (
    <SectionFrame id="projects" entrance="iris" railLabel="Project" title={META.title}>
      {listed.map((project, index) => (
        <Fragment key={project.id}>
          <Row label="Overview" flush>
            <ProjectCard project={project} index={index} total={listed.length} variant="cell" showName={false} />
          </Row>
          {project.playable === "hangul" ? (
            <Row label="Try it" flush>
              <LazyMount minHeight={PLAYGROUND_HEIGHT} label="Learn some Hangul">
                <HangulPlayground />
              </LazyMount>
            </Row>
          ) : null}
        </Fragment>
      ))}
    </SectionFrame>
  );
}
