"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { ecoPulse } from "@/data/profile";
import { EASE_OUT, calmTransition, durations, staggerParent } from "@/lib/motion";
import { useIsCalm } from "@/store/ui";

/* ---------------------------------------------------------------------------
 * Scales. The plot is a 100x100 viewBox stretched to its container
 * (`preserveAspectRatio="none"`), which keeps bar geometry proportional at any
 * width. Everything that has to stay legible — tick labels, bucket labels, the
 * legend — is real HTML text at a real font size, laid out on the same grid, so
 * nothing shrinks to 5px at 375px and nothing collides.
 * ------------------------------------------------------------------------- */

const { chart, headlineMetric } = ecoPulse;
const data = chart.data;
const series = chart.series;

type Bucket = (typeof data)[number];
type SeriesKey = (typeof series)[number]["key"];

/** The one series that earns the accent. */
const ACCENT_SERIES: SeriesKey = "withEcoPulse";

function readValue(bucket: Bucket, key: SeriesKey): number {
  return bucket[key];
}

const TICK_STEP = 30;
const peak = Math.max(
  ...data.flatMap((bucket) => series.map((s) => readValue(bucket, s.key))),
);
const axisMax = Math.ceil(peak / TICK_STEP) * TICK_STEP;
const ticks = Array.from({ length: axisMax / TICK_STEP + 1 }, (_, i) => i * TICK_STEP);

const GROUP_W = 100 / data.length;
const BAR_W = GROUP_W * 0.3;
const BAR_GAP = GROUP_W * 0.06;
const GROUP_INNER = BAR_W * series.length + BAR_GAP * (series.length - 1);
const GROUP_PAD = (GROUP_W - GROUP_INNER) / 2;

type Bar = { id: string; x: number; height: number; accent: boolean };

const bars: Bar[] = data.flatMap((bucket, bucketIndex) =>
  series.map((s, seriesIndex) => ({
    id: `${bucket.bucket}-${s.key}`,
    x: bucketIndex * GROUP_W + GROUP_PAD + seriesIndex * (BAR_W + BAR_GAP),
    height: (readValue(bucket, s.key) / axisMax) * 100,
    accent: s.key === ACCENT_SERIES,
  })),
);

const baselineValues = data.map((bucket) => bucket.baseline);
const ecoValues = data.map((bucket) => bucket.withEcoPulse);

const ARIA_LABEL = [
  `Grouped bar chart, ${chart.unit}, across ${data.length} weekly buckets.`,
  `${series[0].label} holds between ${Math.min(...baselineValues)} and ${Math.max(...baselineValues)}.`,
  `${series[1].label} falls from ${ecoValues[0]} to ${ecoValues[ecoValues.length - 1]}.`,
  chart.isPlaceholder ? "Values are illustrative." : "",
]
  .filter(Boolean)
  .join(" ");

/** Shared height for the tick-label column and the plot, so they line up. */
const PLOT_HEIGHT = "h-56 sm:h-72 lg:h-[22rem]";

