"use client";

import type { ReactNode } from "react";
import { scrollToSection } from "@/lib/scroll";
import { nextSection, sectionMeta, type SectionId } from "@/lib/sections";
import { Cell, Grid, Swatch, type Entrance } from "./Grid";

/**
 * The one template every section uses, so the page reads as a single
 * organised painting rather than six arrangements:
 *
 *   ┌─────────────┬──────────────────────────────┐
 *   │ ■ 02        │ Section title                │  header row
 *   │ Experience  │ intro / links                │
 *   ├─────────────┼──────────────────────────────┤
 *   │ Row label   │ row content                  │  ...rows
 *   ├─────────────┼──────────────────────────────┤
 *   │ Next        │ ■ 03  EcoPulse            ↓  │  the way on
 *   └─────────────┴──────────────────────────────┘
 *
 * The left rail is the same width everywhere; the section's one colour is
 * its square, used again on the nav and as the "Next" hover fill. On phones
 * the rail labels sit above their content as thin header strips.
 */

const HOVER_FILL = {
  red: "hover:bg-m-red hover:text-white focus-visible:bg-m-red focus-visible:text-white",
  blue: "hover:bg-m-blue hover:text-white focus-visible:bg-m-blue focus-visible:text-white",
  yellow: "hover:bg-m-yellow focus-visible:bg-m-yellow",
} as const;

type SectionFrameProps = {
  id: SectionId;
  entrance: Entrance;
  /** Overrides the nav label in the rail (e.g. "Case study"). */
  railLabel?: string;
  title: ReactNode;
  /** Shown under the title in the header cell. */
  intro?: ReactNode;
  children: ReactNode;
};

export function SectionFrame({ id, entrance, railLabel, title, intro, children }: SectionFrameProps) {
  const meta = sectionMeta(id);
  const next = nextSection(id);

  return (
    <section id={id} className="shell">
      <Grid joined entrance={entrance} className="grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Header */}
        <Cell order={0} className="flex items-center gap-3 px-5 py-4 lg:flex-col lg:items-start lg:justify-end lg:gap-2 lg:p-8">
          {meta.tone ? <Swatch tone={meta.tone} className="lg:size-4" /> : null}
          <span className="font-mono text-xs tabular-nums text-faint">{meta.number}</span>
          <span className="eyebrow !text-ink">{railLabel ?? meta.label}</span>
        </Cell>
        <Cell order={1} className="p-5 sm:p-8 lg:p-10">
          <h2 className="text-headline font-semibold">{title}</h2>
          {intro ? <div className="mt-5">{intro}</div> : null}
        </Cell>

        {children}

        {/* The way on */}
        <Cell className="hidden px-8 py-6 lg:flex lg:items-center">
          <span className="eyebrow">{next ? "Next" : "End"}</span>
        </Cell>
        <Cell>
          <button
            type="button"
            onClick={() => scrollToSection(next ? next.id : "hero")}
            className={`group flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-200 sm:px-8 ${
              HOVER_FILL[next?.tone ?? "yellow"]
            }`}
          >
            <span className="flex items-center gap-3">
              {next?.tone ? <Swatch tone={next.tone} className="group-hover:bg-current" /> : null}
              {next ? <span className="font-mono text-xs tabular-nums opacity-70">{next.number}</span> : null}
              <span className="text-lg font-semibold">{next ? next.label : "Back to the top"}</span>
            </span>
            <span
              aria-hidden="true"
              className="text-lg transition-transform duration-200 group-hover:translate-y-0.5 calm:group-hover:translate-y-0"
            >
              {next ? "↓" : "↑"}
            </span>
          </button>
        </Cell>
      </Grid>
    </section>
  );
}

/** One label + content row inside a section. `flush` drops the content padding (for interactives). */
export function Row({ label, children, flush = false }: { label: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <>
      <Cell className="px-5 py-3 lg:p-8">
        <div className="eyebrow">{label}</div>
      </Cell>
      <Cell className={flush ? "" : "p-5 sm:p-8"}>{children}</Cell>
    </>
  );
}
