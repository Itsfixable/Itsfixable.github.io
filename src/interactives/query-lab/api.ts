"use client";

import { getLabClient } from "./client";

export const PAGE_SIZE = 25;

/**
 * How long fetched data counts as fresh. Short enough that a visitor sees an
 * entry turn stale in the inspector within a minute of playing.
 */
export const LIST_STALE_MS = 30_000;
export const DETAIL_STALE_MS = 60_000;

/**
 * Selective loading, part one: the list asks for these eight light columns
 * and nothing else. The heavy ones (`DETAIL_COLUMNS`) are fetched per row,
 * only when that row is opened or hovered.
 */
const LIST_COLUMNS = "id,name,industry,stage,region,arr_usd,employees,last_activity_at";
const DETAIL_COLUMNS = "id,notes,contacts,monthly_activity";

export const INDUSTRIES = [
  "Biotech",
  "Energy",
  "Financial services",
  "Food & beverage",
  "Healthcare",
  "Logistics",
  "Manufacturing",
  "Media",
  "Software",
] as const;

export const STAGES = [
  "Prospect",
  "Discovery",
  "Evaluation",
  "Negotiation",
  "Closed won",
  "Closed lost",
] as const;

export type SortKey =
  | "name"
  | "industry"
  | "stage"
  | "arr_usd"
  | "employees"
  | "last_activity_at";

export type AccountFilters = {
  search: string;
  industry: string | null;
  stage: string | null;
  sortId: SortKey;
  sortDesc: boolean;
};

export type AccountRow = {
  id: number;
  name: string;
  industry: string;
  stage: string;
  region: string;
  arr_usd: number;
  employees: number;
  last_activity_at: string;
};

export type AccountDetail = {
  id: number;
  notes: string;
  contacts: { name: string; role: string }[];
  monthly_activity: number[];
};

export type AccountPage = {
  rows: AccountRow[];
  total: number;
  nextOffset: number | null;
};

/** Every server-side input is in the key, so each combination caches separately. */
export const accountsKey = (filters: AccountFilters) => ["accounts", filters] as const;
export const accountKey = (id: number) => ["account", id] as const;

/** `%` and `_` are wildcards in ILIKE; typed literally they should match literally. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function fetchAccountsPage(
  filters: AccountFilters,
  offset: number,
  signal: AbortSignal,
): Promise<AccountPage> {
  let query = getLabClient()
    .from("demo_accounts")
    .select(LIST_COLUMNS, { count: "exact" });

  const search = filters.search.trim();
  if (search) query = query.ilike("name", `%${escapeLike(search)}%`);
  if (filters.industry) query = query.eq("industry", filters.industry);
  if (filters.stage) query = query.eq("stage", filters.stage);

  const { data, error, count } = await query
    .order(filters.sortId, { ascending: !filters.sortDesc })
    // Tiebreak on the primary key so pages never overlap or skip a row.
    .order("id", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)
    .abortSignal(signal)
    // TanStack Query owns retries. Leaving supabase-js's own retry on would
    // stack two retry layers (up to 3 × 3 attempts) and hide them from the log.
    .retry(false)
    .returns<AccountRow[]>();

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const total = count ?? rows.length;
  const loaded = offset + rows.length;
  return { rows, total, nextOffset: loaded < total ? loaded : null };
}

export async function fetchAccountDetail(id: number, signal?: AbortSignal): Promise<AccountDetail> {
  let query = getLabClient()
    .from("demo_accounts")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .retry(false);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.single<AccountDetail>();
  if (error) throw new Error(error.message);
  return data;
}
