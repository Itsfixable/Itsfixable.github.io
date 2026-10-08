"use client";

import { useState } from "react";
import { useIsoLayoutEffect } from "@/lib/motion";

/** The breakpoint below which the rail is a plain vertical column. */
export const PIN_QUERY = "(min-width: 768px)";

/**
 * A pinned rail also needs vertical room: the cards live inside a `h-screen`
 * viewport, so a short landscape phone that happens to be 768px *wide* would
 * get a pin with nowhere to put the content. Those fall back to the stacked
 * column too.
 */
export const PIN_HEIGHT_QUERY = "(min-height: 42rem)";

/**
 * True only once the client has confirmed a roomy viewport.
 *
 * Starts `false` on purpose, so the server render and the first client render
 * agree, and so the layout is the safe stacked one if JS never runs at all.
 * The caller still has to AND this with `!calm`.
 */
export function useCanPin(): boolean {
  const [canPin, setCanPin] = useState(false);

  useIsoLayoutEffect(() => {
    if (!window.matchMedia) return;

    const wide = window.matchMedia(PIN_QUERY);
    const tall = window.matchMedia(PIN_HEIGHT_QUERY);
    const sync = () => setCanPin(wide.matches && tall.matches);

    sync();
    wide.addEventListener("change", sync);
    tall.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      tall.removeEventListener("change", sync);
    };
  }, []);

  return canPin;
}
