"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { staggerParent, useReveal, viewportOnce } from "@/lib/motion";
import { useIsCalm, useLanguageFilter, useSetLanguageFilter } from "@/store/ui";
import { profile } from "@/data/profile";
import { RepoCard } from "./_github/RepoCard";
import { RepoSkeletonGrid } from "./_github/RepoSkeleton";
import { deriveLanguages, languageColor } from "./_github/languages";
import { useRelativeTime } from "./_github/relativeTime";
import { GITHUB_PROFILE_URL, useRepos } from "./_github/useRepos";
import { describeError, type Repo } from "./_github/types";

/** Six is two full rows at the widest breakpoint. Past that: go to GitHub. */
const MAX_CARDS = 6;

/* ------------------------------------------------------------------ icons */

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    // The rotation lives on a wrapper rather than the <svg> so it is a plain,
    // predictable CSS transform about the element's own centre.
    <motion.span
      aria-hidden="true"
      className="inline-flex shrink-0"
      // Wild mode spins while the request is in flight. In calm mode
      // `spinning` is never true, so this stays a still icon and the button
      // label carries the state instead.
      animate={{ rotate: spinning ? 360 : 0 }}
      transition={
        spinning
          ? { duration: 0.9, repeat: Infinity, ease: "linear" }
          : { duration: 0 }
      }
    >
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.6 8a5.4 5.4 0 019.2-3.8" />
        <path d="M13.4 8a5.4 5.4 0 01-9.2 3.8" />
        <path d="M12.2 1.8v3h-3" />
        <path d="M3.8 14.2v-3h3" />
      </svg>
    </motion.span>
  );
}

function ExternalIcon() {
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

/* ------------------------------------------------------------------- bits */

/** Fixed height: the loading placeholder row has to match it to the pixel. */
const CHIP_HEIGHT = "h-8";

const CHIP_BASE =
  `inline-flex ${CHIP_HEIGHT} shrink-0 items-center gap-1.5 rounded-full border px-3 font-mono text-[0.6875rem] leading-none tracking-[0.08em] transition-colors duration-200`;

function LanguageChip({
  label,
  count,
  active,
  dotColor,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dotColor: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? `${CHIP_BASE} border-accent bg-accent text-accent-ink`
          : `${CHIP_BASE} border-line bg-surface text-muted hover:border-faint hover:text-text`
      }
    >
      {dotColor ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          // Per-language colour, so it has to be an inline style. When the
          // chip is filled with the accent the dot inherits the ink colour
          // instead, which keeps contrast readable.
          style={{ backgroundColor: active ? "currentColor" : dotColor }}
        />
      ) : null}
      <span>{label}</span>
      <span className={active ? "text-accent-ink/60" : "text-faint"}>{count}</span>
    </button>
  );
}

function ProfileLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={GITHUB_PROFILE_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 font-mono text-[0.75rem] text-accent underline decoration-accent/30 underline-offset-4 transition-colors duration-200 hover:decoration-accent"
    >
      {children}
      <ExternalIcon />
    </a>
  );
}

/* ----------------------------------------------------------------- section */

