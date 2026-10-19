"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import { useIsCalm } from "@/store/ui";
import {
  DIESEL_L_PER_KWH,
  FIXED_SCHEDULE,
  HOURS,
  SHIFTABLE,
  SOLAR_KW,
  TANK_M3,
  WIND_KW,
  baseLoadKw,
  hoursPlaced,
  hoursToRow,
  simulate,
  type HourResult,
  type Schedule,
  type ShiftableId,
} from "./engine";
import { PlayerBar } from "./PlayerBar";

/**
 * Three.js is the heaviest thing on the page, so the island streams in as its
 * own chunk after the game itself is already usable.
 */
const IslandScene = dynamic(() => import("./island/IslandScene").then((module) => module.IslandScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="eyebrow animate-pulse calm:animate-none">Loading the island</p>
    </div>
  ),
});

/** 24 hours in 12 seconds. */
const PLAY_STEP_MS = 500;
/** The hour with the most going on in the timer schedule: sun up, generator on. */
const START_HOUR = 8;

/**
 * The game's rule, matched to what EcoPulse actually delivered that day: it
 * ran desalination 9 hours and the ice plant 7, pausing one hour of each
 * rather than burn diesel. A search over every schedule shows 178.93 L is the
 * floor at those hours, so EcoPulse's plan is optimal and can only be tied.
 */
const REQUIRED: Record<ShiftableId, number> = { desal: 9, ice: 7 };
const ECOPULSE_L = 178.93;
const TIMER_L = simulate(FIXED_SCHEDULE).dieselL;

/** One optimal schedule (found by exhaustive local search), for the reveal. */
const ECOPULSE_SCHEDULE: Schedule = {
  desal: hoursToRow([9, 10, 11, 12, 13, 14, 15, 16, 17]),
  ice: hoursToRow([10, 11, 12, 13, 14, 15, 16]),
};

const ROWS: ShiftableId[] = ["desal", "ice"];

