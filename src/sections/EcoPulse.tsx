"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ecoPulse, projects } from "@/data/profile";
import { revealVariants, staggerParent, viewportOnce } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";
import { FuelChart } from "./_ecopulse/FuelChart";
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
 * The EcoPulse case study: Problem -> Approach -> Result, with the headline
 * reduction as the one loud thing in the section and a hand-rolled SVG chart
 * underneath it.
 *
 * Every string comes from `src/data/profile.ts`.
 */

const project = projects.find((p) => p.id === "ecopulse") ?? null;

/** The two setup beats. The third beat (Result) gets the metric treatment. */
const setupBeats = [ecoPulse.problem, ecoPulse.approach] as const;

const meta: { term: string; value: string }[] = [
  { term: "Event", value: ecoPulse.event },
  { term: "Venue", value: ecoPulse.venue },
  { term: "Year", value: project?.year ?? "" },
  { term: "Role", value: project?.role ?? "" },
].filter((row) => row.value.length > 0);

/** `https://host/path` -> `host/path`, so the link shows where it goes. */
const demoHost = ecoPulse.demo.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function EcoPulse() {
  const calm = useIsCalm();
  const parent = staggerParent(calm);
  const child = revealVariants(calm);

  return (
    <section id="ecopulse" className="relative">
      <div className="shell">
        <hr className="hairline" />
      </div>

      <div className="shell section-y">
        {/* ------------------------------------------------- masthead */}
        <motion.header
          initial="hidden"
          whileInView="shown"
          viewport={viewportOnce}
          variants={parent}
          className="grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <motion.div variants={child}>
            <p className="eyebrow">Case study</p>
            <h2 className="mt-5 text-headline font-semibold text-text">{ecoPulse.project}</h2>
            {project ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl md:leading-relaxed">
                {project.tagline}
              </p>
            ) : null}
          </motion.div>

          <motion.div variants={child} className="lg:pb-2">
            <a
              href={ecoPulse.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-full items-center gap-3 rounded-full border border-line bg-surface px-5 py-3 text-sm font-medium text-text transition-colors hover:border-faint hover:bg-surface-2 sm:px-6"
            >
              <span className="whitespace-nowrap">Live demo</span>
              <span className="sr-only">(opens in a new tab)</span>
              <span className="truncate font-mono text-xs text-faint transition-colors group-hover:text-muted">
                {demoHost}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-text"
              >
                <path
                  d="M4 12 12 4M6 4h6v6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </a>
          </motion.div>
        </motion.header>

        {/* ------------------------------------------------- credits */}
        <motion.dl
          initial="hidden"
          whileInView="shown"
          viewport={viewportOnce}
          variants={parent}
          className="mt-12 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-line pt-8 sm:grid-cols-4"
        >
          {meta.map((row) => (
            <motion.div key={row.term} variants={child}>
              <dt className="eyebrow">{row.term}</dt>
              <dd className="mt-2 text-sm text-text sm:text-base">{row.value}</dd>
            </motion.div>
          ))}
        </motion.dl>

        {/* ------------------------------------------------- narrative */}
        <motion.ol
          initial="hidden"
          whileInView="shown"
          viewport={viewportOnce}
          variants={parent}
          className="mt-20 space-y-16 md:mt-28 md:space-y-24"
        >
          {setupBeats.map((beat, index) => (
            <motion.li
              key={beat.title}
              variants={child}
              className="grid gap-x-10 gap-y-5 md:grid-cols-[6rem_minmax(0,1fr)]"
            >
              <div className="flex items-center gap-4 md:block">
                <span className="font-mono text-sm tabular-nums text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="hairline block w-full md:mt-5" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-text md:text-3xl">
                  {beat.title}
                </h3>
                <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted md:text-xl md:leading-[1.65]">
                  {beat.body}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>

        {/* ------------------------------------------------- the result */}
        <motion.div
          initial="hidden"
          whileInView="shown"
          viewport={viewportOnce}
          variants={parent}
          className="card mt-16 md:mt-24"
        >
          <div className="grid gap-x-16 gap-y-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:p-14">
            <motion.div variants={child}>
              <p className="eyebrow">Headline result</p>
              <MetricCounter
                value={ecoPulse.headlineMetric.value}
                unit={ecoPulse.headlineMetric.unit}
                label={ecoPulse.headlineMetric.label}
                className="mt-6 text-display font-semibold text-accent"
              />
              <p className="mt-4 text-xl font-medium tracking-tight text-text md:text-2xl">
                {ecoPulse.headlineMetric.label}
              </p>
              <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-faint">
                {ecoPulse.headlineMetric.caption}
              </p>
            </motion.div>

            <motion.div variants={child} className="lg:border-l lg:border-line lg:pl-16">
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm tabular-nums text-faint">
                  {String(setupBeats.length + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="hairline block w-full" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-text md:text-3xl">
                {ecoPulse.result.title}
              </h3>
              <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
                {ecoPulse.result.body}
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* ------------------------------------------------- the chart */}
        <motion.div
          initial="hidden"
          whileInView="shown"
          viewport={viewportOnce}
          variants={child}
          className="mt-16 md:mt-24"
        >
          <FuelChart />
        </motion.div>

        {/* ------------------------------------------------- the game */}
        <div className="mt-16 md:mt-24">
          <LazyMount minHeight={GAME_HEIGHT} label="Can you match the solver?">
            <BeatTheSolver />
          </LazyMount>
        </div>

        {/* ------------------------------------------------- stack */}
        {project && project.stack.length > 0 ? (
          <motion.div
            initial="hidden"
            whileInView="shown"
            viewport={viewportOnce}
            variants={parent}
            className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-8"
          >
            <motion.p variants={child} className="eyebrow">
              Stack
            </motion.p>
            <ul className="flex flex-wrap gap-2">
              {project.stack.map((item) => (
                <motion.li
                  key={item}
                  variants={child}
                  className="rounded-full border border-line bg-surface-2 px-3 py-1 font-mono text-xs text-muted"
                >
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
