"use client";

import { useEffect } from "react";
import { QueryProvider } from "./QueryProvider";
import { LenisProvider } from "./LenisProvider";
import { useUiStore } from "@/store/ui";
import { REDUCED_MOTION_QUERY } from "@/lib/motion-mode";
import { useIsoLayoutEffect } from "@/lib/motion";

/**
 * Corrects the store from localStorage + the OS motion preference, and keeps
 * the site in step if the user changes that preference while the page is open.
 *
 * The first pass runs in a layout effect so the real mode is committed before
 * the browser paints: a calm-mode user gets no wild frame, and because the
 * server and first client render agree, there is nothing to mismatch.
 */
function UiSync() {
  useIsoLayoutEffect(() => {
    useUiStore.getState().syncFromEnvironment();
  }, []);

  useEffect(() => {
    const sync = () => useUiStore.getState().syncFromEnvironment();
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <UiSync />
      <LenisProvider>{children}</LenisProvider>
    </QueryProvider>
  );
}