export function FuelChart() {
  const calm = useIsCalm();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  /* Calm mode skips the trigger entirely: the bars are simply drawn. */
  const grown = calm || inView;

  const groupVariants: Variants = staggerParent(calm, 0.05);
  const barVariants: Variants = {
    hidden: { scaleY: 0 },
    shown: {
      scaleY: 1,
      transition: calmTransition({ duration: durations.slow, ease: EASE_OUT }, calm),
    },
  };

  return (
    <figure ref={ref} className="card p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
        <p className="eyebrow">{headlineMetric.label} by week</p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs text-muted sm:text-sm">
              <span
                aria-hidden="true"
                className={
                  s.key === ACCENT_SERIES
                    ? "h-2.5 w-2.5 shrink-0 rounded-[2px] bg-accent"
                    : "h-2.5 w-2.5 shrink-0 rounded-[2px] bg-surface-3 ring-1 ring-line"
                }
              />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-4">
        {/* Row 1 — the y-axis unit, sitting over its own tick column. */}
        <p className="pb-2 text-right font-mono text-[10px] leading-tight text-faint sm:text-xs">
          {chart.unit}
        </p>
        <div aria-hidden="true" />

        {/* Row 2 — ticks pinned to the same percentages as the SVG gridlines. */}
        <div className={`relative ${PLOT_HEIGHT}`}>
          {ticks.map((tick) => (
            <span
              key={tick}
              style={{ bottom: `${(tick / axisMax) * 100}%` }}
              className="absolute right-0 translate-y-1/2 font-mono text-[10px] tabular-nums text-faint sm:text-xs"
            >
              {tick}
            </span>
          ))}
        </div>

        <div className={`relative ${PLOT_HEIGHT}`}>
          <svg
            role="img"
            aria-label={ARIA_LABEL}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 block h-full w-full overflow-visible"
          >
            {ticks.map((tick) => {
              const y = 100 - (tick / axisMax) * 100;
              return (
                <line
                  key={tick}
                  x1={0}
                  x2={100}
                  y1={y}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                  opacity={tick === 0 ? 1 : 0.55}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            <motion.g
              initial="hidden"
              animate={grown ? "shown" : "hidden"}
              variants={groupVariants}
            >
              {bars.map((bar) => (
                /* The static <g> carries the position so the animated rect only
                   ever owns a transform — no attribute/transform ambiguity. */
                <g key={bar.id} transform={`translate(${bar.x}, ${100 - bar.height})`}>
                  <motion.rect
                    width={BAR_W}
                    height={bar.height}
                    fill={bar.accent ? "var(--color-accent)" : "var(--color-surface-3)"}
                    variants={barVariants}
                    style={{ originY: 1 }}
                  />
                </g>
              ))}
            </motion.g>
          </svg>
        </div>

        {/* Row 3 — bucket labels, one per bar group. */}
        <div aria-hidden="true" />
        <ul
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0,1fr))` }}
          className="mt-3 grid"
        >
          {data.map((bucket) => (
            <li
              key={bucket.bucket}
              className="truncate px-0.5 text-center font-mono text-[10px] text-faint sm:text-xs"
            >
              {bucket.bucket}
            </li>
          ))}
        </ul>
      </div>

      {/*
        The numbers, reachable without the SVG. Two things fight the 1px box
        Tailwind's `sr-only` is trying to clip this down to:
          1. `table-layout: auto` (the default) treats an explicit width as a
             minimum, not a cap, and lays the table out at its content's
             natural width — `table-fixed` stops that.
          2. `sr-only` also sets `white-space: nowrap` on the table, which the
             <caption> inherits, forcing its whole sentence onto one
             unbreakable line. A table's wrapper box must be at least as wide
             as its caption's longest line *regardless* of table-layout, so
             that single long line alone was pushing this table out to its
             content width — `whitespace-normal` on the caption lets it wrap
             instead. Together these were inflating the page's horizontal
             scrollWidth by ~25px on mobile, even though nothing was visible.
      */}
      <table className="sr-only table-fixed">
        <caption className="whitespace-normal">
          {headlineMetric.label} by week, in {chart.unit}
          {chart.isPlaceholder ? " (illustrative values)" : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label} ({chart.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((bucket) => (
            <tr key={bucket.bucket}>
              <th scope="row">{bucket.bucket}</th>
              {series.map((s) => (
                <td key={s.key}>{readValue(bucket, s.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {chart.isPlaceholder ? (
        <figcaption className="mt-7 flex flex-col gap-2 border-t border-line pt-5 text-xs leading-relaxed text-faint sm:flex-row sm:items-start sm:gap-3">
          <span className="w-fit shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">
            Illustrative
          </span>
          <span className="max-w-[62ch]">
            The series shape is representative of the measured trend, not the logged data. Real
            per-day numbers are still to come, so read the direction of the gap rather than any
            single bar.
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
