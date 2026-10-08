"use client";

import { motion } from "framer-motion";
import { useIsCalm } from "@/store/ui";
import { revealVariants } from "@/lib/motion";
import { languageColor } from "./languages";
import { formatPushedDate } from "./relativeTime";
import type { Repo } from "./types";

/**
 * Shared by the card and its skeleton so the two have identical dimensions —
 * the section must not jump a single pixel when the data lands.
 */
export const CARD_SHELL = "card flex min-h-[13.5rem] flex-col gap-3 p-5";

const MAX_TOPICS = 4;

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M8 .7l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L.8 6l5-.7z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="4" cy="3" r="1.8" />
      <circle cx="12" cy="3" r="1.8" />
      <circle cx="8" cy="13" r="1.8" />
      <path d="M4 4.8v1.4a2 2 0 002 2h4a2 2 0 002-2V4.8M8 8.2v3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M4.5 11.5L11.5 4.5M5.5 4.5h6v6" />
    </svg>
  );
}

export function RepoCard({ repo }: { repo: Repo }) {
  const calm = useIsCalm();
  const pushed = formatPushedDate(repo.pushed_at);
  const topics = repo.topics.slice(0, MAX_TOPICS);
  const hiddenTopics = repo.topics.length - topics.length;

  return (
    <motion.li
      // The parent list owns the stagger and the in-view trigger; the card
      // only declares what "hidden" and "shown" look like. In calm mode
      // `revealVariants` drops the 16px rise and collapses the duration.
      variants={revealVariants(calm, 16)}
      className={`${CARD_SHELL} group transition-colors duration-300 hover:border-faint`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-mono text-[0.9375rem] leading-snug font-medium">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 break-words text-text transition-colors duration-200 group-hover:text-accent"
          >
            <span className="break-all">{repo.name}</span>
            <ArrowIcon />
          </a>
        </h3>

        {repo.archived ? (
          <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.12em] text-muted uppercase">
            Archived
          </span>
        ) : null}
      </div>

      {repo.description ? (
        <p className="text-sm leading-relaxed text-muted">{repo.description}</p>
      ) : (
        <p className="text-sm leading-relaxed text-faint italic">
          No description on GitHub.
        </p>
      )}

      {topics.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <li
              key={topic}
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.6875rem] text-faint"
            >
              {topic}
            </li>
          ))}
          {hiddenTopics > 0 ? (
            <li className="px-1 py-0.5 font-mono text-[0.6875rem] text-faint">
              +{hiddenTopics}
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 font-mono text-[0.6875rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            // Dynamic per language, so it cannot be a utility class. The site
            // accent is deliberately not used here.
            style={{ backgroundColor: languageColor(repo.language) }}
          />
          {repo.language ?? <span className="text-faint">No language</span>}
        </span>

        <span
          className={`inline-flex items-center gap-1 ${repo.stargazers_count > 0 ? "" : "text-faint"}`}
        >
          <StarIcon />
          {repo.stargazers_count}
          <span className="sr-only">
            {repo.stargazers_count === 1 ? " star" : " stars"}
          </span>
        </span>

        <span
          className={`inline-flex items-center gap-1 ${repo.forks_count > 0 ? "" : "text-faint"}`}
        >
          <ForkIcon />
          {repo.forks_count}
          <span className="sr-only">
            {repo.forks_count === 1 ? " fork" : " forks"}
          </span>
        </span>

        {pushed && repo.pushed_at ? (
          <span className="ml-auto text-faint">
            pushed{" "}
            <time dateTime={repo.pushed_at} className="text-muted">
              {pushed}
            </time>
          </span>
        ) : null}
      </div>

      {repo.homepage ? (
        <a
          href={repo.homepage}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.08em] text-muted uppercase transition-colors duration-200 hover:text-accent"
        >
          Live site
          <ArrowIcon />
        </a>
      ) : null}
    </motion.li>
  );
}
