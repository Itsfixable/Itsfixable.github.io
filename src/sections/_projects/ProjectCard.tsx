"use client";

import { motion } from "framer-motion";
import type { FocusEventHandler, ReactNode } from "react";
import { PLACEHOLDER, type Project } from "@/data/profile";
import { useReveal } from "@/lib/motion";
import { TechChip } from "@/components/TechChip";

/**
 * One project. Identical content in both layouts — the only difference is the
 * box: a framed card in a list, or bare content filling a Mondrian grid cell
 * (the grid's black lines are its frame).
 */
export type ProjectCardVariant = "stack" | "cell";

type ProjectCardProps = {
  project: Project;
  index: number;
  total: number;
  variant: ProjectCardVariant;
  onFocus?: FocusEventHandler<HTMLLIElement>;
  /** False when the surrounding section already shows the project's name. */
  showName?: boolean;
};

const statusMeta: Record<
  Project["status"],
  { label: string; className: string; dotClassName?: string }
> = {
  live: { label: "Live", className: "border-line bg-surface-3 text-text", dotClassName: "bg-accent" },
  "in-progress": { label: "In progress", className: "border-line bg-surface-3 text-text" },
  archived: { label: "Archived", className: "border-line bg-surface-2 text-muted" },
  physical: { label: "Physical", className: "border-line bg-surface-3 text-muted" },
};

const pad = (n: number) => String(n).padStart(2, "0");

const isGap = (value: string) => value === PLACEHOLDER;

/**
 * An unfilled field. Deliberately loud rather than hidden: a dashed outline
 * reads as "this is still missing" instead of "this project has no role".
 */
function Gap() {
  return (
    <span className="inline-flex items-center rounded-none border border-dashed border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[0.12em] text-faint uppercase">
      {PLACEHOLDER}
    </span>
  );
}

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="text-[0.8em] leading-none">
      &#8599;
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-faint uppercase">
        {label}
      </dt>
      <dd className="font-mono text-xs text-text">{isGap(value) ? <Gap /> : value}</dd>
    </div>
  );
}

export function ProjectCard({ project, index, total, variant, onFocus, showName = true }: ProjectCardProps) {
  // Called unconditionally; `variant` never changes for a mounted card.
  const reveal = useReveal({ index, distance: 20, amount: 0.2 });
  const cell = variant === "cell";
  const status = statusMeta[project.status];
  const hasLinks = Boolean(project.demo ?? project.repo);

  const article = (
      <article
        className={
          cell
            ? "flex h-full flex-col gap-5 p-5 sm:p-6 md:gap-6 lg:p-8"
            : "card flex h-full flex-col gap-5 overflow-hidden p-6 md:gap-6 md:p-8"
        }
      >
        <div className="flex items-start justify-between gap-4">
          {/* A counter only means something when there is more than one card. */}
          {total > 1 ? (
            <p className="font-mono text-xs tabular-nums text-muted">
              {pad(index + 1)}
              <span className="text-line"> / </span>
              <span className="text-faint">{pad(total)}</span>
            </p>
          ) : (
            <span />
          )}
          <p
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-none border px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase ${status.className}`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-none ${status.dotClassName ?? "bg-current"}`}
            />
            {status.label}
          </p>
        </div>

        <div>
          {showName ? (
            <h3 className="text-3xl font-semibold tracking-[-0.03em] text-balance md:text-4xl">
              {project.name}
            </h3>
          ) : null}
          <p className={`${showName ? "mt-3" : ""} max-w-[38ch] text-base text-muted md:text-lg`}>{project.tagline}</p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Meta label="Year" value={project.year} />
          <Meta label="Role" value={project.role} />
        </dl>

        <hr className="hairline shrink-0" />

        <p className="max-w-[62ch] text-sm leading-relaxed text-muted">{project.blurb}</p>

        <ul className="flex flex-col gap-2">
          {project.highlights.map((highlight, i) => (
            <li
              key={`${project.id}-highlight-${i}`}
              className="flex items-baseline gap-3 text-sm text-text"
            >
              <span aria-hidden="true" className="size-1 shrink-0 rounded-none bg-faint" />
              {isGap(highlight) ? <Gap /> : <span>{highlight}</span>}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-4 pt-1">
          <ul className="flex flex-wrap gap-2">
            {project.stack.map((item, i) => (
              <li key={`${project.id}-stack-${i}`}>
                {isGap(item) ? (
                  <Gap />
                ) : (
                  <TechChip name={item} />
                )}
              </li>
            ))}
          </ul>

          {hasLinks ? (
            <div className="flex flex-wrap items-center gap-3">
              {project.demo ? (
                <CardLink href={project.demo} tone="primary">
                  Open demo
                </CardLink>
              ) : null}
              {project.repo ? (
                <CardLink href={project.repo} tone="quiet">
                  Source
                </CardLink>
              ) : null}
            </div>
          ) : (
            <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-faint uppercase">
              No public link
            </p>
          )}
        </div>
      </article>
  );

  if (cell) return article;

  return (
    <motion.li {...reveal} onFocus={onFocus} className="w-full">
      {article}
    </motion.li>
  );
}

function CardLink({
  href,
  tone,
  children,
}: {
  href: string;
  tone: "primary" | "quiet";
  children: ReactNode;
}) {
  // Every button on the page is white until hovered, then fills with a primary.
  const className =
    tone === "primary"
      ? "border-2 border-ink bg-surface text-text hover:bg-m-blue hover:text-white focus-visible:bg-m-blue focus-visible:text-white"
      : "border-2 border-ink bg-surface text-text hover:bg-m-yellow focus-visible:bg-m-yellow";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex items-center gap-2 rounded-none px-4 py-2 text-sm font-medium transition-colors ${className}`}
    >
      {children}
      <ExternalArrow />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
