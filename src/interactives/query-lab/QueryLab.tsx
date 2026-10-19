"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  DETAIL_STALE_MS,
  INDUSTRIES,
  LIST_STALE_MS,
  STAGES,
  accountKey,
  accountsKey,
  fetchAccountDetail,
  fetchAccountsPage,
  type AccountFilters,
  type AccountRow,
  type SortKey,
} from "./api";
import { AccountDetailPanel } from "./AccountDetailPanel";
import { isLabConfigured } from "./client";
import { describeFilters, formatArr, formatCount, formatDate } from "./format";
import { Inspector } from "./Inspector";
import { useLabStore } from "./store";

/* ---------------------------------------------------------------------------
 * Table model. Everything here is module-scope so TanStack Table sees stable
 * inputs; sorting is "manual" because Postgres does it, not the browser.
 * ------------------------------------------------------------------------- */

const features = tableFeatures({ rowSortingFeature });
const helper = createColumnHelper<typeof features, AccountRow>();
const columns = helper.columns([
  helper.accessor("name", { header: "Account" }),
  helper.accessor("industry", { header: "Industry" }),
  helper.accessor("stage", { header: "Stage" }),
  helper.accessor("arr_usd", {
    header: "ARR",
    sortDescFirst: true,
    cell: (info) => formatArr(info.getValue()),
  }),
  helper.accessor("employees", {
    header: "Employees",
    sortDescFirst: true,
    cell: (info) => formatCount(info.getValue()),
  }),
  helper.accessor("last_activity_at", {
    header: "Last activity",
    sortDescFirst: true,
    cell: (info) => formatDate(info.getValue()),
  }),
]);

const NUMERIC = new Set(["arr_usd", "employees"]);
const NO_ROWS: AccountRow[] = [];
const DEFAULT_SORT: SortingState = [{ id: "arr_usd", desc: true }];

/** Hovering this long counts as intent to open, so details get prefetched. */
const HOVER_INTENT_MS = 150;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/* ------------------------------------------------------------------------- */

export function QueryLab() {
  // The lab gets its own QueryClient so its inspector shows only its own
  // queries, and so its settings never leak into the GitHub section's cache.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: LIST_STALE_MS,
            gcTime: 5 * 60 * 1000,
            retry: 2,
            retryDelay: 800,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  if (!isLabConfigured) return <NotConfigured />;

  return (
    <QueryClientProvider client={client}>
      <Lab />
    </QueryClientProvider>
  );
}

function NotConfigured() {
  return (
    <div className="bg-surface p-6 sm:p-8">
      <p className="eyebrow">Query lab</p>
      <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted">
        This demo reads from a Supabase database, and this build was made without its
        connection settings. Set <code className="font-mono text-text">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        and <code className="font-mono text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and rebuild.
      </p>
    </div>
  );
}

