"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useIsCalm } from "@/store/ui";
import { gradeTrace, type Point } from "./grade";
import { JAMO_STROKE_DB } from "./strokes";

/**
 * Hangul tracing, ported from Korean Quest's `TracingView`: three stages per
 * letter, each worth a star.
 *   1. Guided: drag the dot along the strokes in order.
 *   2. Trace: draw over the faint letter; KQ's grader needs 70.
 *   3. Memory: blank square; graded a little more leniently, needs 62.
 * Differences from KQ: one canvas redrawn from stroke data (no offscreen ink
 * layer), pointer events for mouse, touch and pen alike, numbered stroke
 * starts, and a "Show me" playback of the stroke order.
 */

/** Logical drawing size; KQ's grader is tuned for 320 px and a 16 px pen. */
const SIZE = 320;
const PEN = 16;

const LETTERS = {
  Consonants: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"],
  Vowels: ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"],
} as const;

type Stage = 1 | 2 | 3;

const STAGES: { stage: Stage; label: string; pass: number | null }[] = [
  { stage: 1, label: "Guided", pass: null },
  { stage: 2, label: "Trace", pass: 70 },
  { stage: 3, label: "Memory", pass: 62 },
];

/* Paper-and-cobalt palette values (see globals.css); canvas needs literals. */
const COLOR = {
  ink: "#16171a",
  template: "rgba(108, 105, 97, 0.26)",
  guide: "#2747d9",
  guideSoft: "rgba(39, 71, 217, 0.18)",
  grid: "rgba(108, 105, 97, 0.35)",
  label: "#ffffff",
};

/** KQ's guide: each stroke sampled densely, tagged with its stroke index. */
function guidePoints(letter: string): (Point & { stroke: number })[] {
  const points: (Point & { stroke: number })[] = [];
  (JAMO_STROKE_DB[letter] ?? []).forEach((stroke, strokeIndex) => {
    stroke.forEach(([x1, y1, x2, y2]) => {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        points.push({ x: (x1 + (x2 - x1) * t) * SIZE, y: (y1 + (y2 - y1) * t) * SIZE, stroke: strokeIndex });
      }
    });
  });
  return points;
}

function strokeStarts(letter: string): Point[] {
  return (JAMO_STROKE_DB[letter] ?? []).map((stroke) => ({ x: stroke[0][0] * SIZE, y: stroke[0][1] * SIZE }));
}

