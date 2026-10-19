"use client";

import { motion, type Transition } from "framer-motion";
import { profile } from "@/data/profile";
import { EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { scrollToSection } from "@/lib/scroll";
import { Cell, Grid } from "@/components/mondrian/Grid";
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

/**
 * The hero is itself a Mondrian: the name in the big white field, the
 * tagline in the red block, and the two calls to action as the blue and
 * white blocks along the bottom. On phones it stacks into two columns.
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
    <section id="hero" className="shell pt-20 md:pt-24">
      <Grid className="grid-cols-2 lg:grid-cols-[2.2fr_0.55fr_1.3fr_0.75fr] lg:grid-rows-[minmax(13rem,auto)_minmax(7rem,auto)_auto]">
        {/* The name: the big white field */}
        <Cell className="col-span-2 flex flex-col justify-end p-5 sm:p-8 lg:col-span-1 lg:row-span-2 lg:p-10">
          <motion.p {...enter(0.2)} className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>@{profile.handle}</span>
            <span aria-hidden="true" className="text-line">
              /
            </span>
            <span className="text-muted">
              <ValueOrPlaceholder value={profile.role} />
            </span>
          </motion.p>

          <h1 aria-label={profile.name} className="mt-5 text-display font-medium text-text">
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
        </Cell>

        {/* Black square */}
        <Cell tone="black" order={0} className="hidden lg:block" />

        {/* The tagline, in the red block */}
        <Cell tone="red" order={1} className="col-span-2 flex items-end p-5 sm:p-8 lg:col-span-2">
          <motion.p
            {...enter(AFTER_NAME)}
            className="max-w-[30ch] text-balance text-lg font-medium leading-snug sm:text-xl lg:text-2xl"
          >
            {profile.tagline}
          </motion.p>
        </Cell>

        {/* Quiet white fields and the yellow block */}
        <Cell className="hidden lg:block" />
        <Cell className="hidden lg:block" />
        <Cell tone="yellow" order={2} className="h-8 lg:h-auto" />
        <Cell className="h-8 lg:hidden" />

        {/* The calls to action are blocks too */}
        <Cell tone="blue" order={3} className="col-span-1">
          <button
            type="button"
            onClick={() => scrollToSection("experience")}
            className="group flex h-full min-h-16 w-full items-center justify-between gap-3 px-5 text-left text-sm font-semibold sm:px-8 sm:text-base"
          >
            See the work
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1 calm:group-hover:translate-x-0">
              →
            </span>
          </button>
        </Cell>
        <Cell className="hidden lg:block" />
        <Cell className="col-span-1">
          <button
            type="button"
            onClick={() => scrollToSection("contact")}
            className="flex h-full min-h-16 w-full items-center px-5 text-left text-sm font-semibold transition-colors hover:bg-m-yellow sm:px-8 sm:text-base"
          >
            Get in touch
          </button>
        </Cell>
        <Cell className="hidden lg:block" />
      </Grid>
    </section>
  );
}
