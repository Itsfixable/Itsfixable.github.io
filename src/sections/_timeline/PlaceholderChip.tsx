"use client";

import type { CSSProperties } from "react";
import { PLACEHOLDER } from "@/data/profile";

/**
 * Most `when` values and three of the five `built` values are still the literal
 * "[placeholder]" string. This is a prototype, so the holes are rendered as
 * holes: a dashed, hatched chip carrying the literal token. Nothing is hidden
 * and nothing is faked, and `grep -rn "\[placeholder\]"` still finds the data.
 */

/** Diagonal hatch, built from tokens so it tracks the theme. */
const HATCH: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--color-surface) 0 5px, var(--color-surface-2) 5px 10px)",
};

type PlaceholderChipProps = {
  /**
   * `inline` sits next to a label (used for `when`).
   * `block` fills the width of a body slot (used for `built`).
   */
  variant?: "inline" | "block";
};

export function PlaceholderChip({ variant = "inline" }: PlaceholderChipProps) {
  const shared =
    "font-mono text-[0.6875rem] tracking-[0.12em] text-faint border border-dashed border-line";

  if (variant === "block") {
    return (
      <span
        className={`${shared} flex items-center gap-2 rounded-md px-3 py-2.5`}
        style={HATCH}
      >
        <span aria-hidden className="h-px w-4 shrink-0 bg-faint/70" />
        <span className="min-w-0 break-words">{PLACEHOLDER}</span>
      </span>
    );
  }

  return (
    <span
      className={`${shared} inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 leading-5`}
      style={HATCH}
    >
      <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-faint" />
      <span className="min-w-0 break-words">{PLACEHOLDER}</span>
    </span>
  );
}

/** Narrow helper so entries never compare against the raw string inline. */
export function isPlaceholder(value: string): boolean {
  return value === PLACEHOLDER;
}
