"use client";

import dynamic from "next/dynamic";
import { ecoPulse, projects } from "@/data/profile";
import { Cell, Grid } from "@/components/mondrian/Grid";
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
 * The EcoPulse case study as one Mondrian: the headline reduction is the big
 * red block, Problem / Approach / Result fill the white fields beside and
 * below it, and the playable version of the dispatcher spans the full width.
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

function Beat({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <>
      <p className="font-mono text-sm tabular-nums text-faint">{String(number).padStart(2, "0")}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h3>
      <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted md:text-lg">{body}</p>
    </>
  );
}

export function EcoPulse() {
  return (
    <section id="ecopulse" className="shell">
      <Grid joined className="grid-cols-2 lg:grid-cols-4">
        {/* Label + title */}
        <Cell tone="blue" order={0} className="col-span-2 flex items-end p-5 sm:p-6 lg:col-span-1 lg:p-8">
          <p className="eyebrow !text-white">Case study</p>
        </Cell>
        <Cell className="col-span-2 flex flex-col gap-5 p-5 sm:p-8 lg:col-span-3 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div>
            <h2 className="text-headline font-semibold">{ecoPulse.project}</h2>
            {project ? (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{project.tagline}</p>
            ) : null}
          </div>
          <a
            href={ecoPulse.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full shrink-0 items-center gap-3 border-2 border-ink bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-m-yellow"
          >
            <span className="whitespace-nowrap">Live demo</span>
            <span className="sr-only">(opens in a new tab)</span>
            <span className="truncate font-mono text-xs text-faint group-hover:text-ink">{demoHost}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </Cell>

        {/* Credits */}
        {meta.map((row) => (
          <Cell key={row.term} className="p-5 sm:p-6">
            <dl>
              <dt className="eyebrow">{row.term}</dt>
              <dd className="mt-2 text-sm sm:text-base">{row.value}</dd>
            </dl>
          </Cell>
        ))}

        {/* The headline number: the red block */}
        <Cell tone="red" order={1} className="col-span-2 flex flex-col justify-end p-5 sm:p-8 lg:row-span-2 lg:p-10">
          <p className="eyebrow !text-white/85">Headline result</p>
          <MetricCounter
            value={ecoPulse.headlineMetric.value}
            unit={ecoPulse.headlineMetric.unit}
            label={ecoPulse.headlineMetric.label}
            className="mt-4 text-display font-semibold"
          />
          <p className="mt-2 text-xl font-medium md:text-2xl">{ecoPulse.headlineMetric.label}</p>
          <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-white/85">{ecoPulse.headlineMetric.caption}</p>
        </Cell>

        <Cell className="col-span-2 p-5 sm:p-8">
          <Beat number={1} title={ecoPulse.problem.title} body={ecoPulse.problem.body} />
        </Cell>
        <Cell className="col-span-2 p-5 sm:p-8">
          <Beat number={2} title={ecoPulse.approach.title} body={ecoPulse.approach.body} />
        </Cell>

        <Cell className="col-span-2 p-5 sm:p-8 lg:col-span-3">
          <Beat number={3} title={ecoPulse.result.title} body={ecoPulse.result.body} />
        </Cell>
        <Cell tone="yellow" order={2} className="hidden lg:block" />

        {/* The game, full width */}
        <Cell className="col-span-2 lg:col-span-4">
          <LazyMount minHeight={GAME_HEIGHT} label="Can you match the solver?">
            <BeatTheSolver />
          </LazyMount>
        </Cell>

        {/* Stack */}
        {project && project.stack.length > 0 ? (
          <>
            <Cell className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-3 p-5 sm:p-6 lg:col-span-3">
              <p className="eyebrow">Stack</p>
              <ul className="flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <li key={item}>
                    <TechChip name={item} />
                  </li>
                ))}
              </ul>
            </Cell>
            <Cell tone="black" order={3} className="hidden lg:block" />
          </>
        ) : null}
      </Grid>
    </section>
  );
}
