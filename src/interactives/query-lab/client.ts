"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useLabStore } from "./store";

/**
 * The public Supabase project URL and anon key, inlined at build time.
 * The anon key is meant to ship to browsers: the only table it can reach,
 * `demo_accounts`, is read-only for it (see supabase/seed.sql).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isLabConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

function sleep(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** `https://x.supabase.co/rest/v1/demo_accounts?select=…` → `demo_accounts?select=…` */
function describe(url: URL): string {
  const path = url.pathname.replace(/^\/rest\/v1\//, "");
  const query = decodeURIComponent(url.search.replace(/^\?/, ""));
  return query ? `${path}?${query}` : path;
}

/** `0-24/2000` → 25 rows in this response. */
function rowsFromContentRange(header: string | null): number | null {
  const match = header?.match(/^(\d+)-(\d+)\//);
  if (!match) return header?.startsWith("*/") ? 0 : null;
  return Number(match[2]) - Number(match[1]) + 1;
}

/**
 * Wraps `fetch` so every request the Supabase client makes is timed and
 * logged, and so the chaos controls (extra delay, injected failure) act on
 * real requests rather than on a simulation.
 */
async function instrumentedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const { delayMs, takeFailure, logRequest } = useLabStore.getState();
  const started = performance.now();
  const path = describe(url);
  const elapsed = () => Math.round(performance.now() - started);

  try {
    if (delayMs > 0) await sleep(delayMs, signal);

    if (takeFailure()) {
      logRequest({ path, status: 503, ms: elapsed(), rows: null, bytes: null, injected: true });
      return new Response(JSON.stringify({ message: "Injected failure (the lab's chaos button)" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(input, init);
    const body = await response.clone().arrayBuffer();
    logRequest({
      path,
      status: response.status,
      ms: elapsed(),
      rows: rowsFromContentRange(response.headers.get("content-range")),
      bytes: body.byteLength,
      injected: false,
    });
    return response;
  } catch (error) {
    const cancelled = signal?.aborted ?? false;
    logRequest({
      path,
      status: cancelled ? "cancelled" : "error",
      ms: elapsed(),
      rows: null,
      bytes: null,
      injected: false,
    });
    throw error;
  }
}

let client: SupabaseClient | null = null;

/** Created on first use, so a page without the lab never builds a client. */
export function getLabClient(): SupabaseClient {
  if (!isLabConfigured) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: instrumentedFetch },
    // A read-only public demo has no users: skip session storage and refresh.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
