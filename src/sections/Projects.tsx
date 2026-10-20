"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { projects, type Project } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { InteractiveLoading, LazyMount, usePreload } from "@/interactives/LazyMount";
import { Body, Bullets, Stack } from "@/components/mondrian/Content";
import { Columns, Fact, Pair, Row, SectionFrame, TryIt } from "@/components/mondrian/SectionFrame";
import { ProjectIntro } from "./_projects/ProjectIntro";

const META = sectionMeta("projects");

/** Measured heights of the playground at each breakpoint. */
const PLAYGROUND_RESERVE = "min-h-[58.25rem] sm:min-h-[40.75rem] xl:min-h-[38rem]";

/** Korean Quest's tracing and syllable builder, fetched as you scroll near. */
const loadHangulPlayground = () =>
  import("@/interactives/hangul/HangulPlayground").then((module) => module.HangulPlayground);
const HangulPlayground = dynamic(loadHangulPlayground, {
  ssr: false,
  loading: () => <InteractiveLoading reserve={PLAYGROUND_RESERVE} label="Loading Korean Quest" />,
});

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
  usePreload(loadHangulPlayground);
  const [first] = listed;
  if (!first) return null;

  return (
    <SectionFrame
      id="projects"
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

          <Row label="Details">
            <Columns>
              <Fact label="Year" index={0}>
                {project.year}
              </Fact>
              <Fact label="Role" index={1}>
                {project.role}
              </Fact>
              <Fact label="Status" index={2}>
                {STATUS[project.status]}
              </Fact>
              {project.recognition ? (
                <Fact label="Recognition" index={3}>
                  {project.recognition}
                </Fact>
              ) : null}
            </Columns>
          </Row>

          <Row label="What it is">
            <Pair>
              <Body>{project.blurb}</Body>
              <Bullets items={project.highlights} />
            </Pair>
          </Row>

          {project.playable === "hangul" ? (
            <Row
              label="Try it"
              framed
              aside={
                <TryIt title="Learn some Hangul">
                  Trace a letter and Korean Quest&rsquo;s own grader scores your shape, stroke order and
                  direction. Or build syllable blocks from a consonant, a vowel and an optional final
                  consonant.
                </TryIt>
              }
            >
              <LazyMount reserve={PLAYGROUND_RESERVE} label="Learn some Hangul">
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
