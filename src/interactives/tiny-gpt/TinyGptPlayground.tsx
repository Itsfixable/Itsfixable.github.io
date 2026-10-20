"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import card from "./model-card.json";
import { probabilities, sample, TinyGpt } from "./model";

const MODEL_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/models/tiny-gpt`;

/** How much it writes per press, in characters. */
const MAX_CHARS = 500;
/** How many candidates the odds panel lists. */
const TOP_K = 8;

const STARTS = ["ROMEO:\n", "JULIET:\n", "KING RICHARD III:\n", "First Citizen:\n"];

type Odds = { id: number; p: number }[];

function topK(probs: Float32Array, k: number): Odds {
  return Array.from(probs, (p, id) => ({ id, p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k);
}

/** Whitespace drawn so it can be seen in the odds list. */
function showChar(ch: string): string {
  if (ch === "\n") return "↵";
  if (ch === " ") return "␣";
  return ch;
}

export function TinyGptPlayground() {
  const [model, setModel] = useState<TinyGpt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [prompt, setPrompt] = useState(STARTS[0]);
  const [output, setOutput] = useState("");
  const [temperature, setTemperature] = useState(0.8);
  const [running, setRunning] = useState(false);
  /** The odds the last character was drawn from, and which one was drawn. */
  const [lastStep, setLastStep] = useState<{ odds: Odds; picked: number } | null>(null);

  const temperatureRef = useRef(temperature);
  const runRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; ids: number[]; written: number }>({
    timer: null,
    ids: [],
    written: 0,
  });
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    TinyGpt.load(MODEL_BASE, controller.signal)
      .then((loaded) => setModel(loaded))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => controller.abort();
  }, [attempt]);

  // Stop writing if the playground goes away mid-sentence.
  useEffect(() => {
    const run = runRef.current;
    return () => {
      if (run.timer) clearTimeout(run.timer);
    };
  }, []);

  // Keep the newest line in view inside the box (never scrolls the page).
  useEffect(() => {
    const box = outputRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [output]);

  const skipped = useMemo(() => (model ? Array.from(prompt).filter((ch) => !model.knows(ch)).length : 0), [model, prompt]);

  // While idle, the odds for whatever would come next.
  const idleOdds = useMemo(() => {
    if (!model || running) return null;
    const ids = model.encode(prompt + output);
    if (ids.length === 0) return null;
    return topK(probabilities(model.nextLogits(ids), temperature), TOP_K);
  }, [model, running, prompt, output, temperature]);

  const stop = () => {
    const run = runRef.current;
    if (run.timer) clearTimeout(run.timer);
    run.timer = null;
    setRunning(false);
  };

  const write = () => {
    if (!model) return;
    const run = runRef.current;
    run.ids = model.encode(prompt + output);
    if (run.ids.length === 0) return;
    run.written = 0;
    setRunning(true);

    const tick = () => {
      const probs = probabilities(model.nextLogits(run.ids), temperatureRef.current);
      const id = sample(probs, Math.random());
      run.ids.push(id);
      run.written += 1;
      setOutput((text) => text + model.vocab[id]);
      setLastStep({ odds: topK(probs, TOP_K), picked: id });
      if (run.written >= MAX_CHARS) {
        run.timer = null;
        setRunning(false);
        return;
      }
      // One character per task, so the page stays responsive while it writes.
      run.timer = setTimeout(tick, 0);
    };
    run.timer = setTimeout(tick, 0);
  };

  const startWith = (start: string) => {
    stop();
    setPrompt(start);
    setOutput("");
    setLastStep(null);
  };

  const odds = running ? lastStep?.odds : idleOdds;
  const picked = running ? lastStep?.picked : undefined;

  return (
    <div className="bg-surface p-5 sm:p-8">
      {/* Prompt */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="gpt-prompt">
          Start of the text
        </label>
        <textarea
          id="gpt-prompt"
          rows={1}
          value={prompt}
          onChange={(event) => {
            stop();
            setPrompt(event.target.value);
            setOutput("");
            setLastStep(null);
          }}
          spellCheck={false}
          className="h-10 min-w-0 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-text focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={running ? stop : write}
            disabled={!model}
            className="h-10 min-w-24 rounded-none border-2 border-ink bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-m-red hover:text-white focus-visible:bg-m-red focus-visible:text-white disabled:cursor-wait disabled:opacity-50"
          >
            {running ? "Stop ■" : output ? "Keep going ▶" : "Write ▶"}
          </button>
          <button
            type="button"
            onClick={() => startWith(prompt)}
            disabled={!output || running}
            className="h-10 rounded-none border border-line bg-surface px-3 text-sm text-text hover:border-faint disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1">Start as</span>
          {STARTS.map((start) => (
            <button
              key={start}
              type="button"
              onClick={() => startWith(start)}
              className={`rounded-none border px-2 py-1 font-mono text-[0.6875rem] transition-colors ${
                prompt === start ? "border-ink bg-m-yellow text-ink" : "border-line bg-surface text-muted hover:border-faint hover:text-text"
              }`}
            >
              {start.trim()}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-xs text-muted" htmlFor="gpt-temperature">
          Temperature
          <input
            id="gpt-temperature"
            type="range"
            min={0.2}
            max={1.6}
            step={0.1}
            value={temperature}
            onChange={(event) => {
              const value = Number(event.target.value);
              temperatureRef.current = value;
              setTemperature(value);
            }}
            className="w-28 accent-[var(--color-accent)]"
          />
          <span className="w-7 font-mono text-text tabular-nums">{temperature.toFixed(1)}</span>
        </label>
      </div>

      {/* Output and the odds it is drawing from. Both have a set height. */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div
          ref={outputRef}
          data-lenis-prevent
          aria-label="What the model wrote"
          className="h-72 overflow-y-auto rounded-lg border border-line bg-surface-2/50 p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-text"
        >
          {loadError ? (
            <span className="font-sans text-sm text-danger">
              Couldn&rsquo;t load the model ({loadError}).{" "}
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setAttempt((n) => n + 1);
                }}
                className="underline"
              >
                Try again
              </button>
            </span>
          ) : !model ? (
            <span className="font-sans text-sm text-faint">Loading the model…</span>
          ) : (
            <>
              <span className="font-semibold">{prompt}</span>
              <span>{output}</span>
              {running ? (
                <span aria-hidden="true" className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-pulse bg-m-red calm:animate-none" />
              ) : null}
            </>
          )}
        </div>

        <div className="h-72 rounded-lg border border-line bg-surface p-4">
          <p className="eyebrow">{running ? "Picked from" : "Next character"}</p>
          <ol className="mt-3 flex flex-col gap-1.5">
            {Array.from({ length: TOP_K }, (_, rank) => {
              const entry = odds?.[rank];
              const isPicked = entry !== undefined && entry.id === picked;
              return (
                <li key={rank} className="flex h-5 items-center gap-2 font-mono text-xs">
                  <span className={`w-5 text-center ${isPicked ? "font-semibold text-m-red" : "text-text"}`}>
                    {entry && model ? showChar(model.vocab[entry.id]) : ""}
                  </span>
                  <span className="relative h-2.5 flex-1 bg-surface-3">
                    {entry ? (
                      <span
                        className={`absolute inset-y-0 left-0 ${isPicked ? "bg-m-red" : "bg-m-blue"}`}
                        style={{ width: `${Math.max(entry.p * 100, 1)}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="w-9 text-right text-faint tabular-nums">{entry ? `${Math.round(entry.p * 100)}%` : ""}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <p className="mt-4 font-mono text-[0.6875rem] text-faint">
        {`${card.parameters.toLocaleString("en-US")} parameters · ${card.n_layer} layers × ${card.n_head} heads · reads the last ${card.block_size} characters · running in your browser`}
        {skipped > 0 ? ` · ${skipped} character${skipped === 1 ? "" : "s"} it never saw were skipped` : ""}
      </p>
    </div>
  );
}
