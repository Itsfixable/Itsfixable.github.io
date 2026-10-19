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
 * The hero, in three tidy rows beside one column of the three primaries:
 *   name            │ red
 *   tagline         │ yellow
 *   work │ contact  │ blue
 * Both calls to action are white cells that fill with colour on hover.
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
      <Grid
        entrance="cascade"
        className="grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem]"
      >
        {/* Row 1: the name */}
        <Cell order={0} className="col-span-2 p-5 sm:p-8 lg:px-10 lg:pt-14 lg:pb-10">
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
        <Cell tone="red" grow="y" order={1} />

        {/* Row 2: the tagline */}
        <Cell order={2} className="col-span-2 p-5 sm:p-8 lg:px-10">
          <motion.p
            {...enter(AFTER_NAME)}
            className="max-w-[40ch] text-balance text-lg leading-snug text-muted sm:text-xl lg:text-2xl"
          >
            {profile.tagline}
          </motion.p>
        </Cell>
        <Cell tone="yellow" grow="y" order={3} />

        {/* Row 3: where to go next */}
        <Cell order={4}>
          <button
            type="button"
            onClick={() => scrollToSection("about")}
            className="group flex h-full min-h-16 w-full items-center justify-between gap-3 px-5 text-left text-sm font-semibold transition-colors duration-200 hover:bg-m-blue hover:text-white focus-visible:bg-m-blue focus-visible:text-white sm:px-8 sm:text-base lg:px-10"
          >
            See the work
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5 calm:group-hover:translate-y-0">
              ↓
            </span>
          </button>
        </Cell>
        <Cell order={5}>
          <button
            type="button"
            onClick={() => scrollToSection("contact")}
            className="flex h-full min-h-16 w-full items-center px-5 text-left text-sm font-semibold transition-colors duration-200 hover:bg-m-yellow focus-visible:bg-m-yellow sm:px-8 sm:text-base lg:px-10"
          >
            Get in touch
          </button>
        </Cell>
        <Cell tone="blue" grow="y" order={6} />
      </Grid>
    </section>
  );
}
