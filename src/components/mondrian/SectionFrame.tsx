"use client";

import type { ReactNode } from "react";
import { scrollToSection } from "@/lib/scroll";
import { nextSection, sectionMeta, type SectionId } from "@/lib/sections";
import { Block, Drawing, Frame, Line, Rise } from "./Drawn";
import { HOVER_FILL } from "./tone";

/**
 * The one template every section uses. The grid is still there, but only
 * fragments of its lines are drawn; everything else sits on open paper.
 *
 *   ██━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━   a line across, a colour block
 *   02          ┃ Section title                where it starts, and a short
 *   Experience  ┃ intro                         line dropped from it
 *
 *   Row label     row content                  ...rows, on open paper
 *
 *   Try it      ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓   only things you can play with
 *   Its name    ┃ interactive              ┃   get a full frame; its name and
 *   how to play ┃                          ┃   how to play sit in the label
 *               ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛   column and stay in view
 *
 * Sections run straight into each other (the next one is a scroll away); only
 * the last ends with a way back to the top.
 *
 * Every section, and the hero, shares the same two columns: a 14rem label
 * column and the content column. On phones they stack. On wide screens each
 * row's label sticks below the nav while its row scrolls past, so the label
 * column is never an empty strip beside a tall row.
 */

/** The two columns every section (and the hero) shares. */
export const COLUMNS = "grid grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-12";

/** Where the dropped vertical line sits: centred in the gap between the columns. */
export const DROP_X = "left-[calc(14rem+1.5rem-var(--rule)/2)]";

type SectionFrameProps = {
  id: SectionId;
  /** Overrides the nav label beside the colour block (e.g. "Case study"). */
  railLabel?: string;
  title: ReactNode;
  /** Shown under the title. */
  intro?: ReactNode;
  children: ReactNode;
};

export function SectionFrame({ id, railLabel, title, intro, children }: SectionFrameProps) {
  const meta = sectionMeta(id);
  const isLast = nextSection(id) === null;

  return (
    <section id={id} className="shell pt-20 md:pt-28">
      {/* The opening: line across, T dropped from it, colour into the corner. */}
      <Drawing className={`relative gap-y-6 pt-[var(--rule)] ${COLUMNS}`}>
        <Line duration={0.9} className="absolute inset-x-0 top-0 h-[var(--rule)]" />
        <Line axis="y" at={0.5} duration={0.6} className={`absolute top-0 bottom-0 hidden w-[var(--rule)] lg:block ${DROP_X}`} />

        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-4">
          {meta.tone ? <Block tone={meta.tone} at={0.65} className="size-8 shrink-0 lg:size-12" /> : null}
          <Rise at={0.3} className="flex items-baseline gap-3 lg:flex-col lg:gap-1.5">
            <span className="font-mono text-xs tabular-nums text-faint">{meta.number}</span>
            <span className="eyebrow !text-ink">{railLabel ?? meta.label}</span>
          </Rise>
        </div>

        <div className="lg:pt-8 lg:pb-2">
          <Rise at={0.35}>
            <h2 className="text-headline font-semibold">{title}</h2>
          </Rise>
          {intro ? (
            <Rise at={0.45} className="mt-5">
              {intro}
            </Rise>
          ) : null}
        </div>
      </Drawing>

      <div className="mt-12 flex flex-col gap-12 md:mt-16 md:gap-16">{children}</div>

      {isLast ? (
        <div className={`mt-10 md:mt-14 ${COLUMNS}`}>
          <div className="hidden lg:block" />
          <div>
            <button
              type="button"
              onClick={() => scrollToSection("hero")}
              className={`group inline-flex items-center gap-3 border-2 border-ink bg-surface px-5 py-3 text-sm font-medium transition-colors duration-200 ${HOVER_FILL.black}`}
            >
              <span>Back to the top</span>
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:-translate-y-0.5 calm:group-hover:translate-y-0"
              >
                ↑
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type RowProps = {
  label: ReactNode;
  /** Shown under the label, in the label column (e.g. how to use an interactive). */
  aside?: ReactNode;
  children: ReactNode;
  /** Puts the content in a drawn frame; for interactives only. */
  framed?: boolean;
};

/** One labelled row inside a section. */
export function Row({ label, aside, children, framed = false }: RowProps) {
  return (
    <Drawing className={`gap-y-4 ${COLUMNS}`}>
      <Rise className="lg:sticky lg:top-24 lg:self-start lg:pt-1">
        <div className="eyebrow">{label}</div>
        {aside ? <div className="mt-3 max-w-prose">{aside}</div> : null}
      </Rise>
      {framed ? <Frame>{children}</Frame> : <Rise at={0.08}>{children}</Rise>}
    </Drawing>
  );
}

/**
 * The name and instructions of an interactive, for a row's `aside`: they sit
 * beside the frame on wide screens and above it on phones.
 */
export function TryIt({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <>
      <h3 className="text-xl font-semibold tracking-tight text-text">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
      {badge ? <div className="mt-4">{badge}</div> : null}
    </>
  );
}

/** Two halves of a row's content side by side on wide screens, e.g. problem and approach. */
export function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-10 xl:grid-cols-2 xl:gap-12">{children}</div>;
}

/** Four even columns inside the content column (two on phones). */
export function Columns({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8">{children}</div>;
}

/** A label/value pair under a thin line that ticks in, left to right, by `index`. */
export function Fact({ label, index = 0, children }: { label: string; index?: number; children: ReactNode }) {
  return (
    <div className="relative pt-4">
      <Line at={0.15 + index * 0.1} duration={0.6} className="absolute inset-x-0 top-0 h-0.5" />
      <dl>
        <dt className="eyebrow">{label}</dt>
        <dd className="mt-2 text-base">{children}</dd>
      </dl>
    </div>
  );
}
