"use client";

import dynamic from "next/dynamic";
import { ecoPulse, projects } from "@/data/profile";
import { Cell } from "@/components/mondrian/Grid";
import { Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { TechChip } from "@/components/TechChip";
import { MetricCounter } from "./_ecopulse/MetricCounter";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";

const GAME_HEIGHT = "34rem";

/** Its own chunk, fetched only when a visitor scrolls near it. */
const BeatTheSolver = dynamic(
  () => import("@/interactives/beat-the-solver/BeatTheSolver").then((module) => module.BeatTheSolver),
  {
    ssr: false,
    loading: () => <InteractiveLoading minHeight={GAME_HEIGHT} label="Loading the game" />,
  },
);

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

/** `https://host/path` -> `host/path`, so the link shows where it goes. */
const demoHost = ecoPulse.demo.replace(/^https?:\/\//, "").replace(/\/$/, "");

function Body({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[60ch] text-base leading-relaxed text-muted md:text-lg">{children}</p>;
}

export function EcoPulse() {
  return (
    <SectionFrame
      id="ecopulse"
      entrance="wipe"
      railLabel="Case study"
      title={ecoPulse.project}
      intro={
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          {project ? <p className="max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{project.tagline}</p> : null}
          <a
            href={ecoPulse.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full shrink-0 items-center gap-3 self-start border-2 border-ink bg-surface px-5 py-3 text-sm font-medium transition-colors duration-200 hover:bg-m-red hover:text-white lg:self-auto"
          >
            <span className="whitespace-nowrap">Live demo</span>
            <span className="sr-only">(opens in a new tab)</span>
            <span className="truncate font-mono text-xs text-faint group-hover:text-white/80">{demoHost}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      }
    >
      <Row label="Details" flush>
        <div className="mondrian-grid h-full grid-cols-2 border-0 lg:grid-cols-4">
          {meta.map((row) => (
            <Cell key={row.term} className="p-5 sm:p-6">
              <dl>
                <dt className="eyebrow">{row.term}</dt>
                <dd className="mt-2 text-sm sm:text-base">{row.value}</dd>
              </dl>
            </Cell>
          ))}
        </div>
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

      <Row label="Try it" flush>
        <LazyMount minHeight={GAME_HEIGHT} label="Can you match the solver?">
          <BeatTheSolver />
        </LazyMount>
      </Row>

      {project && project.stack.length > 0 ? (
        <Row label="Stack">
          <ul className="flex flex-wrap gap-2">
            {project.stack.map((item) => (
              <li key={item}>
                <TechChip name={item} />
              </li>
            ))}
          </ul>
        </Row>
      ) : null}
    </SectionFrame>
  );
}
