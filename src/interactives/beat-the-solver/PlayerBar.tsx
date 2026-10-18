"use client";

import { HOURS } from "./engine";

type PlayerBarProps = {
  hour: number;
  playing: boolean;
  repeat: boolean;
  /** Hours where the current plan burns diesel, marked on the timeline. */
  dieselHours: readonly boolean[];
  hourName: (hour: number) => string;
  onTogglePlay: () => void;
  onSeek: (hour: number) => void;
  onToggleRepeat: () => void;
};

/* Simple geometric icons drawn for this bar (16 × 16 grid). */

function Icon({ children, stroke = false }: { children: React.ReactNode; stroke?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeWidth={stroke ? 1.6 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const IconPrevious = () => (
  <Icon>
    <rect x="2" y="2.5" width="2" height="11" rx="0.6" />
    <path d="M14 2.5v11L5.2 8z" />
  </Icon>
);

const IconNext = () => (
  <Icon>
    <path d="M2 2.5v11L10.8 8z" />
    <rect x="12" y="2.5" width="2" height="11" rx="0.6" />
  </Icon>
);

const IconPlay = () => (
  <Icon>
    <path d="M4.5 2.2v11.6L13.6 8z" />
  </Icon>
);

const IconPause = () => (
  <Icon>
    <rect x="3.2" y="2.2" width="3.4" height="11.6" rx="0.8" />
    <rect x="9.4" y="2.2" width="3.4" height="11.6" rx="0.8" />
  </Icon>
);

const IconRepeat = () => (
  <Icon stroke>
    <path d="M2.5 7.5V6A2.5 2.5 0 0 1 5 3.5h8M10.5 1 13 3.5 10.5 6M13.5 8.5V10a2.5 2.5 0 0 1-2.5 2.5H3M5.5 15 3 12.5 5.5 10" />
  </Icon>
);

const transport =
  "flex size-9 items-center justify-center rounded-none text-muted transition-colors hover:text-text disabled:opacity-35 disabled:hover:text-muted";

/**
 * A music-player style transport for the day: previous / play / next and a
 * repeat toggle over a scrubbable 24-hour timeline. Red ticks mark the hours
 * where the current plan runs the diesel generator.
 */
export function PlayerBar({
  hour,
  playing,
  repeat,
  dieselHours,
  hourName,
  onTogglePlay,
  onSeek,
  onToggleRepeat,
}: PlayerBarProps) {
  const last = HOURS - 1;
  const progress = (hour / last) * 100;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      {/* Transport */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleRepeat}
          aria-pressed={repeat}
          aria-label="Repeat the day"
          className={`${transport} relative ${repeat ? "text-accent hover:text-accent" : ""}`}
        >
          <IconRepeat />
          {repeat ? <span aria-hidden="true" className="absolute bottom-0.5 size-1 rounded-none bg-accent" /> : null}
        </button>
        <button
          type="button"
          onClick={() => onSeek(hour - 1)}
          disabled={hour === 0}
          aria-label="Previous hour"
          className={transport}
        >
          <IconPrevious />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play the day"}
          className="flex size-11 items-center justify-center rounded-none bg-accent text-accent-ink shadow-sm transition-transform hover:scale-105 hover:bg-accent-dim active:scale-95 calm:hover:scale-100"
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          type="button"
          onClick={() => onSeek(hour + 1)}
          disabled={hour === last}
          aria-label="Next hour"
          className={transport}
        >
          <IconNext />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-14 shrink-0 text-right font-mono text-[0.6875rem] tabular-nums text-text">
          {hourName(hour)}
        </span>
        <div className="relative flex-1">
          {/* Diesel ticks sit above the track, aligned to each hour's position. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7px] -top-2 h-1.5">
            {dieselHours.map((burns, h) =>
              burns ? (
                <span
                  key={h}
                  className="absolute top-0 h-1.5 w-0.5 -translate-x-1/2 rounded-none bg-danger"
                  style={{ left: `${(h / last) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={hour}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Hour of the day"
            aria-valuetext={hourName(hour)}
            style={{
              background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-surface-3) ${progress}%)`,
            }}
            className="block h-1.5 w-full cursor-pointer appearance-none rounded-none [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-text [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow"
          />
        </div>
        <span className="w-12 shrink-0 font-mono text-[0.6875rem] tabular-nums text-faint">{hourName(last)}</span>
      </div>
    </div>
  );
}
