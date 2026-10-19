"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { experience, type ExperienceEntry } from "@/data/profile";
import { sections } from "@/lib/sections";
import { Cell, Grid, type Tone } from "@/components/mondrian/Grid";
import { TechChip } from "@/components/TechChip";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";

const META = sections.find((section) => section.id === "experience");

const LAB_HEIGHT = "44rem";

/**
 * The lab pulls in supabase-js and TanStack Table, so it is split into its own
 * chunk and only requested once a visitor scrolls near it.
 */
const QueryLab = dynamic(
  () => import("@/interactives/query-lab/QueryLab").then((module) => module.QueryLab),
  {
    ssr: false,
    loading: () => <InteractiveLoading minHeight={LAB_HEIGHT} label="Loading the Query lab" />,
  },
);

/** The internship's date block is blue; the hardware year is yellow. */
const DATE_TONE: Record<string, Tone> = { rox: "blue", hardware: "yellow" };

function Entry({ entry, order }: { entry: ExperienceEntry; order: number }) {
  const tone = DATE_TONE[entry.id] ?? "paper";

  return (
    <>
      <Cell tone={tone} order={order} className="p-5 sm:p-6 lg:p-8">
        <p className={`font-mono text-xs tracking-[0.12em] uppercase ${tone === "paper" ? "text-faint" : ""}`}>
          {entry.when}
        </p>
      </Cell>

      <Cell className="p-5 sm:p-6 lg:p-8">
        <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{entry.org}</h3>
        <p className="mt-1 text-base text-muted">{entry.role}</p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {entry.highlights.map((highlight) => (
            <li key={highlight} className="flex items-baseline gap-3 text-base leading-relaxed">
              <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-0.1em] bg-ink" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        {entry.stack.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {entry.stack.map((item) => (
              <li key={item}>
                <TechChip name={item} />
              </li>
            ))}
          </ul>
        ) : null}
      </Cell>

      {entry.demo === "query-lab" ? (
        <Cell className="lg:col-span-2">
          <LazyMount minHeight={LAB_HEIGHT} label="Query lab">
            <QueryLab />
          </LazyMount>
        </Cell>
      ) : null}
    </>
  );
}

export function Experience() {
  return (
    <section id="experience" className="shell">
      <Grid joined className="grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Cell tone="red" order={0} className="flex items-end p-5 sm:p-6 lg:p-8">
          <p className="eyebrow !text-white">{META?.label ?? "Experience"}</p>
        </Cell>
        <Cell className="p-5 sm:p-6 lg:p-8">
          <h2 className="text-headline font-medium">Internship, competitions, hardware</h2>
        </Cell>

        {experience.map((entry, index) => (
          <Fragment key={entry.id}>
            <Entry entry={entry} order={index + 1} />
          </Fragment>
        ))}
      </Grid>
    </section>
  );
}
