"use client";

import { useCallback, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Project } from "@/data/profile";
import { springs } from "@/lib/motion";
import { getLenis } from "@/lib/scroll";
import { ProjectCard } from "./ProjectCard";
import { useIsoLayoutEffect } from "@/lib/motion";

/**
 * The pinned horizontal rail. Only ever mounted on a roomy viewport in wild
 * mode — calm mode and phones render the stacked column instead, so there is
 * no scroll hijacking to switch off in here.
 *
 * Geometry, all measured rather than guessed:
 *
 *   travel        = rail width - viewport width
 *   hold          = a beat of pinned scroll after the travel finishes
 *   outer height  = 100vh + travel + hold
 *
 * The rail is `w-max`, so its measured width already includes its own trailing
 * padding — which is what makes the last card land fully inside the viewport
 * (with the same inset as the first one) rather than flush against the edge.
 *
 * Because the outer element is exactly `100vh + travel + hold` tall and the
 * progress range stops at `travel / (travel + hold)`, one pixel of vertical
 * scroll moves the rail exactly one pixel sideways. `focusCard` below relies
 * on that 1:1 mapping.
 */

/** Fraction of the viewport height spent holding on the last card. */
const HOLD_RATIO = 0.4;
/** ...but never more than this many pixels. */
const MAX_HOLD = 360;

type Metrics = {
  /** px the rail must slide left for its right edge to meet the viewport's. */
  travel: number;
  /** px of pinned scroll after the rail has stopped moving. */
  hold: number;
};

const clamp = (n: number, min: number, max: number) =>
  n < min ? min : n > max ? max : n;

export function PinnedRail({ projects }: { projects: Project[] }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  const [{ travel, hold }, setMetrics] = useState<Metrics>({ travel: 0, hold: 0 });
  const [active, setActive] = useState(0);

  useIsoLayoutEffect(() => {
    const rail = railRef.current;
    const viewport = viewportRef.current;
    if (!rail || !viewport) return;

    const measure = () => {
      // translateX does not change a bounding rect's width, so this stays
      // correct mid-scroll.
      const railWidth = rail.getBoundingClientRect().width;
      const nextTravel = Math.max(0, Math.ceil(railWidth - viewport.clientWidth));
      const nextHold =
        nextTravel > 0
          ? Math.round(Math.min(viewport.clientHeight * HOLD_RATIO, MAX_HOLD))
          : 0;

      setMetrics((prev) =>
        prev.travel === nextTravel && prev.hold === nextHold
          ? prev
          : { travel: nextTravel, hold: nextHold },
      );
    };

    measure();

    // Catches font loading, window resizes and zoom — anything that changes
    // either side of the subtraction above.
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  const scrollLength = travel + hold;
  const travelEnd = scrollLength > 0 ? travel / scrollLength : 1;

  // `useTransform` clamps outside its input range, so the rail parks at
  // -travel for the whole hold window instead of overshooting.
  const x = useSpring(
    useTransform(scrollYProgress, [0, travelEnd], [0, -travel]),
    springs.scrub,
  );

  // Read back off the spring rather than off raw scroll, so the indicator and
  // the rail are never out of step.
  const progress = useTransform(x, (value) =>
    travel > 0 ? clamp(-value / travel, 0, 1) : 0,
  );

  useMotionValueEvent(progress, "change", (value) => {
    const next = Math.round(value * Math.max(projects.length - 1, 0));
    setActive((prev) => (prev === next ? prev : next));
  });

  /**
   * Keyboard rescue. The rail is `overflow-clip`, so the browser cannot scroll
   * a focused card into view by itself. Tab order already matches document
   * order; this just converts the focused card's offset inside the rail into
   * the page scroll position that parks it on screen.
   */
  const focusCard = useCallback(
    (index: number) => {
      const rail = railRef.current;
      const outer = outerRef.current;
      const viewport = viewportRef.current;
      if (!rail || !outer || !viewport || travel <= 0) return;

      const card = rail.children.item(index);
      if (!(card instanceof HTMLElement)) return;

      const cardBox = card.getBoundingClientRect();
      const viewBox = viewport.getBoundingClientRect();
      // Already fully visible: leave the reader's scroll position alone.
      if (cardBox.left >= viewBox.left - 1 && cardBox.right <= viewBox.right + 1) {
        return;
      }

      const railBox = rail.getBoundingClientRect();
      const padLeft =
        Number.parseFloat(window.getComputedStyle(rail).paddingLeft) || 0;
      // Both rects carry the same live translate, so it cancels out and what is
      // left is the card's static offset inside the rail.
      const offsetInRail = cardBox.left - railBox.left - padLeft;
      const top =
        outer.getBoundingClientRect().top +
        window.scrollY +
        clamp(offsetInRail, 0, travel);

      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(top, { immediate: true });
      } else {
        window.scrollTo({ top, behavior: "auto" });
      }
    },
    [travel],
  );

  return (
    <div
      ref={outerRef}
      className="relative"
      style={{ height: `calc(100vh + ${scrollLength}px)` }}
    >
      <div
        ref={viewportRef}
        className="sticky top-0 flex h-screen flex-col justify-center overflow-clip pt-20 pb-16"
      >
        <motion.ol
          ref={railRef}
          style={{ x }}
          className="flex max-h-full w-max items-stretch gap-6 pr-[max(2.5rem,calc((100vw_-_78rem)/2))] pl-[max(2.5rem,calc((100vw_-_78rem)/2))] will-change-transform"
        >
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              total={projects.length}
              variant="rail"
              onFocus={() => focusCard(index)}
            />
          ))}
        </motion.ol>

        {/* Where am I in the rail. Decorative: every word of it is already in
            the cards, so screen readers can skip it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 pb-8"
        >
          <div className="shell flex items-center gap-4">
            <span className="font-mono text-xs tabular-nums text-text">
              {String(active + 1).padStart(2, "0")}
            </span>
            <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span
                style={{ scaleX: progress }}
                className="absolute inset-0 origin-left rounded-full bg-accent"
              />
            </span>
            <span className="font-mono text-xs tabular-nums text-faint">
              {String(projects.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
