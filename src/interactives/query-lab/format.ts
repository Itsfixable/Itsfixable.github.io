import type { AccountFilters, SortKey } from "./api";

const counts = new Intl.NumberFormat("en-US");
const dates = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** 4_530_000 → "$4.5M", 236_000 → "$236k". */
export function formatArr(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(usd / 1000)}k`;
}

export const formatCount = (n: number) => counts.format(n);

/** Absolute, not relative: the demo data is anchored to a fixed date. */
export const formatDate = (iso: string) => dates.format(new Date(iso));

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatAgo(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 2) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export const SORT_LABELS: Record<SortKey, string> = {
  name: "name",
  industry: "industry",
  stage: "stage",
  arr_usd: "ARR",
  employees: "employees",
  last_activity_at: "last activity",
};

/** A short human label for one combination of server-side inputs. */
export function describeFilters(filters: AccountFilters): string {
  const parts = [`by ${SORT_LABELS[filters.sortId]} ${filters.sortDesc ? "↓" : "↑"}`];
  if (filters.search) parts.push(`"${filters.search}"`);
  if (filters.industry) parts.push(filters.industry);
  if (filters.stage) parts.push(filters.stage);
  return parts.join(" · ");
}