function Lab() {
  const queryClient = useQueryClient();
  const logCacheHit = useLabStore((s) => s.logCacheHit);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [industry, setIndustry] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT);
  // The open row belongs to one result set; a new search or sort closes it
  // simply by no longer matching, so nothing has to reset it in an effect.
  const [opened, setOpened] = useState<{ id: number; filtersKey: string } | null>(null);

  const sortId = (sorting[0]?.id ?? "arr_usd") as SortKey;
  const sortDesc = sorting[0]?.desc ?? true;

  const filters = useMemo<AccountFilters>(
    () => ({ search, industry, stage, sortId, sortDesc }),
    [search, industry, stage, sortId, sortDesc],
  );
  const filtersKey = JSON.stringify(filters);
  const openId = opened?.filtersKey === filtersKey ? opened.id : null;

  const query = useInfiniteQuery({
    queryKey: accountsKey(filters),
    queryFn: ({ pageParam, signal }) => fetchAccountsPage(filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    // Keep the old rows on screen (dimmed) while a new search loads.
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.rows) ?? NO_ROWS, [query.data]);
  const total = query.data?.pages[0]?.total ?? null;

  const table = useTable({
    features,
    columns,
    data: rows,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    getRowId: (row) => String(row.id),
  });

  /* ---- When the inputs change: report cache hits, reset scroll ---------- */

  const scrollRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });

    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // TanStack Query will answer this key from its cache if it can. Say so,
    // because a request that never happens is otherwise invisible.
    const cached = queryClient.getQueryCache().find({ queryKey: accountsKey(filters), exact: true });
    if (!cached?.state.data) return;
    const fresh = !cached.isStaleByTime(LIST_STALE_MS);
    logCacheHit(
      fresh
        ? `list ${describeFilters(filters)}: still fresh, shown instantly`
        : `list ${describeFilters(filters)}: shown from cache while it refetches`,
    );
  }, [filters, queryClient, logCacheHit]);

  /* ---- Infinite scroll --------------------------------------------------- */

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage } = query;
  const nextPageFailed = query.isFetchNextPageError;

  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasNextPage || isPlaceholderData || nextPageFailed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { root, rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, nextPageFailed, fetchNextPage]);

  /* ---- Selective loading: prefetch on hover intent, fetch on open -------- */

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetchDetail = (id: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: accountKey(id),
        queryFn: ({ signal }) => fetchAccountDetail(id, signal),
        staleTime: DETAIL_STALE_MS,
      });
    }, HOVER_INTENT_MS);
  };

  const cancelPrefetch = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  useEffect(() => cancelPrefetch, []);

  const toggleRow = (row: AccountRow) => {
    if (openId === row.id) {
      setOpened(null);
      return;
    }
    const cached = queryClient.getQueryCache().find({ queryKey: accountKey(row.id), exact: true });
    if (cached?.state.data && !cached.isStaleByTime(DETAIL_STALE_MS)) {
      logCacheHit(`${row.name} details: prefetched on hover, opened instantly`);
    }
    setOpened({ id: row.id, filtersKey });
  };

  /* ---- Render ------------------------------------------------------------ */

  const loadedLabel =
    total === null
      ? "Connecting to Postgres…"
      : total === 0
        ? "No accounts match"
        : `${formatCount(rows.length)} of ${formatCount(total)} accounts loaded`;

  const showingStale = isPlaceholderData && query.isFetching;

  return (
    <div className="overflow-hidden bg-surface">
      {/* minmax(0,1fr) on phones too: an implicit grid column would grow to
          the wide table's full width and get clipped by the card. */}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Try it · Rox AI</p>
              <h4 className="mt-2 text-2xl font-semibold tracking-tight text-text">Query lab</h4>
            </div>
            <p className="inline-flex items-center gap-2 rounded-none border border-line bg-surface-2 px-3 py-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted uppercase">
              <span aria-hidden="true" className="size-1.5 rounded-none bg-accent" />
              Live Supabase Postgres · fictional data
            </p>
          </div>
          <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-muted">
            The kind of table I built at Rox: search, filters and sorting run on the server, pages
            stream in as you scroll, and TanStack Query caches every combination. Scroll, sort,
            search, hover a row and open it, then watch &ldquo;Under the hood&rdquo;.
          </p>

          {/* Controls */}
          <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="sr-only" htmlFor="lab-search">
              Search accounts by name
            </label>
            <input
              id="lab-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search names, e.g. forge"
              autoComplete="off"
              className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-text placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <FilterSelect
              id="lab-industry"
              label="Industry"
              allLabel="All industries"
              value={industry}
              options={INDUSTRIES}
              onChange={setIndustry}
            />
            <FilterSelect
              id="lab-stage"
              label="Stage"
              allLabel="All stages"
              value={stage}
              options={STAGES}
              onChange={setStage}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[0.6875rem] text-faint">
            <span aria-live="polite">{loadedLabel}</span>
            {query.isFetching ? (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <span aria-hidden="true" className="size-1.5 animate-pulse rounded-none bg-accent calm:animate-none" />
                {isFetchingNextPage ? "loading next page" : "fetching"}
              </span>
            ) : null}
          </div>

          {/* Table */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            className="mt-2 h-[26rem] overflow-auto rounded-xl border border-line bg-surface"
          >
            {query.isPending ? (
              <SkeletonRows />
            ) : query.isError && rows.length === 0 ? (
              <LoadError message={query.error.message} onRetry={() => void query.refetch()} />
            ) : (
              <table
                className={`w-full min-w-[46rem] border-collapse text-left text-sm transition-opacity ${
                  showingStale ? "opacity-50" : ""
                }`}
              >
                <thead className="sticky top-0 z-10 bg-surface-2">
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => {
                        const sorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            scope="col"
                            aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                            className={`border-b border-line px-3 py-2 font-mono text-[0.625rem] font-medium tracking-[0.12em] text-faint uppercase ${
                              NUMERIC.has(header.column.id) ? "text-right" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={`inline-flex items-center gap-1 uppercase hover:text-text ${
                                sorted ? "text-accent" : ""
                              }`}
                            >
                              <table.FlexRender header={header} />
                              <span aria-hidden="true">{sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}</span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    const account = row.original;
                    const open = openId === account.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          onClick={() => toggleRow(account)}
                          onMouseEnter={() => prefetchDetail(account.id)}
                          onMouseLeave={cancelPrefetch}
                          className={`cursor-pointer border-b border-line/70 transition-colors hover:bg-surface-2 ${
                            open ? "bg-accent-soft/60 hover:bg-accent-soft/60" : ""
                          }`}
                        >
                          {row.getAllCells().map((cell, index) => (
                            <td
                              key={cell.id}
                              className={`px-3 py-2.5 whitespace-nowrap ${
                                NUMERIC.has(cell.column.id) ? "text-right tabular-nums" : ""
                              } ${index === 0 ? "font-medium text-text" : "text-muted"}`}
                            >
                              {index === 0 ? (
                                <button
                                  type="button"
                                  aria-expanded={open}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleRow(account);
                                  }}
                                  onFocus={() => prefetchDetail(account.id)}
                                  className="inline-flex items-center gap-2 text-left hover:text-accent"
                                >
                                  <span aria-hidden="true" className={`text-faint transition-transform ${open ? "rotate-90" : ""}`}>
                                    ›
                                  </span>
                                  <table.FlexRender cell={cell} />
                                </button>
                              ) : (
                                <table.FlexRender cell={cell} />
                              )}
                            </td>
                          ))}
                        </tr>
                        {open ? (
                          <tr className="border-b border-line bg-accent-soft/30">
                            <td colSpan={columns.length} className="px-4 py-3 sm:px-8">
                              <AccountDetailPanel id={account.id} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Infinite-scroll trigger and its states */}
            <div ref={sentinelRef} className="px-3 py-4 text-center font-mono text-[0.6875rem] text-faint">
              {nextPageFailed ? (
                <span className="inline-flex flex-wrap items-center justify-center gap-3">
                  <span className="text-danger">Couldn&rsquo;t load the next page.</span>
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    className="rounded-none border border-line bg-surface px-3 py-1 text-text hover:border-faint"
                  >
                    Retry
                  </button>
                </span>
              ) : isFetchingNextPage ? (
                "Loading 25 more…"
              ) : rows.length > 0 && !hasNextPage ? (
                "End of results"
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t-[length:var(--rule)] border-ink bg-surface-2/60 p-4 sm:p-6 lg:border-t-0 lg:border-l-[length:var(--rule)]">
          <Inspector />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: string | null;
  options: readonly string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-10 rounded-lg border border-line bg-surface px-2.5 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-px p-3">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="h-9 animate-pulse rounded-none bg-surface-2 calm:animate-none" />
      ))}
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-danger">Couldn&rsquo;t reach the database.</p>
      <p className="max-w-[46ch] text-xs leading-relaxed text-faint">
        {message}. Free Supabase projects pause when idle, so it may just be waking up. Retrying
        usually fixes it.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-none bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-dim"
      >
        Retry
      </button>
    </div>
  );
}
