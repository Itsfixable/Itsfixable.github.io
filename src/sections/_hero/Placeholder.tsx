"use client";

import { PLACEHOLDER } from "@/data/profile";

/**
 * Prototype gap markers.
 *
 * `src/data/profile.ts` writes anything unconfirmed as the literal string
 * "[placeholder]". The Hero and About sections render those gaps *loudly*
 * rather than hiding them: a muted monospace chip with a dashed underline, so
 * it reads as "to be filled in" instead of as real copy — and the literal
 * token stays on screen, so `grep -rn "\[placeholder\]"` still matches what a
 * visitor sees.
 *
 * Lives in `_hero/` so Hero and About mark gaps identically.
 */

export function isPlaceholder(value: string): boolean {
  return value === PLACEHOLDER;
}

const CHIP =
  "font-mono text-[0.85em] tracking-tight text-faint underline decoration-dashed decoration-faint/60 underline-offset-[0.3em]";

/** Inline chip — for a word or short phrase inside a line of real text. */
export function PlaceholderChip({ className = "" }: { className?: string }) {
  return (
    <span className={`${CHIP} ${className}`.trim()}>
      {PLACEHOLDER}
      <span className="sr-only"> (not filled in yet)</span>
    </span>
  );
}

/**
 * Renders `value`, or the chip when `value` is the placeholder token. Keeps
 * every call site free of `value === PLACEHOLDER ? … : …` branching.
 */
export function ValueOrPlaceholder({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  if (isPlaceholder(value)) return <PlaceholderChip className={className} />;
  return <>{value}</>;
}

/**
 * Block-level variant — for a whole paragraph that has not been written yet.
 * `note` says which paragraph is missing so the gap is actionable.
 */
export function PlaceholderParagraph({ note }: { note: string }) {
  return (
    <p className="rounded-card border border-dashed border-line bg-surface/60 px-4 py-3.5 font-mono text-sm leading-relaxed text-faint">
      <span className="underline decoration-dashed decoration-faint/60 underline-offset-[0.3em]">
        {PLACEHOLDER}
      </span>
      <span> — {note}</span>
    </p>
  );
}
