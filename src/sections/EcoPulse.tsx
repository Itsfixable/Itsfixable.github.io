"use client";

import dynamic from "next/dynamic";
import { ecoPulse, projects } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { Body, Stack } from "@/components/mondrian/Content";
import { Columns, Fact, Pair, Row, SectionFrame, TryIt } from "@/components/mondrian/SectionFrame";
import { REQUIRED } from "@/interactives/beat-the-solver/rules";
import { MetricCounter } from "./_ecopulse/MetricCounter";
import { ProjectIntro } from "./_projects/ProjectIntro";
import { InteractiveLoading, LazyMount, usePreload } from "@/interactives/LazyMount";

/** Measured heights of the game at each breakpoint. */
const GAME_RESERVE = "min-h-[67.25rem] sm:min-h-[65.625rem] md:min-h-[62.75rem] lg:min-h-[66.75rem]";

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

      <Row label="The brief">
        <Pair>
          <div>
            <h3 className="eyebrow !text-ink">01 · {ecoPulse.problem.title}</h3>
            <div className="mt-3">
              <Body>{ecoPulse.problem.body}</Body>
            </div>
          </div>
          <div>
            <h3 className="eyebrow !text-ink">02 · {ecoPulse.approach.title}</h3>
            <div className="mt-3">
              <Body>{ecoPulse.approach.body}</Body>
            </div>
          </div>
        </Pair>
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

      <Row
        label="Try it"
        framed
        aside={
          <TryIt title="Can you match the solver?">
            You run Ta&rsquo;ū for a day. Run desalination for at least {REQUIRED.desal} hours and the ice
            plant for {REQUIRED.ice}: click or drag across the hours. Whatever you schedule runs on sun and
            wind first, then the battery, then the diesel generator. It&rsquo;s the same forecast and the
            same dispatch code as the real EcoPulse.
          </TryIt>
        }
      >
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
