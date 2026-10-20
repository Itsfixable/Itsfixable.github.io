"use client";

import type { ReactNode } from "react";
import { TechChip } from "@/components/TechChip";
import { HOVER_FILL, type Tone } from "./tone";

/**
 * The few pieces of text every section is written with, so a paragraph, a
 * bullet list, a link and a stack look the same wherever they appear.
 */

/** A paragraph of body copy. */
export function Body({ children }: { children: ReactNode }) {
  return <p className="max-w-[60ch] text-base leading-relaxed text-muted md:text-lg">{children}</p>;
}

/** Short claims, each marked with a small black square. */
export function Bullets({ items, className = "" }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-baseline gap-3 text-base leading-relaxed">
          <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-0.1em] bg-ink" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** The tools behind something, as logo chips. */
export function Stack({ items, className = "" }: { items: readonly string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => (
        <li key={item}>
          <TechChip name={item} />
        </li>
      ))}
    </ul>
  );
}

/** `https://host/path` -> `host/path`, so a link shows where it goes. */
export const hostOf = (href: string) => href.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * A link that leaves the site: a white box with a black frame that fills
 * with `tone` on hover, like every other control on the page.
 */
export function OutLink({
  href,
  tone,
  children,
  detail,
}: {
  href: string;
  tone: Tone;
  children: ReactNode;
  /** Small grey text after the label, e.g. the host. */
  detail?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex max-w-full shrink-0 items-center gap-3 border-2 border-ink bg-surface px-5 py-3 text-sm font-medium transition-colors duration-200 ${HOVER_FILL[tone]}`}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span className="sr-only">(opens in a new tab)</span>
      {detail ? (
        <span className="truncate font-mono text-xs text-faint group-hover:text-inherit group-focus-visible:text-inherit">
          {detail}
        </span>
      ) : null}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
