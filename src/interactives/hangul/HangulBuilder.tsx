"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useIsCalm } from "@/store/ui";
import {
  FINALS,
  INITIALS,
  QUIZ_LENGTH,
  VOWELS,
  WORDS,
  compose,
  decompose,
  romanize,
  type Jamo,
} from "./jamo";

type Mode = "free" | "quiz";

type Parts = { initial: Jamo; vowel: Jamo; final: Jamo | null };

const START: Parts = { initial: INITIALS[0], vowel: VOWELS[0], final: null };

type Quiz = {
  words: typeof WORDS;
  round: number;
  score: number;
  /** "correct" holds the success state until the visitor moves on. */
  status: "playing" | "correct" | "done";
  hinted: boolean;
};

function pickWords(): typeof WORDS {
  const pool = [...WORDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUIZ_LENGTH);
}

function JamoButton({
  jamo,
  selected,
  onSelect,
  slot,
}: {
  jamo: Jamo;
  selected: boolean;
  onSelect: () => void;
  slot: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${jamo.char}, ${jamo.sound ? `"${jamo.sound}"` : "silent"} as ${slot}`}
      onClick={onSelect}
      className={`flex size-11 flex-col items-center justify-center rounded-lg border text-xl leading-none transition-colors ${
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-text hover:border-faint hover:bg-surface-2"
      }`}
    >
      {jamo.char}
      <span className={`mt-0.5 font-mono text-[0.5625rem] ${selected ? "text-accent-ink/80" : "text-faint"}`}>
        {jamo.sound || "–"}
      </span>
    </button>
  );
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function HangulBuilder() {
  const calm = useIsCalm();
  const [mode, setMode] = useState<Mode>("free");
  const [parts, setParts] = useState<Parts>(START);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const { initial, vowel, final } = parts;

  // The latest pick, updated synchronously, so two picks landing before a
  // re-render build on each other instead of the second undoing the first.
  const partsRef = useRef(parts);

  const syllable = compose(initial, vowel, final);
  const sound = romanize(initial, vowel, final);
  const target = quiz && quiz.status !== "done" ? quiz.words[quiz.round] : null;

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const nextRound = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQuiz((current) => {
      if (!current) return current;
      const round = current.round + 1;
      return round >= current.words.length
        ? { ...current, status: "done" }
        : { ...current, round, status: "playing", hinted: false };
    });
  };

  /** Every pick goes through here, so a correct answer is caught the moment it's built. */
  const choose = (change: Partial<Parts>) => {
    const next = { ...partsRef.current, ...change };
    partsRef.current = next;
    setParts(next);

    if (quiz?.status === "playing" && target && compose(next.initial, next.vowel, next.final) === target.syllable) {
      setQuiz((current) =>
        current?.status === "playing" ? { ...current, status: "correct", score: current.score + 1 } : current,
      );
      advanceTimer.current = setTimeout(nextRound, 1400);
    }
  };

  const startQuiz = () => {
    setMode("quiz");
    setQuiz({ words: pickWords(), round: 0, score: 0, status: "playing", hinted: false });
    partsRef.current = START;
    setParts(START);
  };

  const showHint = () => {
    if (!quiz || !target) return;
    const parts = decompose(target.syllable);
    if (parts) choose({ initial: parts.initial });
    setQuiz((current) => (current ? { ...current, hinted: true } : current));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mode switch */}
      <div className="inline-flex w-fit rounded-none border border-line bg-surface-2 p-1" role="tablist" aria-label="Mode">
        {(["free", "quiz"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => (value === "quiz" ? startQuiz() : setMode("free"))}
            className={`rounded-none px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            {value === "free" ? "Free build" : "Quiz"}
          </button>
        ))}
      </div>

      {/* Prompt */}
      {mode === "quiz" && quiz ? (
        quiz.status === "done" ? (
          <div className="rounded-xl border border-line bg-surface-2 p-5">
            <p className="text-2xl font-semibold text-text">
              {quiz.score} of {quiz.words.length} built
            </p>
            <p className="mt-1 text-sm text-muted">
              {quiz.score === quiz.words.length
                ? "Perfect. That's the core of reading Hangul: every block is just consonant + vowel (+ consonant)."
                : "Every block is consonant + vowel (+ an optional final consonant). Try another round."}
            </p>
            <button
              type="button"
              onClick={startQuiz}
              className="mt-4 rounded-none bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-dim"
            >
              Play again
            </button>
          </div>
        ) : target ? (
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-surface-2 px-5 py-4" aria-live="polite">
            <div>
              <p className="font-mono text-[0.625rem] tracking-[0.14em] text-faint uppercase">
                Word {quiz.round + 1} of {quiz.words.length} · score {quiz.score}
              </p>
              <p className="mt-1 text-lg text-text">
                Build the word for <span className="font-semibold">{target.meaning}</span>
                <span className="text-muted">, said &ldquo;{target.sound}&rdquo;</span>
              </p>
            </div>
            {quiz.status === "correct" ? (
              <p className="font-medium text-accent">Correct: {target.syllable} ✓</p>
            ) : (
              <div className="flex gap-2">
                {!quiz.hinted ? (
                  <button type="button" onClick={showHint} className="rounded-none border border-line bg-surface px-3 py-1 text-xs font-medium text-text hover:border-faint">
                    Hint
                  </button>
                ) : null}
                <button type="button" onClick={nextRound} className="rounded-none border border-line bg-surface px-3 py-1 text-xs font-medium text-text hover:border-faint">
                  Skip
                </button>
              </div>
            )}
          </div>
        ) : null
      ) : (
        <p className="max-w-[56ch] text-sm leading-relaxed text-muted">
          Every Hangul block is a consonant, a vowel and an optional final consonant, stacked into one
          square. Pick one of each and watch the block assemble.
        </p>
      )}

      {/* The block */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
        <div className="flex items-center gap-2 font-mono text-lg text-muted" aria-hidden="true">
          <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-text">{initial.char}</span>+
          <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-text">{vowel.char}</span>+
          <span className={`rounded-md border px-2.5 py-1 ${final ? "border-line bg-surface text-text" : "border-dashed border-line text-faint"}`}>
            {final?.char ?? "∅"}
          </span>
          =
        </div>
        <div className="flex flex-col items-center">
          <div className="relative flex size-32 items-center justify-center rounded-2xl border border-line bg-surface" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={syllable}
                lang="ko"
                initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                animate={calm ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={calm ? { opacity: 0 } : { opacity: 0, scale: 1.15 }}
                transition={calm ? { duration: 0.01 } : { type: "spring", stiffness: 420, damping: 26 }}
                className={`text-7xl leading-none font-medium ${quiz?.status === "correct" && mode === "quiz" ? "text-accent" : "text-text"}`}
              >
                {syllable}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-2 font-mono text-sm text-muted">&ldquo;{sound}&rdquo;</p>
        </div>
      </div>

      {/* Pickers */}
      <div className="flex flex-col gap-4">
        <PickerRow label="First consonant">
          {INITIALS.map((jamo) => (
            <JamoButton
              key={jamo.char}
              jamo={jamo}
              slot="first consonant"
              selected={initial.char === jamo.char}
              onSelect={() => choose({ initial: jamo })}
            />
          ))}
        </PickerRow>
        <PickerRow label="Vowel">
          {VOWELS.map((jamo) => (
            <JamoButton
              key={jamo.char}
              jamo={jamo}
              slot="vowel"
              selected={vowel.char === jamo.char}
              onSelect={() => choose({ vowel: jamo })}
            />
          ))}
        </PickerRow>
        <PickerRow label="Final consonant (optional)">
          <button
            type="button"
            aria-pressed={final === null}
            aria-label="No final consonant"
            onClick={() => choose({ final: null })}
            className={`flex h-11 items-center rounded-lg border px-3 font-mono text-xs transition-colors ${
              final === null
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-surface text-muted hover:border-faint hover:bg-surface-2"
            }`}
          >
            none
          </button>
          {FINALS.map((jamo) => (
            <JamoButton
              key={jamo.char}
              jamo={jamo}
              slot="final consonant"
              selected={final?.char === jamo.char}
              onSelect={() => choose({ final: jamo })}
            />
          ))}
        </PickerRow>
      </div>
    </div>
  );
}
