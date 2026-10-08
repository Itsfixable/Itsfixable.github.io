"use client";

import { useSyncExternalStore } from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Deliberately locale-independent and hand-rolled: `Intl.RelativeTimeFormat`
 * would resolve differently on the build machine and in the browser, and this
 * string has to be reproducible from the same inputs anywhere.
 *
 * `now` is a required argument rather than a `Date.now()` default so this stays
 * a pure function of its inputs and is safe to call during render.
 */
export function formatRelative(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);

  if (diff < 45 * SECOND) return "just now";

  const minutes = Math.round(diff / MINUTE);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(diff / HOUR);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(diff / DAY);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(days / 365.25);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/* --------------------------------------------------------------------------
 * A single shared clock.
 *
 * Relative time is a hydration *and* a staleness trap. Formatting during
 * render bakes the prerender's `Date.now()` into the static HTML, and even on
 * the client the string rots the moment it is painted.
 *
 * So the current time is modelled as an external store instead of something
 * render reads directly:
 *   - `getServerNow` returns 0, so the server-rendered markup (and the first,
 *     hydrating client render) contains no timestamp at all — there is nothing
 *     that *can* mismatch.
 *   - `subscribe` starts the clock after hydration and re-reads it on an
 *     interval, which is what keeps "2 min ago" honest.
 *   - render only ever calls the pure `formatRelative(timestamp, now)`; it
 *     never calls `Date.now()` itself.
 *
 * One interval is shared by every consumer and is torn down with the last one.
 * ------------------------------------------------------------------------ */

const TICK_MS = 30 * SECOND;

/** 0 means "the clock has not started", i.e. we are not on the client yet. */
let currentNow = 0;
let timerId: number | null = null;
const listeners = new Set<() => void>();

function subscribeToClock(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  listeners.add(onStoreChange);

  if (timerId === null) {
    currentNow = Date.now();
    timerId = window.setInterval(() => {
      currentNow = Date.now();
      for (const listener of listeners) listener();
    }, TICK_MS);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };
}

const getNow = () => currentNow;
const getServerNow = () => 0;

/**
 * `null` until the client clock is running — render that as nothing rather
 * than as a time that is already wrong.
 */
export function useRelativeTime(timestamp: number | null): string | null {
  const now = useSyncExternalStore(subscribeToClock, getNow, getServerNow);

  if (now === 0 || timestamp === null || timestamp <= 0) return null;
  return formatRelative(timestamp, now);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Absolute date for the card footer. Read in UTC against a fixed month table,
 * so it cannot drift with the viewer's timezone or locale the way
 * `toLocaleDateString` does.
 */
export function formatPushedDate(iso: string | null): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** Epoch ms for sorting; invalid/missing dates sort last. */
export function pushedAtMs(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