const HOUR_LABELS = Array.from({ length: HOURS }, (_, h) => {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}` : `${h - 12}`;
});

function hourName(h: number): string {
  if (h === 0) return "midnight";
  if (h === 12) return "noon";
  return `${h % 12} ${h < 12 ? "am" : "pm"}`;
}

const clean = SOLAR_KW.map((solar, h) => solar + WIND_KW[h]);
const CHART_MAX = Math.max(...clean, ...Array.from({ length: HOURS }, (_, h) => baseLoadKw(h) + 340));

function formatL(litres: number) {
  return `${Math.round(litres)} L`;
}

/** Screen-reader version of what the island shows for one hour. */
function describeHour(h: number, r: HourResult): string {
  const parts = [`sun ${Math.round(r.solarKw)} kW`, `wind ${Math.round(r.windKw)} kW`];
  if (r.batteryKw > 1) parts.push(`battery ${Math.round(r.batteryKw)} kW`);
  if (r.dieselKw > 0.5) parts.push(`generator ${Math.round(r.dieselKw)} kW`);
  const running = [r.ran.desal ? "desalination" : null, r.ran.ice ? "ice plant" : null].filter(Boolean);
  return `${hourName(h)}: ${parts.join(", ")}${running.length ? `; ${running.join(" and ")} running` : ""}.`;
}

function hourStatus(r: HourResult): { text: string; diesel: boolean } {
  if (r.dieselKw > 0.5) {
    return { text: `Generator on: ${Math.round(r.dieselKw * DIESEL_L_PER_KWH)} L of diesel this hour`, diesel: true };
  }
  const sources = [r.solarKw > 1 ? "sun" : null, r.windKw > 1 ? "wind" : null, r.batteryKw > 1 ? "battery" : null].filter(Boolean);
  return { text: `Running on ${sources.join(", ").replace(/, ([^,]*)$/, " and $1")}`, diesel: false };
}

export function BeatTheSolver() {
  const calm = useIsCalm();
  const [schedule, setSchedule] = useState<Schedule>(() => ({
    desal: [...FIXED_SCHEDULE.desal],
    ice: [...FIXED_SCHEDULE.ice],
  }));
  const [revealed, setRevealed] = useState(false);
  const [hour, setHour] = useState(START_HOUR);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const result = useMemo(() => simulate(schedule), [schedule]);
  const placed = { desal: hoursPlaced(schedule.desal), ice: hoursPlaced(schedule.ice) };
  const complete = placed.desal >= REQUIRED.desal && placed.ice >= REQUIRED.ice;
  const tied = complete && result.dieselL <= ECOPULSE_L + 0.5;
  const beatTimer = complete && result.dieselL < TIMER_L - 0.5;

  /* ---- The hour the island shows --------------------------------------- */

  // The playback interval reads these, so they mirror state synchronously.
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hourRef = useRef(START_HOUR);
  const repeatRef = useRef(false);

  const goTo = (h: number) => {
    const clamped = Math.max(0, Math.min(HOURS - 1, h));
    hourRef.current = clamped;
    setHour(clamped);
  };

  const stopPlaying = () => {
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = null;
    setPlaying(false);
  };

  /** Like a music player: resume from where you are, restart if at the end. */
  const togglePlay = () => {
    if (playTimer.current) {
      stopPlaying();
      return;
    }
    if (hourRef.current >= HOURS - 1) goTo(0);
    setPlaying(true);
    playTimer.current = setInterval(() => {
      const next = hourRef.current + 1;
      if (next < HOURS) {
        goTo(next);
      } else if (repeatRef.current) {
        goTo(0);
      } else {
        stopPlaying();
      }
    }, PLAY_STEP_MS);
  };

  const toggleRepeat = () => {
    repeatRef.current = !repeatRef.current;
    setRepeat(repeatRef.current);
  };

  useEffect(() => () => {
    if (playTimer.current) clearInterval(playTimer.current);
  }, []);

  /** Seeking (scrubber, skip buttons, hour labels) keeps playing, like a music player. */
  const seek = (h: number) => goTo(h);

  /** Editing the schedule pins the island to the hour being edited. */
  const selectHour = (h: number) => {
    if (playTimer.current) stopPlaying();
    goTo(h);
  };

  /* ---- Painting: press on a cell, drag across others ---------------------- */

  const paint = useRef<{ row: ShiftableId; value: boolean } | null>(null);

  const setCell = (row: ShiftableId, hour: number, value: boolean) => {
    setSchedule((current) => {
      if (current[row][hour] === value) return current;
      const next = [...current[row]];
      next[hour] = value;
      return { ...current, [row]: next };
    });
  };

  useEffect(() => {
    const stop = () => {
      paint.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const onPointerDown = (row: ShiftableId, hour: number) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // Release implicit touch capture so dragging reaches neighbouring cells.
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const value = !schedule[row][hour];
    paint.current = { row, value };
    setCell(row, hour, value);
    selectHour(hour);
  };

  const onPointerEnter = (row: ShiftableId, hour: number) => () => {
    if (paint.current?.row !== row) return;
    setCell(row, hour, paint.current.value);
    selectHour(hour);
  };

  const onKeyDown = (row: ShiftableId, hour: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (hour + step + HOURS) % HOURS;
    document.getElementById(`bts-${row}-${next}`)?.focus();
    selectHour(next);
  };

  const load = (next: Schedule, reveal = false) => {
    setSchedule({ desal: [...next.desal], ice: [...next.ice] });
    setRevealed(reveal);
  };

  /* ---- Render ------------------------------------------------------------ */

  const shown = result.hours[hour];
  const status = hourStatus(shown);

  const dieselPeak = Math.max(1, ...result.hours.map((h) => h.dieselKw));
  const meterPct = Math.min(100, (result.dieselL / TIMER_L) * 100);

  let verdict: string;
  if (!complete) {
    const missing = ROWS.filter((row) => placed[row] < REQUIRED[row]).map(
      (row) => `${REQUIRED[row] - placed[row]} more ${SHIFTABLE[row].name.toLowerCase()} hour${REQUIRED[row] - placed[row] === 1 ? "" : "s"}`,
    );
    verdict = `Place ${missing.join(" and ")}.`;
  } else if (tied) {
    verdict = revealed
      ? "That's EcoPulse's plan. On this forecast nothing does better."
      : "You matched the solver. That's the best any schedule can do today: EcoPulse's 179 L is the floor.";
  } else if (beatTimer) {
    verdict = `${Math.round(((TIMER_L - result.dieselL) / TIMER_L) * 100)}% less diesel than the timer. EcoPulse gets to ${formatL(ECOPULSE_L)}. Where is the generator still running?`;
  } else {
    verdict = "No better than the timer yet. Look where the diesel bars are and move work toward the sun.";
  }

  return (
    <div className="overflow-hidden bg-surface p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <p className="eyebrow">Try it · EcoPulse</p>
          <h4 className="mt-2 text-2xl font-semibold tracking-tight text-text">Can you match the solver?</h4>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You run Ta&rsquo;ū for a day. Run desalination for at least {REQUIRED.desal} hours and the
            ice plant for {REQUIRED.ice}: click or drag across the hours. Whatever you schedule
            runs on sun and wind first, then the battery, then the diesel generator. It&rsquo;s the
            same forecast and the same dispatch code as the real EcoPulse.
          </p>
        </div>

        {/* Score */}
        <div className="w-full min-w-[15rem] sm:w-auto" aria-live="polite">
          <p className="font-mono text-[0.625rem] tracking-[0.14em] text-faint uppercase">Your diesel</p>
          <p className={`mt-1 text-5xl font-semibold tabular-nums ${tied ? "text-accent" : "text-text"}`}>
            {complete ? formatL(result.dieselL) : "—"}
          </p>
          <div className="relative mt-3 h-2 rounded-none bg-surface-3">
            <div
              className={`h-full rounded-none ${tied ? "bg-accent" : "bg-ink"} ${calm ? "" : "transition-[width] duration-300"}`}
              style={{ width: complete ? `${meterPct}%` : "0%" }}
            />
            <span
              aria-hidden="true"
              className="absolute top-[-4px] h-4 w-0.5 bg-accent"
              style={{ left: `${(ECOPULSE_L / TIMER_L) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[0.625rem] text-faint">
            <span className="text-accent">EcoPulse {formatL(ECOPULSE_L)}</span>
            <span>Timer {formatL(TIMER_L)}</span>
          </div>
        </div>
      </div>

      {/* The island at the selected hour */}
      <div className="relative mt-8 h-72 overflow-hidden rounded-xl border border-line bg-[#dfe7ee] sm:h-80 lg:h-[24rem]">
        <IslandScene hour={hour} result={shown} calm={calm} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 p-3 sm:p-4">
          <div className="max-w-[75%] rounded-lg border border-line/70 bg-surface/90 px-3 py-2 shadow-sm sm:max-w-none">
            <p className="font-mono text-[0.625rem] tracking-[0.14em] text-faint uppercase">Ta&rsquo;ū at</p>
            <p className="text-xl font-semibold tabular-nums text-text sm:text-2xl">{hourName(hour)}</p>
            <p className={`mt-0.5 text-xs ${status.diesel ? "font-medium text-danger" : "text-muted"}`}>{status.text}</p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3 sm:p-4">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-surface/85 px-2.5 py-1.5 text-[0.6875rem] text-muted">
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 border border-ink bg-m-yellow" />Sun</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 border border-ink bg-accent" />Wind, battery, your loads</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 border border-ink bg-danger" />Diesel</li>
          </ul>
          <p className="rounded-lg bg-surface/85 px-2.5 py-1.5 text-[0.6875rem] text-muted [@media(pointer:coarse)]:hidden">
            Drag to turn · hover a beacon
          </p>
        </div>

        <p className="sr-only" aria-live={playing ? "off" : "polite"}>
          {describeHour(hour, shown)}
        </p>
      </div>

      {/* Transport for the day, under the map */}
      <div className="mt-3">
        <PlayerBar
          hour={hour}
          playing={playing}
          repeat={repeat}
          dieselHours={result.hours.map((h) => h.dieselKw > 0.5)}
          hourName={hourName}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onToggleRepeat={toggleRepeat}
        />
      </div>

      {/* The day */}
      <div data-lenis-prevent className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[40rem]">
          {/* Supply vs base demand */}
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-3">
            <p className="pb-1 font-mono text-[0.625rem] leading-tight tracking-[0.1em] text-faint uppercase">
              Sun + wind
              <br />
              <span className="text-muted normal-case tracking-normal">vs. homes, clinic, school</span>
            </p>
            <div className="relative grid h-20 grid-cols-24 items-end gap-0.5" aria-hidden="true">
              {clean.map((kw, h) => (
                <div key={h} className={`relative h-full rounded-sm ${h === hour ? "bg-text/[0.07]" : ""}`}>
                  <div
                    className="absolute inset-x-0 bottom-0 bg-sun"
                    style={{ height: `${(kw / CHART_MAX) * 100}%` }}
                  />
                  <div
                    className="absolute inset-x-0 border-t-2 border-dashed border-ink"
                    style={{ bottom: `${(baseLoadKw(h) / CHART_MAX) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Schedulable rows */}
          {ROWS.map((row) => (
            <div key={row} className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
              <div>
                <p className="text-sm font-medium text-text">{SHIFTABLE[row].name}</p>
                <p
                  className={`font-mono text-[0.625rem] ${placed[row] >= REQUIRED[row] ? "text-accent" : "text-faint"}`}
                >
                  {placed[row]}/{REQUIRED[row]}+ h · {SHIFTABLE[row].kw} kW
                </p>
              </div>
              <div role="group" aria-label={`${SHIFTABLE[row].name} hours`} className="grid grid-cols-24 gap-0.5">
                {schedule[row].map((on, h) => (
                  <button
                    key={h}
                    id={`bts-${row}-${h}`}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${SHIFTABLE[row].name} at ${hourName(h)}`}
                    onPointerDown={onPointerDown(row, h)}
                    onPointerEnter={onPointerEnter(row, h)}
                    onKeyDown={onKeyDown(row, h)}
                    onFocus={() => selectHour(h)}
                    onClick={(event) => {
                      // Keyboard activation (Enter/Space) arrives as a click with
                      // detail 0; pointer presses were handled on pointerdown.
                      if (event.detail === 0) setCell(row, h, !on);
                    }}
                    className={`h-9 touch-none rounded-sm border transition-colors ${
                      on
                        ? "border-accent bg-accent"
                        : "border-line bg-surface-2 hover:border-faint hover:bg-surface-3"
                    } ${h === hour ? "outline-[3px] outline-ink outline-offset-1 outline" : ""}`}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Where the diesel burns */}
          <div className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3">
            <p className="flex items-center gap-1.5 pt-1 font-mono text-[0.625rem] tracking-[0.1em] text-faint uppercase">
              <span aria-hidden="true" className="size-2.5 shrink-0 border border-ink bg-danger" />
              Diesel burned
            </p>
            <div className="grid h-12 grid-cols-24 items-start gap-0.5" aria-hidden="true">
              {result.hours.map((hourResult, h) => (
                <div key={h} className={`h-full rounded-sm ${h === hour ? "bg-text/[0.07]" : ""}`}>
                  <div
                    className={`w-full bg-danger ${calm ? "" : "transition-[height] duration-300"}`}
                    style={{ height: `${hourResult.dieselKw > 0.5 ? Math.max(8, (hourResult.dieselKw / dieselPeak) * 100) : 0}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hour axis (labels only; the player bar picks the hour) */}
          <div className="mt-1 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3" aria-hidden="true">
            <span />
            <div className="grid grid-cols-24 gap-0.5 font-mono text-[0.625rem] text-faint">
              {HOUR_LABELS.map((label, h) => (
                <span key={h} className={`text-center ${h === hour ? "font-medium text-text" : ""}`}>
                  {h % 3 === 0 || h === hour ? label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between">
        <p className={`max-w-[62ch] text-sm leading-relaxed ${tied ? "font-medium text-accent" : "text-text"}`}>
          {verdict}
          <span className="mt-1 block text-xs text-faint">
            Water tank low point: {Math.round(result.tankMinM3)} of {TANK_M3} m³ · CO₂{" "}
            {complete ? `${Math.round(result.co2Kg)} kg` : "—"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load(FIXED_SCHEDULE)}
            className="rounded-none border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-text hover:border-faint"
          >
            Reset to the timer
          </button>
          <button
            type="button"
            onClick={() => load({ desal: hoursToRow([]), ice: hoursToRow([]) })}
            className="rounded-none border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-text hover:border-faint"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => load(ECOPULSE_SCHEDULE, true)}
            className="rounded-none bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-dim"
          >
            Show EcoPulse&rsquo;s plan
          </button>
        </div>
      </div>
    </div>
  );
}
