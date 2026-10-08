"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

/** A real minus sign (U+2212), not a hyphen. */
export const MINUS_SIGN = "−";

type MetricCounterProps = {
  /** Signed value. Negative renders with a real minus sign. */
  value: number;
  unit: string;
  /** Screen-reader text only; the visual label sits outside the counter. */
  label: string;
  className?: string;
};

/**
 * Counts to `value` once, the first time it scrolls into view.
 *
 * Calm mode never ticks: the rendered value is *derived* from the store rather
 * than waiting on an effect, so the first painted frame already reads the
 * final number (the store is corrected in a layout effect, before paint). The
 * `animate()` call still runs, collapsed to a single frame by `calmTransition`,
 * which keeps one code path for both modes.
 *
 * `useInView({ once: true })` is what makes it fire exactly once per load.
 *
 * The digits sit over an invisible sizer spelling the final magnitude, so the
 * unit cannot shift while the number gains a digit.
 */
export function MetricCounter({ value, unit, label, className }: MetricCounterProps) {
  const calm = useIsCalm();
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const negative = value < 0;
  const target = Math.abs(value);

  const [counted, setCounted] = useState<number | null>(null);

  useEffect(() => {
    // Calm mode does not wait for the viewport — there is nothing to watch.
    if (!calm && !inView) return;

    const controls = animate(calm ? target : 0, target, {
      ...calmTransition({ duration: durations.slow * 1.5, ease: EASE_OUT }, calm),
      onUpdate: (latest) => setCounted(latest),
      onComplete: () => setCounted(target),
    });
    return () => controls.stop();
  }, [calm, inView, target]);

  const displayed = counted ?? (calm ? target : 0);
  const sizer = String(target);
  const digits = String(Math.round(displayed));

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">
        {negative ? MINUS_SIGN : ""}
        {target}
        {unit} {label}
      </span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {negative ? <span>{MINUS_SIGN}</span> : null}
        <span className="relative inline-block tabular-nums">
          {/* Reserves the final width so `%` cannot move mid-count. */}
          <span className="invisible">{sizer}</span>
          <span className="absolute inset-y-0 left-0">{digits}</span>
        </span>
        <span>{unit}</span>
      </span>
    </p>
  );
}
