"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { experience, type ExperienceEntry } from "@/data/profile";
import { Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { Bullets, Stack } from "@/components/mondrian/Content";
import { InteractiveLoading, LazyMount } from "@/interactives/LazyMount";

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
  return (
    <SectionFrame id="experience" entrance="split" title="Internship, competitions, hardware">
      {experience.map((entry) => (
        <Fragment key={entry.id}>
          <Row label={entry.when}>
            <EntryBody entry={entry} />
          </Row>
          {entry.demo === "query-lab" ? (
            <Row label="Try it" flush>
              <LazyMount minHeight={LAB_HEIGHT} label="Query lab">
                <QueryLab />
              </LazyMount>
            </Row>
          ) : null}
        </Fragment>
      ))}
    </SectionFrame>
  );
}
