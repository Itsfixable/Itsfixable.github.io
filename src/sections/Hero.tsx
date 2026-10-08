"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
  type Transition,
} from "framer-motion";
import { profile } from "@/data/profile";
import { EASE_IN_OUT, EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { scrollToSection } from "@/lib/scroll";
import { useIsCalm } from "@/store/ui";
import { ValueOrPlaceholder } from "./_hero/Placeholder";

/* ---------------------------------------------------------------------------
 * The name, pre-split at module scope (profile.name is static, so there is
 * nothing to memoise at render time).
 *
 * Split per character for the animation, but grouped per word for layout: the
 * word is the unbreakable unit, and the gap between words is the only break
 * opportunity. That is what stops "Koji Tanaka" from snapping mid-word at
 * 375px. The `<h1>` carries the whole name as an aria-label and every letter
 * span is aria-hidden, so assistive tech reads one clean string.
 * ------------------------------------------------------------------------- */

type Letter = { char: string; order: number };

const NAME_WORDS: Letter[][] = (() => {
  let order = 0;
  return profile.name
    .split(" ")
    .map((word) => Array.from(word).map((char) => ({ char, order: order++ })));
})();

const LETTER_COUNT = NAME_WORDS.reduce((total, word) => total + word.length, 0);

/** Letter cadence. Tuned so the whole name lands in well under a second. */
const LETTER_DELAY = 0.08;
const LETTER_STEP = 0.035;
/** Everything below the name queues up behind the last letter. */
const AFTER_NAME = LETTER_DELAY + LETTER_COUNT * LETTER_STEP;

/**
 * Scroll runway below the sticky hero. The section is `100svh` of sticky
 * content plus this, so scroll progress reaches ~0.41 at the moment the
 * sticky wrapper unsticks — hence the 0.4 end of every transform range below.
 * `calm:h-0` removes the runway entirely when motion is dialled down: with no
 * scroll-linked degrade there is nothing for the extra scroll to reveal.
 */
const RUNWAY = "h-[70vh] calm:h-0";

export function Hero() {
  const calm = useIsCalm();
  const sectionRef = useRef<HTMLElement>(null);

  /* Scroll-away degrade. The motion values are always created (hooks cannot
     be conditional) but are only wired into `style` in wild mode. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.22, 0.38], [1, 0.8, 0]);
  const blurPx = useTransform(scrollYProgress, [0, 0.4], [0, 12]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  /* Calm gets an explicit neutral style rather than `undefined`, so toggling
     the mode mid-session actively resets any transform the scroll had
     already applied instead of leaving it stuck. */
  const degrade = calm
    ? { scale: 1, opacity: 1, filter: "none" }
    : { scale, opacity, filter };

  /* Mount entrance. In calm mode `calmTransition` collapses every delay to 0
     and every duration to 0.01s, so the staggered reveal becomes one plain,
     near-instant block — same end state, no choreography. */
  const enter = (delay: number) => ({
    initial: { opacity: 0, y: calm ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: calmTransition(
      { duration: durations.base, ease: EASE_OUT, delay },
      calm,
    ) satisfies Transition,
  });

  const letterInitial = { opacity: 0, y: calm ? 0 : "55%" };

  return (
    <section id="hero" ref={sectionRef} className="relative">
      {/* Sticky so the hero stays in frame while it shrinks, blurs and fades. */}
      <div className="sticky top-0 flex min-h-svh items-center pt-20">
        <motion.div style={degrade} className="shell origin-left">
          {/* Eyebrow: handle + role */}
          <motion.p
            {...enter(0)}
            className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span>@{profile.handle}</span>
            <span aria-hidden="true" className="text-line">
              /
            </span>
            <span className="text-muted">
              <ValueOrPlaceholder value={profile.role} />
            </span>
          </motion.p>

          {/* The name — letter by letter */}
          <h1
            aria-label={profile.name}
            className="mt-6 text-display font-medium text-text"
          >
            <span
              aria-hidden="true"
              className="flex flex-wrap gap-x-[0.24em]"
            >
              {NAME_WORDS.map((word, wordIndex) => (
                <span key={wordIndex} className="inline-flex">
                  {word.map(({ char, order }) => (
                    <motion.span
                      key={order}
                      className="inline-block"
                      initial={letterInitial}
                      animate={{ opacity: 1, y: 0 }}
                      transition={calmTransition(
                        {
                          duration: durations.base,
                          ease: EASE_OUT,
                          delay: LETTER_DELAY + order * LETTER_STEP,
                        },
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

          {/* Tagline */}
          <motion.p
            {...enter(AFTER_NAME + 0.04)}
            className="mt-7 max-w-[34ch] text-balance text-lg leading-snug text-muted sm:text-xl md:text-2xl"
          >
            {profile.tagline}
          </motion.p>

          {/* Availability */}
          <motion.p
            {...enter(AFTER_NAME + 0.12)}
            className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            <span className="eyebrow">Availability</span>
            <span className="font-mono text-sm text-muted">
              <ValueOrPlaceholder value={profile.availability} />
            </span>
          </motion.p>

          {/* CTAs — the accent fill is the one bold accent in this section */}
          <motion.div
            {...enter(AFTER_NAME + 0.2)}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={() => scrollToSection("projects")}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-dim"
            >
              See the work
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-text transition-colors hover:border-faint hover:bg-surface-2"
            >
              Get in touch
            </button>
          </motion.div>

          {/* Scroll cue */}
          <motion.div {...enter(AFTER_NAME + 0.3)} className="mt-14 md:mt-20">
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="group inline-flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className="relative block h-10 w-px overflow-hidden bg-line"
              >
                {/* Travelling tick in wild mode; a solid rule in calm mode,
                    where the looping animation is dropped entirely. */}
                <motion.span
                  className="absolute inset-x-0 top-0 block h-3 bg-muted calm:h-full"
                  animate={calm ? { y: 0 } : { y: ["-100%", "350%"] }}
                  transition={
                    calm
                      ? { duration: 0.01 }
                      : {
                          duration: 1.8,
                          ease: EASE_IN_OUT,
                          repeat: Infinity,
                          repeatDelay: 0.2,
                        }
                  }
                />
              </span>
              <span className="eyebrow transition-colors group-hover:text-muted">
                Scroll
              </span>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll runway for the degrade. Purely structural. */}
      <div aria-hidden="true" className={RUNWAY} />
    </section>
  );
}
