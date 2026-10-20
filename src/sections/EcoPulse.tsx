"use client";

import dynamic from "next/dynamic";
import { ecoPulse, projects } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { Body, Stack } from "@/components/mondrian/Content";
import { Columns, Fact, Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { MetricCounter } from "./_ecopulse/MetricCounter";
import { ProjectIntro } from "./_projects/ProjectIntro";
import { InteractiveLoading, LazyMount, usePreload } from "@/interactives/LazyMount";

/** Measured heights of the game at each breakpoint. */
const GAME_RESERVE = "min-h-[83rem] md:min-h-[71rem] lg:min-h-[75rem]";

/** Its own chunk, fetched only when a visitor scrolls near it. */
const loadBeatTheSolver = () =>
  import("@/interactives/beat-the-solver/BeatTheSolver").then((module) => module.BeatTheSolver);
const BeatTheSolver = dynamic(loadBeatTheSolver, {
  ssr: false,
  loading: () => <InteractiveLoading reserve={GAME_RESERVE} label="Loading the game" />,
});

/**
 * The EcoPulse case study, read top to bottom as a story: what it is, the
 * problem, the approach, the result, then play it yourself.
 *
 * Every string comes from `src/data/profile.ts`.
 */

const project = projects.find((p) => p.id === "ecopulse") ?? null;

const meta: { term: string; value: string }[] = [
  { term: "Event", value: ecoPulse.event },
  { term: "Venue", value: ecoPulse.venue },
  { term: "Year", value: project?.year ?? "" },
  { term: "Role", value: project?.role ?? "" },
].filter((row) => row.value.length > 0);

const META = sectionMeta("ecopulse");

export function EcoPulse() {
  usePreload(loadBeatTheSolver);

  return (
    <SectionFrame
      id="ecopulse"
      railLabel="Case study"
      title={ecoPulse.project}
      intro={project ? <ProjectIntro project={project} tone={META.tone ?? "red"} /> : null}
    >
      <Row label="Details">
        <Columns>
          {meta.map((row, index) => (
            <Fact key={row.term} label={row.term} index={index}>
              {row.value}
            </Fact>
          ))}
        </Columns>
      </Row>

      <Row label={`01 · ${ecoPulse.problem.title}`}>
        <Body>{ecoPulse.problem.body}</Body>
      </Row>
      <Row label={`02 · ${ecoPulse.approach.title}`}>
        <Body>{ecoPulse.approach.body}</Body>
      </Row>
      <Row label={`03 · ${ecoPulse.result.title}`}>
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-12">
          <div>
            <MetricCounter
              value={ecoPulse.headlineMetric.value}
              unit={ecoPulse.headlineMetric.unit}
              label={ecoPulse.headlineMetric.label}
              className="text-display font-semibold text-m-red"
            />
            <p className="mt-1 text-lg font-medium">{ecoPulse.headlineMetric.label}</p>
          </div>
          <div>
            <Body>{ecoPulse.result.body}</Body>
            <p className="mt-3 text-sm text-faint">{ecoPulse.headlineMetric.caption}</p>
          </div>
        </div>
      </Row>

      <Row label="Try it" framed>
        <LazyMount reserve={GAME_RESERVE} label="Can you match the solver?">
          <BeatTheSolver />
        </LazyMount>
      </Row>

      {project && project.stack.length > 0 ? (
        <Row label="Stack">
          <Stack items={project.stack} />
        </Row>
      ) : null}
    </SectionFrame>
  );
}
