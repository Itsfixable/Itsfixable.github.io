"use client";

import { motion, type Transition } from "framer-motion";
import { profile } from "@/data/profile";
import { EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { scrollToSection } from "@/lib/scroll";
import { Cell, Grid, HOVER_FILL, Swatch } from "@/components/mondrian/Grid";
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

/** Rail cells match the section headers below: label at the bottom of a 14rem column. */
const RAIL_CELL = "hidden lg:flex lg:flex-col lg:justify-end lg:gap-2 lg:p-8";

const CTA =
  "group flex h-full min-h-16 w-full items-center justify-between gap-3 px-5 text-left text-sm font-semibold transition-colors duration-200 sm:px-8 sm:text-base lg:px-10";

/**
 * The hero sits on the same columns as every section below it (a 14rem rail
 * plus four equal columns), so its lines run straight on down the page:
 *
 *   rail        │ name (4 columns)
 *   ────────────┼ red ─┬─────┬─────┬ blue   a slim colour band
 *   Now         │ tagline (4 columns)
 *   Start here  │ see the work (2)  │ get in touch (2)
 *
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
      <Grid entrance="cascade" className="grid-cols-2 lg:grid-cols-[14rem_repeat(4,minmax(0,1fr))]">
        {/* Row 1: who */}
        <Cell order={0} className="col-span-2 flex items-center gap-3 px-5 py-4 lg:col-span-1 lg:flex-col lg:items-start lg:justify-end lg:gap-2 lg:p-8">
          <span className="flex gap-1">
            <Swatch tone="red" className="lg:size-4" />
            <Swatch tone="yellow" className="lg:size-4" />
            <Swatch tone="blue" className="lg:size-4" />
          </span>
          <motion.span {...enter(0.2)} className="font-mono text-xs text-faint">
            @{profile.handle}
          </motion.span>
          <motion.span {...enter(0.25)} className="eyebrow !text-ink">
            <ValueOrPlaceholder value={profile.role} />
          </motion.span>
        </Cell>
        <Cell order={1} className="col-span-2 p-5 sm:p-8 lg:col-span-4 lg:px-10 lg:pt-16 lg:pb-12">
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
        </Cell>

        {/* Row 2: a slim band that marks the four columns */}
        <Cell order={2} className="hidden h-3 lg:block" />
        <Cell tone="red" grow="x" order={2} className="h-2.5 lg:h-3" />
        <Cell order={3} className="hidden lg:block" />
        <Cell order={4} className="hidden lg:block" />
        <Cell tone="blue" grow="x" order={5} className="h-2.5 lg:h-3" />

        {/* Row 3: what I do */}
        <Cell order={6} className={RAIL_CELL}>
          <span className="eyebrow">Now</span>
        </Cell>
        <Cell order={7} className="col-span-2 p-5 sm:p-8 lg:col-span-4 lg:px-10">
          <motion.p
            {...enter(AFTER_NAME)}
            className="max-w-[40ch] text-balance text-lg leading-snug text-muted sm:text-xl lg:text-2xl"
          >
            {profile.tagline}
          </motion.p>
        </Cell>

        {/* Row 4: where to go next */}
        <Cell order={8} className={RAIL_CELL}>
          <span className="eyebrow">Start here</span>
        </Cell>
        <Cell order={9} className="lg:col-span-2">
          <button type="button" onClick={() => scrollToSection("about")} className={`${CTA} ${HOVER_FILL.blue}`}>
            See the work
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5 calm:group-hover:translate-y-0">
              ↓
            </span>
          </button>
        </Cell>
        <Cell order={10} className="lg:col-span-2">
          <button type="button" onClick={() => scrollToSection("contact")} className={`${CTA} ${HOVER_FILL.yellow}`}>
            Get in touch
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 calm:group-hover:translate-x-0">
              →
            </span>
          </button>
        </Cell>
      </Grid>
    </section>
  );
}