function Stars({ count, size = "text-base" }: { count: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} aria-hidden="true" className={n <= count ? "text-sun" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function TracingPad() {
  const calm = useIsCalm();
  const [letter, setLetter] = useState<string>("ㄱ");
  const [stage, setStage] = useState<Stage>(1);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ text: string; tone: "info" | "good" | "bad" }>({
    text: "Drag the dot along the strokes, in order.",
    tone: "info",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const guide = useRef(guidePoints("ㄱ"));
  const guideIndex = useRef(0);
  const drawing = useRef<{ pointerId: number; mode: "ink" | "dot" } | null>(null);
  /** "Show me" playback: how far along the guide, plus whichever timer drives it. */
  const demo = useRef<{ index: number; raf: number | null; timeout: number | null } | null>(null);

  /* ---- Drawing --------------------------------------------------------- */

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const template = JAMO_STROKE_DB[letter] ?? [];
    const showingDemo = demo.current !== null;

    if (stage === 3 && !showingDemo) {
      // Memory stage: only a centre cross to aim by, like KQ.
      ctx.strokeStyle = COLOR.grid;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(SIZE / 2, 0);
      ctx.lineTo(SIZE / 2, SIZE);
      ctx.moveTo(0, SIZE / 2);
      ctx.lineTo(SIZE, SIZE / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // One path per stroke: drawing each tiny segment separately would stack
      // the translucent round caps into beads on curves like ㅇ.
      ctx.strokeStyle = COLOR.template;
      ctx.lineWidth = PEN;
      template.forEach((stroke) => {
        ctx.beginPath();
        ctx.moveTo(stroke[0][0] * SIZE, stroke[0][1] * SIZE);
        stroke.forEach(([, , x2, y2]) => ctx.lineTo(x2 * SIZE, y2 * SIZE));
        ctx.stroke();
      });
    }

    // Guide progress: the dot's trail in stage 1, or the "Show me" playback.
    if (stage === 1 || showingDemo) {
      const points = guide.current;
      const upTo = showingDemo ? demo.current!.index : guideIndex.current;
      ctx.strokeStyle = COLOR.guide;
      ctx.lineWidth = 10;
      let previous: number | null = null;
      ctx.beginPath();
      for (let i = 0; i <= upTo && i < points.length; i++) {
        const p = points[i];
        if (p.stroke !== previous) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        previous = p.stroke;
      }
      ctx.stroke();

      const dot = points[Math.min(upTo, points.length - 1)];
      if (dot) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, showingDemo ? 9 : 15, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.guide;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = COLOR.label;
        ctx.stroke();
      }
    }

    // Numbered stroke starts, so the order is readable at a glance.
    if (stage !== 3 || showingDemo) {
      strokeStarts(letter).forEach((start, index) => {
        ctx.beginPath();
        ctx.arc(start.x, start.y - 18, 9, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.guideSoft;
        ctx.fill();
        ctx.fillStyle = COLOR.guide;
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(index + 1), start.x, start.y - 18);
      });
    }

    // The learner's ink.
    if (stage !== 1) {
      ctx.strokeStyle = COLOR.ink;
      ctx.lineWidth = PEN;
      for (const points of strokes.current) {
        if (points.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
    }
  }, [letter, stage]);

  const stopDemo = useCallback(() => {
    if (demo.current?.raf != null) cancelAnimationFrame(demo.current.raf);
    if (demo.current?.timeout != null) clearTimeout(demo.current.timeout);
    demo.current = null;
  }, []);

  /** Resets the pad for a letter/stage; called from handlers, never during render. */
  const reset = useCallback(
    (nextLetter: string) => {
      stopDemo();
      strokes.current = [];
      guide.current = guidePoints(nextLetter);
      guideIndex.current = 0;
      drawing.current = null;
    },
    [stopDemo],
  );

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => stopDemo, [stopDemo]);

  /* ---- Stage flow ------------------------------------------------------ */

  const award = (earned: Stage) => {
    setStars((current) => ({ ...current, [letter]: Math.max(current[letter] ?? 0, earned) }));
    if (earned === 3) {
      setMessage({ text: `All three stars for ${letter}. Pick another letter.`, tone: "good" });
      reset(letter);
      render();
      return;
    }
    const next = (earned + 1) as Stage;
    reset(letter);
    setStage(next);
    setMessage({
      text:
        next === 2
          ? "Star one! Now trace over the letter yourself, then press Check."
          : "Star two! Now draw it from memory, then press Check.",
      tone: "good",
    });
  };

  const chooseLetter = (next: string) => {
    reset(next);
    setLetter(next);
    setStage(1);
    setMessage({ text: "Drag the dot along the strokes, in order.", tone: "info" });
  };

  const chooseStage = (next: Stage) => {
    reset(letter);
    setStage(next);
    setMessage({
      text:
        next === 1
          ? "Drag the dot along the strokes, in order."
          : next === 2
            ? "Trace over the letter, then press Check."
            : "Draw it from memory, then press Check.",
      tone: "info",
    });
  };

  const check = () => {
    const pass = STAGES.find((s) => s.stage === stage)?.pass;
    if (!pass) return;
    const result = gradeTrace(JAMO_STROKE_DB[letter] ?? [], strokes.current, { size: SIZE, lineWidth: PEN });
    if (strokes.current.length === 0) {
      setMessage({ text: result.feedback, tone: "info" });
      return;
    }
    if (result.score >= pass) {
      award(stage);
    } else {
      setMessage({ text: `${result.score}/100, need ${pass}. ${result.feedback}`, tone: "bad" });
    }
  };

  const clear = () => {
    reset(letter);
    render();
  };

  const showMe = () => {
    stopDemo();
    const total = guide.current.length;
    const finish = (afterMs: number) => {
      if (!demo.current) return;
      demo.current.raf = null;
      demo.current.timeout = window.setTimeout(() => {
        demo.current = null;
        render();
      }, afterMs);
    };
    if (calm) {
      // No animation in calm mode: show the whole order at once, briefly.
      demo.current = { index: total - 1, raf: null, timeout: null };
      render();
      finish(1600);
      return;
    }
    const started = performance.now();
    const duration = 900 + total * 6;
    const tick = (now: number) => {
      if (!demo.current) return;
      const progress = Math.min(1, (now - started) / duration);
      demo.current.index = Math.floor(progress * (total - 1));
      render();
      if (progress < 1) demo.current.raf = requestAnimationFrame(tick);
      else finish(600);
    };
    demo.current = { index: 0, raf: requestAnimationFrame(tick), timeout: null };
  };

  /* ---- Pointer input --------------------------------------------------- */

  const toCanvas = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SIZE,
      y: ((event.clientY - rect.top) / rect.height) * SIZE,
    };
  };

  /** KQ's guided-dot rule: step forward while the pointer is near and gaining on the next point. */
  const followGuide = (p: Point) => {
    const points = guide.current;
    let index = guideIndex.current;
    let moved = false;
    while (index + 1 < points.length) {
      const current = points[index];
      const next = points[index + 1];
      if (next.stroke !== current.stroke) {
        index += 1;
        moved = true;
        continue;
      }
      const dCurrent = Math.hypot(p.x - current.x, p.y - current.y);
      const dNext = Math.hypot(p.x - next.x, p.y - next.y);
      if (dNext < 48 && dNext <= dCurrent) {
        index += 1;
        moved = true;
      } else {
        break;
      }
    }
    if (moved) {
      guideIndex.current = index;
      render();
    }
    if (index >= points.length - 2) {
      drawing.current = null;
      award(1);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) return;
    stopDemo();
    // Keeps the stroke going if the pointer slips off the square mid-line.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; drawing still works without it.
    }
    const p = toCanvas(event);
    if (stage === 1) {
      drawing.current = { pointerId: event.pointerId, mode: "dot" };
      followGuide(p);
      return;
    }
    drawing.current = { pointerId: event.pointerId, mode: "ink" };
    strokes.current.push([p]);
    render();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.pointerId !== event.pointerId) return;
    const p = toCanvas(event);
    if (drawing.current.mode === "dot") {
      followGuide(p);
      return;
    }
    strokes.current[strokes.current.length - 1]?.push(p);
    render();
  };

  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.pointerId === event.pointerId) drawing.current = null;
  };

  /* ---- Render ---------------------------------------------------------- */

  const earned = stars[letter] ?? 0;
  const messageClass =
    message.tone === "good" ? "text-accent font-medium" : message.tone === "bad" ? "text-danger" : "text-muted";

  return (
    <div className="flex flex-col gap-5">
      {/* Letters */}
      <div className="flex flex-col gap-3">
        {Object.entries(LETTERS).map(([group, letters]) => (
          <div key={group} role="group" aria-label={group}>
            <p className="eyebrow">{group}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {letters.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={ch === letter}
                  aria-label={`${ch}, ${stars[ch] ?? 0} of 3 stars`}
                  onClick={() => chooseLetter(ch)}
                  className={`relative flex size-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                    ch === letter
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface text-text hover:border-faint hover:bg-surface-2"
                  }`}
                >
                  {ch}
                  {(stars[ch] ?? 0) > 0 ? (
                    <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 rounded-none bg-sun px-1 font-mono text-[0.5625rem] leading-4 text-text">
                      {stars[ch]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] sm:items-start">
        {/* The pad */}
        <div className="relative mx-auto w-full max-w-[20rem]">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            aria-label={`Drawing area for ${letter}`}
            className="aspect-square w-full touch-none rounded-xl border border-line bg-surface"
          />
          <span lang="ko" aria-hidden="true" className="pointer-events-none absolute top-2 left-3 text-sm text-faint">
            {letter}
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Stage" className="inline-flex whitespace-nowrap rounded-none border border-line bg-surface-2 p-1">
              {STAGES.map(({ stage: s, label }) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={stage === s}
                  onClick={() => chooseStage(s)}
                  className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                    stage === s ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
                  }`}
                >
                  {s}. {label}
                </button>
              ))}
            </div>
            <Stars count={earned} size="text-lg" />
          </div>

          <p className={`min-h-[3rem] text-sm leading-relaxed ${messageClass}`} aria-live="polite">
            {message.text}
          </p>

          <div className="flex flex-wrap gap-2">
            {stage !== 1 ? (
              <button
                type="button"
                onClick={check}
                className="rounded-none bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-dim"
              >
                Check
              </button>
            ) : null}
            <button
              type="button"
              onClick={clear}
              className="rounded-none border border-line bg-surface px-4 py-1.5 text-sm font-medium text-text hover:border-faint"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={showMe}
              className="rounded-none border border-line bg-surface px-4 py-1.5 text-sm font-medium text-text hover:border-faint"
            >
              Show me
            </button>
          </div>

          <p className="text-xs leading-relaxed text-faint">
            Scored by Korean Quest&rsquo;s own grader: shape, stroke order and direction. Drawing
            needs a mouse, finger or stylus.
          </p>
        </div>
      </div>
    </div>
  );
}
