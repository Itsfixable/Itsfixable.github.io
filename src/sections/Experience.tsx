"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { experience, type ExperienceEntry } from "@/data/profile";
import { Row, SectionFrame, TryIt } from "@/components/mondrian/SectionFrame";
import { Bullets, Stack } from "@/components/mondrian/Content";
import { InteractiveLoading, LazyMount, usePreload } from "@/interactives/LazyMount";

/** Measured heights of the lab at each breakpoint (it stacks into one column when narrow). */
const LAB_RESERVE = "min-h-[86.5rem] sm:min-h-[83.5rem] lg:min-h-[48.25rem]";

/**
 * The lab pulls in supabase-js and TanStack Table, so it is split into its own
 * chunk and only requested once a visitor scrolls near it.
 */
const loadQueryLab = () => import("@/interactives/query-lab/QueryLab").then((module) => module.QueryLab);
const QueryLab = dynamic(loadQueryLab, {
  ssr: false,
  loading: () => <InteractiveLoading reserve={LAB_RESERVE} label="Loading the Query lab" />,
});

function EntryBody({ entry }: { entry: ExperienceEntry }) {
  return (
    <>
      <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{entry.org}</h3>
      <p className="mt-1 text-base text-muted">{entry.role}</p>

      <Bullets items={entry.highlights} className="mt-5" />
      <Stack items={entry.stack} className="mt-5" />
    </>
  );
}

export function Experience() {
  usePreload(loadQueryLab);

  return (
    <SectionFrame id="experience" title="Internship, competitions, hardware">
      {experience.map((entry) => (
        <Fragment key={entry.id}>
          <Row label={entry.when}>
            <EntryBody entry={entry} />
          </Row>
          {entry.demo === "query-lab" ? (
            <Row
              label="Try it"
              framed
              aside={
                <TryIt
                  title="Query lab"
                  badge={
                    <p className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3 py-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted uppercase">
                      <span aria-hidden="true" className="size-1.5 shrink-0 bg-accent" />
                      Live Supabase Postgres · fictional data
                    </p>
                  }
                >
                  The kind of table I built at Rox: search, filters and sorting run on the server, pages
                  stream in as you scroll, and TanStack Query caches every combination. Scroll, sort,
                  search, hover a row and open it, then watch &ldquo;Under the hood&rdquo;.
                </TryIt>
              }
            >
              <LazyMount reserve={LAB_RESERVE} label="Query lab">
                <QueryLab />
              </LazyMount>
            </Row>
          ) : null}
        </Fragment>
      ))}
    </SectionFrame>
  );
}
