"use client";

import { create } from "zustand";

/**
 * One line in the lab's activity feed: either a real request that went to
 * Supabase, or a moment where TanStack Query answered from its cache and no
 * request was sent at all. Showing both in one timeline is the point of the
 * demo — the gaps between network lines are the cache doing its job.
 */
export type ActivityEntry =
  | {
      id: number;
      kind: "network";
      at: number;
      /** Decoded PostgREST path, e.g. `demo_accounts?select=…&offset=25`. */
      path: string;
      status: number | "error" | "cancelled";
      ms: number;
      rows: number | null;
      bytes: number | null;
      /** True when the "fail the next request" control produced this line. */
      injected: boolean;
    }
  | {
      id: number;
      kind: "cache";
      at: number;
      label: string;
    };

const MAX_ENTRIES = 40;

type LabState = {
  /** Extra latency added before every request, so loading states are visible. */
  delayMs: number;
  /** When true, the next request fails with a 503 instead of reaching Supabase. */
  failNext: boolean;
  activity: ActivityEntry[];
  requestCount: number;
  cacheHitCount: number;

  setDelay: (ms: number) => void;
  armFailure: () => void;
  /** Returns true (and disarms) if a failure was armed. */
  takeFailure: () => boolean;
  logRequest: (entry: Omit<Extract<ActivityEntry, { kind: "network" }>, "id" | "kind" | "at">) => void;
  logCacheHit: (label: string) => void;
};

let nextId = 1;

export const useLabStore = create<LabState>((set, get) => ({
  delayMs: 0,
  failNext: false,
  activity: [],
  requestCount: 0,
  cacheHitCount: 0,

  setDelay: (ms) => set({ delayMs: ms }),
  armFailure: () => set({ failNext: true }),
  takeFailure: () => {
    if (!get().failNext) return false;
    set({ failNext: false });
    return true;
  },
  logRequest: (entry) =>
    set((state) => ({
      activity: [
        { ...entry, id: nextId++, kind: "network" as const, at: Date.now() },
        ...state.activity,
      ].slice(0, MAX_ENTRIES),
      requestCount: state.requestCount + (entry.status === "cancelled" ? 0 : 1),
    })),
  logCacheHit: (label) =>
    set((state) => ({
      activity: [
        { id: nextId++, kind: "cache" as const, at: Date.now(), label },
        ...state.activity,
      ].slice(0, MAX_ENTRIES),
      cacheHitCount: state.cacheHitCount + 1,
    })),
}));
