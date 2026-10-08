"use client";

import { resume } from "@/data/profile";
import { isPlaceholder } from "./Placeholder";
import { IconArrowUpRight, IconFile } from "./icons";

/**
 * One résumé control, used by the nav, the ⌘K palette and the contact section,
 * so the "not uploaded yet" state can never be right in one place and a dead
 * link in another.
 */
export const resumeAvailable: boolean = resume.available && !isPlaceholder(resume.href);

export const resumeUnavailableReason = `${resume.label} is not uploaded yet — its link in src/data/profile.ts is still [placeholder].`;

type ResumeButtonProps = {
  /** "solid" is the accent fill; use it once per view at most. */
  tone?: "solid" | "ghost";
  size?: "sm" | "md";
  className?: string;
};

export function ResumeButton({ tone = "ghost", size = "sm", className = "" }: ResumeButtonProps) {
  const shape = "inline-flex shrink-0 items-center gap-2 rounded-full font-medium transition-colors";
  const sizing = size === "sm" ? "h-9 px-2.5 text-sm sm:px-3.5" : "h-11 px-5 text-base";
  // The label always shows; only the secondary badge/arrow drops out at 375px,
  // so the nav never crowds and the control is never a mystery icon.
  const trailing = "hidden shrink-0 sm:inline-flex";

  if (!resumeAvailable) {
    return (
      <button
        type="button"
        disabled
        title={resumeUnavailableReason}
        className={`${shape} ${sizing} cursor-not-allowed border border-dashed border-line bg-transparent text-faint ${className}`}
      >
        <IconFile className="shrink-0" />
        <span>{resume.label}</span>
        <span
          aria-hidden="true"
          className={`${trailing} font-mono text-[10px] uppercase tracking-[0.16em]`}
        >
          soon
        </span>
      </button>
    );
  }

  return (
    <a
      href={resume.href}
      target="_blank"
      rel="noreferrer noopener"
      className={`${shape} ${sizing} ${
        tone === "solid"
          ? "bg-accent text-accent-ink hover:bg-accent-dim"
          : "border border-line bg-surface-2 text-text hover:border-faint hover:bg-surface-3"
      } ${className}`}
    >
      <IconFile className="shrink-0" />
      <span>{resume.label}</span>
      <IconArrowUpRight aria-hidden="true" className={`${trailing} opacity-60`} />
    </a>
  );
}
