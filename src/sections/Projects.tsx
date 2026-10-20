"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { projects, type Project } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";
import { Body, Bullets, Stack } from "@/components/mondrian/Content";
import { Columns, Fact, Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { ProjectIntro } from "./_projects/ProjectIntro";

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

const STATUS: Record<Project["status"], string> = {
  live: "Live",
  "in-progress": "In progress",
  archived: "Archived",
  physical: "Physical build",
};

/**
 * Projects without a case study of their own (EcoPulse has one), laid out in
 * the same rows as the case study: details, what it is, try it, stack.
 * Today that is Korean Quest.
 */
const listed = projects.filter((project) => !project.caseStudy);

export function Projects() {
  const [first] = listed;
  if (!first) return null;

  return (
    <SectionFrame
      id="projects"
      entrance="iris"
      railLabel="Project"
      title={listed.length === 1 ? first.name : META.title}
      intro={listed.length === 1 ? <ProjectIntro project={first} tone={META.tone ?? "yellow"} /> : null}
    >
      {listed.map((project) => (
        <Fragment key={project.id}>
          {listed.length > 1 ? (
            <Row label="Project">
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{project.name}</h3>
              <div className="mt-4">
                <ProjectIntro project={project} tone={META.tone ?? "yellow"} />
              </div>
            </Row>
          ) : null}

          <Row label="Details" flush>
            <Columns>
              <Fact label="Year">{project.year}</Fact>
              <Fact label="Role">{project.role}</Fact>
              <Fact label="Status">{STATUS[project.status]}</Fact>
              {project.recognition ? <Fact label="Recognition">{project.recognition}</Fact> : null}
            </Columns>
          </Row>

          <Row label="What it is">
            <Body>{project.blurb}</Body>
            <Bullets items={project.highlights} className="mt-5" />
          </Row>

          {project.playable === "hangul" ? (
            <Row label="Try it" flush>
              <LazyMount minHeight={PLAYGROUND_HEIGHT} label="Learn some Hangul">
                <HangulPlayground />
              </LazyMount>
            </Row>
          ) : null}

          {project.stack.length > 0 ? (
            <Row label="Stack">
              <Stack items={project.stack} />
            </Row>
          ) : null}
        </Fragment>
      ))}
    </SectionFrame>
  );
}
