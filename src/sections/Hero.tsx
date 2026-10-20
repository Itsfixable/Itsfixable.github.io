"use client";

import { motion, type Transition } from "framer-motion";
import { profile } from "@/data/profile";
import { EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { scrollToSection } from "@/lib/scroll";
import { Block, Drawing, Line, Rise } from "@/components/mondrian/Drawn";
import { COLUMNS, DROP_X } from "@/components/mondrian/SectionFrame";
import { HOVER_FILL, Swatch } from "@/components/mondrian/tone";
import { useIsCalm } from "@/store/ui";
import { ValueOrPlaceholder } from "./_hero/Placeholder";

/* ---------------------------------------------------------------------------
 * The name, pre-split at module scope (profile.name is static).
 *
 * Split per character for the animation, but grouped per word for layout: the
 * word is the unbreakable unit, so "Koji Tanaka" can only break between words.
 * The `<h1>` carries the whole name as an aria-label and every letter span is
 * aria-hidden, so assistive tech reads one clean string.
 * ------------------------------------------------------------------------- */

type Letter = { char: string; order: number };

const NAME_WORDS: Letter[][] = (() => {
  let order = 0;
  return profile.name
    .split(" ")
    .map((word) => Array.from(word).map((char) => ({ char, order: order++ })));
})();

const LETTER_COUNT = NAME_WORDS.reduce((total, word) => total + word.length, 0);

const LETTER_DELAY = 0.35;
const LETTER_STEP = 0.035;
const AFTER_NAME = LETTER_DELAY + LETTER_COUNT * LETTER_STEP;

const CTA =
  "group inline-flex items-center gap-3 border-2 border-ink bg-surface px-6 py-3.5 text-sm font-semibold transition-colors duration-200 sm:text-base";

/**
 * The hero is where the painting starts. The name sits on open paper; then
 * the first line is drawn under it, a short line drops from it and the three
 * primaries settle along it, the same opening every section below repeats.
 *
 *   @Itsfixable          Koji Tanaka
 *   Student developer
 *   ███━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━██
 *                     ┃ tagline                         ▀▀▀▀▀▀
 *                     ┃ [See the work ↓] [Get in touch →]
 */
export function Hero() {
  const calm = useIsCalm();

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: calm ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    transition: calmTransition({ duration: durations.base, ease: EASE_OUT, delay }, calm) satisfies Transition,
  });

  const letterInitial = { opacity: 0, y: calm ? 0 : "55%" };

  return (
    <section id="hero" className="shell pt-28 md:pt-40">
      <div className={`gap-y-5 lg:items-end ${COLUMNS}`}>
        <motion.div {...enter(0.2)} className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-col lg:items-start lg:pb-3">
          <span className="flex gap-1" aria-hidden="true">
            <Swatch tone="red" />
            <Swatch tone="yellow" />
            <Swatch tone="blue" />
          </span>
          <span className="font-mono text-xs text-faint">@{profile.handle}</span>
          <span className="eyebrow !text-ink">
            <ValueOrPlaceholder value={profile.role} />
          </span>
        </motion.div>

        <h1 aria-label={profile.name} className="text-display font-medium text-text">
          <span aria-hidden="true" className="flex flex-wrap gap-x-[0.24em]">
            {NAME_WORDS.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-flex">
                {word.map(({ char, order }) => (
                  <motion.span
                    key={order}
                    className="inline-block"
                    initial={letterInitial}
                    animate={{ opacity: 1, y: 0 }}
                    transition={calmTransition(
                      { duration: durations.base, ease: EASE_OUT, delay: LETTER_DELAY + order * LETTER_STEP },
                      calm,
                    )}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            ))}
          </span>
        </h1>
      </div>

      <Drawing start="load" className={`relative mt-10 gap-y-6 pt-[var(--rule)] md:mt-14 ${COLUMNS}`}>
        <Line at={AFTER_NAME - 0.35} duration={1.1} className="absolute inset-x-0 top-0 h-[var(--rule)]" />
        <Line
          axis="y"
          at={AFTER_NAME + 0.35}
          duration={0.6}
          className={`absolute top-0 bottom-0 hidden w-[var(--rule)] lg:block ${DROP_X}`}
        />
        {/* The primaries settle along the line as it passes them. */}
        <Block tone="yellow" at={AFTER_NAME + 0.55} className="absolute top-[var(--rule)] right-[16%] hidden h-3 w-[18%] lg:block" />
        <Block tone="blue" at={AFTER_NAME + 0.7} className="absolute top-[var(--rule)] right-0 size-8 lg:size-12" />

        <div>
          <Block tone="red" at={AFTER_NAME + 0.45} className="size-8 lg:size-12" />
        </div>

        <div className="lg:pt-10">
          <Rise at={AFTER_NAME + 0.2}>
            <p className="max-w-[40ch] text-balance text-lg leading-snug text-muted sm:text-xl lg:text-2xl">
              {profile.tagline}
            </p>
          </Rise>
          <Rise at={AFTER_NAME + 0.35} className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => scrollToSection("about")} className={`${CTA} ${HOVER_FILL.blue}`}>
              See the work
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5 calm:group-hover:translate-y-0">
                ↓
              </span>
            </button>
            <button type="button" onClick={() => scrollToSection("contact")} className={`${CTA} ${HOVER_FILL.yellow}`}>
              Get in touch
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 calm:group-hover:translate-x-0">
                →
              </span>
            </button>
          </Rise>
        </div>
      </Drawing>
    </section>
  );
}
