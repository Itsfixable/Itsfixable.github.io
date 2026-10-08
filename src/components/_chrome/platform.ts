"use client";

import { useSyncExternalStore } from "react";

/**
 * The page is prerendered at build time, so the server cannot know whether the
 * reader is on a Mac.
 *
 * `useSyncExternalStore` is the hydration-safe way to read a client-only fact:
 * the hydration render uses `getServerSnapshot` (false → "Ctrl"), so the
 * server HTML and the first client render always agree, and React re-checks
 * the real snapshot immediately afterwards and re-renders if it differs. No
 * `typeof window` branch in the markup, and no setState inside an effect.
 */

const APPLE = /mac|iphone|ipad|ipod/i;

/** Nothing to subscribe to — the platform does not change mid-session. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  if (typeof navigator === "undefined") return false;
  return APPLE.test(`${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** "⌘" on Apple platforms, "Ctrl" everywhere else. */
export function useModKeyLabel(): string {
  return useIsApplePlatform() ? "⌘" : "Ctrl";
}
