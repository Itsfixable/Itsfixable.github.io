"use client";

import { useMotionMode, useToggleMotionMode } from "@/store/ui";
import { IconMotion } from "./icons";

/**
 * The brake pedal for every animation on the page. Deliberately a labelled,
 * word-bearing switch rather than a mystery glyph: a reader who feels queasy
 * should be able to find it without guessing.
 *
 * `motionMode` is "wild" for the server render and the first client render and
 * is corrected in a layout effect before paint, so reading it here is safe.
 */
export function MotionToggle({ className = "" }: { className?: string }) {
  const mode = useMotionMode();
  const toggle = useToggleMotionMode();
  const calm = mode === "calm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={calm}
      onClick={toggle}
      title={
        calm
          ? "Motion is calm — animations are reduced. Click for wild motion."
          : "Motion is wild — the full animation design. Click for calm motion."
      }
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-2.5 transition-colors sm:px-3 ${
        calm
          ? "border-line bg-surface-3 text-text"
          : "border-line bg-surface-2 text-muted hover:border-faint hover:text-text"
      } ${className}`}
    >
      <IconMotion calm={calm} className="shrink-0" />
      <span className="sr-only text-xs sm:not-sr-only">Motion</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text">
        {mode}
      </span>
    </button>
  );
}
