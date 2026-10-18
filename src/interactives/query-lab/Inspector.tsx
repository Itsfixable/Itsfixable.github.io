"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { DETAIL_STALE_MS, LIST_STALE_MS, type AccountFilters } from "./api";
import { describeFilters, formatAgo, formatBytes } from "./format";
import { useLabStore, type ActivityEntry } from "./store";

type CacheStatus = "fetching" | "error" | "fresh" | "stale" | "inactive";

const STATUS_STYLE: Record<CacheStatus, string> = {
  fetching: "border-accent text-accent animate-pulse calm:animate-none",
  fresh: "border-transparent bg-accent-soft text-accent",
  stale: "border-line bg-surface-3 text-muted",
  inactive: "border-dashed border-line text-faint",
  error: "border-transparent bg-danger-soft text-danger",
};

function staleTimeFor(query: Query): number {
  return query.queryKey[0] === "account" ? DETAIL_STALE_MS : LIST_STALE_MS;
}

function cacheStatus(query: Query): CacheStatus {
  if (query.state.fetchStatus === "fetching") return "fetching";
  if (query.state.status === "error") return "error";
  if (query.getObserversCount() === 0) return "inactive";
  return query.isStaleByTime(staleTimeFor(query)) ? "stale" : "fresh";
}

function cacheLabel(query: Query): string {
  const [kind, value] = query.queryKey as [string, unknown];
  if (kind === "account") return `account #${String(value)} · details`;
  const pages = (query.state.data as { pages?: unknown[] } | undefined)?.pages?.length ?? 0;
  return `list ${describeFilters(value as AccountFilters)} · ${pages} ${pages === 1 ? "page" : "pages"}`;
}

/**
 * Re-renders when anything in the lab's QueryCache changes, plus once a second
 * so "fresh" visibly turns into "stale", and returns the time of that render
 * (the clock is read here, in callbacks, never during render). Cache events
 * can fire while another component is rendering, so updates are deferred to
 * the next frame.
 */
function useCacheClock(): number {
  const cache = useQueryClient().getQueryCache();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    let frame = 0;
    const unsubscribe = cache.subscribe(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    });
    const interval = setInterval(tick, 1000);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [cache]);

  return now;
}

function StatusChip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-none border px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.08em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

function ActivityLine({ entry, now }: { entry: ActivityEntry; now: number }) {
  if (entry.kind === "cache") {
    return (
      <li className="flex gap-2.5 py-2">
        <StatusChip className="border-transparent bg-accent-soft text-accent">cache</StatusChip>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text">{entry.label}</p>
          <p className="mt-0.5 font-mono text-[0.625rem] text-faint">no request · {formatAgo(now - entry.at)}</p>
        </div>
      </li>
    );
  }

  const ok = typeof entry.status === "number" && entry.status < 400;
  const chipClass = ok
    ? "border-line bg-surface text-text"
    : entry.status === "cancelled"
      ? "border-dashed border-line text-faint"
      : "border-transparent bg-danger-soft text-danger";

  const facts = [
    `${entry.ms} ms`,
    entry.rows !== null ? `${entry.rows} ${entry.rows === 1 ? "row" : "rows"}` : null,
    entry.bytes !== null ? formatBytes(entry.bytes) : null,
    entry.injected ? "injected by you" : null,
    formatAgo(now - entry.at),
  ].filter(Boolean);

  return (
    <li className="flex gap-2.5 py-2">
      <StatusChip className={chipClass}>{entry.status === "cancelled" ? "abort" : String(entry.status)}</StatusChip>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[0.6875rem] text-text" title={entry.path}>
          GET {entry.path}
        </p>
        <p className="mt-0.5 font-mono text-[0.625rem] text-faint">{facts.join(" · ")}</p>
      </div>
    </li>
  );
}

export function Inspector() {
  const now = useCacheClock();
  const queryClient = useQueryClient();
  const delayMs = useLabStore((s) => s.delayMs);
  const failNext = useLabStore((s) => s.failNext);
  const activity = useLabStore((s) => s.activity);
  const requestCount = useLabStore((s) => s.requestCount);
  const cacheHitCount = useLabStore((s) => s.cacheHitCount);
  const setDelay = useLabStore((s) => s.setDelay);
  const armFailure = useLabStore((s) => s.armFailure);

  const queries = queryClient
    .getQueryCache()
    .getAll()
    .slice()
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, 6);

  return (
    <aside aria-label="Under the hood" className="flex min-w-0 flex-col gap-6">
      <div>
        <p className="eyebrow">Under the hood</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-faint uppercase">Requests</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">{requestCount}</dd>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-faint uppercase">From cache</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-accent">{cacheHitCount}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="eyebrow">Break things</p>
        <label className="mt-3 block text-xs text-muted" htmlFor="lab-delay">
          Extra latency: <span className="font-mono text-text">{delayMs} ms</span>
        </label>
        <input
          id="lab-delay"
          type="range"
          min={0}
          max={2000}
          step={100}
          value={delayMs}
          onChange={(event) => setDelay(Number(event.target.value))}
          className="mt-2 w-full accent-[var(--color-accent)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={armFailure}
            disabled={failNext}
            className={`rounded-none border px-3 py-1.5 text-xs font-medium transition-colors ${
              failNext
                ? "border-danger bg-danger-soft text-danger"
                : "border-line bg-surface text-text hover:border-faint"
            }`}
          >
            {failNext ? "Armed: next request fails" : "Fail the next request"}
          </button>
          <button
            type="button"
            onClick={() => void queryClient.resetQueries()}
            className="rounded-none border border-line bg-surface px-3 py-1.5 text-xs font-medium text-text hover:border-faint"
          >
            Clear the cache
          </button>
        </div>
      </div>

      <div>
        <p className="eyebrow">Query cache</p>
        {queries.length === 0 ? (
          <p className="mt-3 text-xs text-faint">Empty. Nothing has been fetched yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {queries.map((query) => {
              const status = cacheStatus(query);
              return (
                <li key={query.queryHash} className="flex items-center gap-2.5 py-2">
                  <StatusChip className={STATUS_STYLE[status]}>{status}</StatusChip>
                  <span className="min-w-0 truncate text-xs text-muted" title={cacheLabel(query)}>
                    {cacheLabel(query)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="min-h-0">
        <p className="eyebrow">Activity</p>
        {activity.length === 0 ? (
          <p className="mt-3 text-xs text-faint">Requests and cache hits will show up here.</p>
        ) : (
          <ol data-lenis-prevent className="mt-1 max-h-72 divide-y divide-line overflow-y-auto pr-1">
            {activity.slice(0, 20).map((entry) => (
              <ActivityLine key={entry.id} entry={entry} now={now} />
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