export function GitHub() {
  const calm = useIsCalm();
  const headerReveal = useReveal();

  const { data, error, isError, isPending, isFetching, dataUpdatedAt, refetch } =
    useRepos();

  const storedFilter = useLanguageFilter();
  const setLanguageFilter = useSetLanguageFilter();

  /**
   * Forks are excluded from the list the section is about: this is a "what has
   * Koji built" shelf, not a mirror of everything the account has ever
   * starred. The query function already sorted by most recent push.
   */
  const repos = useMemo<Repo[]>(
    () => (data ?? []).filter((repo) => !repo.fork),
    [data],
  );

  const languages = useMemo(() => deriveLanguages(repos), [repos]);

  /**
   * The store is the source of truth, but it outlives any particular fetch —
   * it can be holding "Rust" after a refresh in which no Rust repo came back.
   * Rather than render an empty grid, the selection falls back to "all" when
   * the stored language is not in the current data.
   */
  const activeLanguage = useMemo(() => {
    if (storedFilter === null) return null;
    return languages.some((entry) => entry.name === storedFilter)
      ? storedFilter
      : null;
  }, [storedFilter, languages]);

  const filterIsStale = storedFilter !== null && activeLanguage === null;

  const filtered = useMemo(
    () =>
      activeLanguage === null
        ? repos
        : repos.filter((repo) => repo.language === activeLanguage),
    [repos, activeLanguage],
  );

  const visible = filtered.slice(0, MAX_CARDS);
  const overflow = filtered.length - visible.length;

  // `dataUpdatedAt` is 0 until the first successful fetch resolves.
  const updatedLabel = useRelativeTime(dataUpdatedAt > 0 ? dataUpdatedAt : null);

  const failure = isError ? describeError(error) : null;

  const countLabel =
    filtered.length === 1 ? "1 repository" : `${filtered.length} repositories`;

  /**
   * Screen readers get the state as text in a polite live region rather than
   * having to infer it from a spinning icon.
   */
  const statusMessage = isPending
    ? "Loading repositories from GitHub."
    : isFetching
      ? "Refreshing repositories from GitHub."
      : failure
        ? `${failure.title}. ${failure.body}`
        : `Showing ${visible.length} of ${countLabel}${
            activeLanguage ? ` in ${activeLanguage}` : ""
          }.`;

  return (
    <section id="github" className="shell section-y">
      <motion.header
        {...headerReveal}
        className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div className="flex max-w-2xl flex-col gap-4">
          <p className="eyebrow">Live from the GitHub API</p>
          <h2 className="text-headline">Public repositories</h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Fetched in your browser the moment this page loads, not baked in at
            build time — so this is the current state of{" "}
            <ProfileLink>@{profile.handle}</ProfileLink>, forks excluded and
            most recently pushed first.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            aria-busy={isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 font-mono text-[0.6875rem] tracking-[0.14em] text-muted uppercase transition-colors duration-200 hover:border-faint hover:text-text disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line disabled:hover:text-muted"
          >
            <RefreshIcon spinning={isFetching && !calm} />
            {isFetching && calm ? "Refreshing…" : "Refresh"}
          </button>

          {/* Fixed height so the label appearing after mount moves nothing. */}
          <p className="h-4 font-mono text-[0.6875rem] text-faint">
            {updatedLabel ? `updated ${updatedLabel}` : null}
          </p>
        </div>
      </motion.header>

      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      <hr className="hairline my-10 md:my-12" />

      {/* --------------------------------------------------- language filter */}
      {isPending ? (
        /* Holds the filter row's exact height while the chips are unknown, so
           the grid below does not get shunted down when they arrive. */
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="flex flex-wrap gap-2">
            {[3.5, 6.5, 5.5, 4.5].map((width) => (
              <div
                key={width}
                className={`${CHIP_HEIGHT} rounded-full border border-line bg-surface`}
                style={{ width: `${width}rem` }}
              />
            ))}
          </div>
          <div className="h-4" />
        </div>
      ) : languages.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div
            role="group"
            aria-label="Filter repositories by language"
            // Wrapping, not scrolling: nothing can push the page sideways at
            // 375px no matter how many languages come back.
            className="flex flex-wrap gap-2"
          >
            <LanguageChip
              label="All"
              count={repos.length}
              active={activeLanguage === null}
              dotColor={null}
              onClick={() => setLanguageFilter(null)}
            />
            {languages.map((entry) => {
              const active = activeLanguage === entry.name;
              return (
                <LanguageChip
                  key={entry.name}
                  label={entry.name}
                  count={entry.count}
                  active={active}
                  dotColor={languageColor(entry.name)}
                  // A real toggle: pressing the active chip clears the filter.
                  onClick={() => setLanguageFilter(active ? null : entry.name)}
                />
              );
            })}
          </div>

          <p className="min-h-4 font-mono text-[0.6875rem] text-faint">
            {overflow > 0
              ? `Showing ${visible.length} of ${countLabel}`
              : countLabel}
            {activeLanguage ? ` in ${activeLanguage}` : ""}
            {filterIsStale
              ? ` — nothing tagged ${storedFilter} came back this time, so this is everything`
              : ""}
          </p>
        </div>
      ) : null}

      {/* ----------------------------------------------------------- content */}
      <div className="mt-6">
        {isPending ? (
          <RepoSkeletonGrid calm={calm} count={MAX_CARDS} />
        ) : failure && repos.length === 0 ? (
          <div className="card flex flex-col items-start gap-4 p-6 sm:p-8">
            <p className="eyebrow">{failure.title}</p>
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              {failure.body}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                disabled={isFetching}
                aria-busy={isFetching}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-accent bg-accent px-4 font-mono text-[0.6875rem] tracking-[0.14em] text-accent-ink uppercase transition-opacity duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon spinning={isFetching && !calm} />
                {isFetching ? (calm ? "Retrying…" : "Retry") : "Try again"}
              </button>
              <ProfileLink>Browse the repositories on GitHub</ProfileLink>
            </div>
          </div>
        ) : repos.length === 0 ? (
          <div className="card flex flex-col items-start gap-4 p-6 sm:p-8">
            <p className="eyebrow">Nothing public yet</p>
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              The API answered, but there are no public non-fork repositories on
              the account right now.
            </p>
            <ProfileLink>Open the profile on GitHub</ProfileLink>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* A refresh that failed while cached data is on screen: say so,
                keep the cards. */}
            {failure ? (
              <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-xs leading-relaxed text-muted">
                  <span className="text-text">{failure.title}.</span> Showing the
                  last repositories that loaded successfully.
                </p>
                <ProfileLink>GitHub</ProfileLink>
              </div>
            ) : null}

            <motion.ul
              initial="hidden"
              whileInView="shown"
              viewport={viewportOnce}
              // Stagger in wild mode; `staggerParent` sets it to 0 in calm, so
              // the cards fade in together and near-instantly.
              variants={staggerParent(calm)}
              aria-busy={isFetching}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visible.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </motion.ul>

            <p className="font-mono text-[0.6875rem] text-faint">
              {overflow > 0
                ? `${overflow} more ${overflow === 1 ? "repository" : "repositories"} not shown. `
                : ""}
              <ProfileLink>View all on GitHub</ProfileLink>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
