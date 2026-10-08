"use client";

import { PLACEHOLDER } from "@/data/profile";

/**
 * Unconfirmed content is the literal string "[placeholder]" in the data layer.
 * The rule for the chrome: never swallow one and never link to one — show the
 * gap, say what is missing, and keep the control inert.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === PLACEHOLDER || trimmed === "#") return true;
  // Catches stand-ins like `mailto:placeholder@example.com`.
  return trimmed.toLowerCase().includes("placeholder");
}

/** A dashed slot that reads as a deliberate gap rather than a broken value. */
export function PlaceholderChip({
  note,
  className = "",
}: {
  /** What is missing, e.g. "email address". */
  note?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed border-line bg-surface px-2 py-0.5 align-middle font-mono text-[11px] leading-5 text-faint ${className}`}
    >
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-faint" />
      {PLACEHOLDER}
      {note ? <span className="opacity-70">{note}</span> : null}
    </span>
  );
}
