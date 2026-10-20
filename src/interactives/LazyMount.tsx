"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Runs `task` when the browser has a quiet moment, or after `timeout` ms at
 * the latest. Safari has no idle callbacks, so it gets a plain timeout.
 * Returns a cancel function.
 */
function whenIdle(task: () => void, timeout: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, Math.min(timeout, 200));
  return () => window.clearTimeout(id);
}

/**
 * Downloads an interactive's code once the page has settled after first load,
 * so scrolling to it later never waits on the network or the parser. Pass the
 * same module-level loader that `next/dynamic` uses; the second import is
 * served from the module cache.
 */
export function usePreload(load: () => Promise<unknown>) {
  useEffect(() => whenIdle(() => void load(), 4000), [load]);
}

/* ---------------------------------------------------------------------------
 * The mount queue. Interactives mount one at a time, each in its own quiet
 * moment, starting once the hero has finished drawing. By the time a visitor
 * scrolls to one it is already at its real size, so nothing above them can
 * grow and push the page about. Scrolling near one first jumps it up the queue.
 * ------------------------------------------------------------------------- */

/** Long enough for the hero to finish drawing before anything heavy runs. */
const QUEUE_START_MS = 2500;
const QUEUE_GAP_MS = 400;

const queue: Array<() => void> = [];
let pumping = false;

function pump() {
  if (pumping) return;
  pumping = true;
  const next = () => {
    const task = queue.shift();
    if (!task) {
      pumping = false;
      return;
    }
    whenIdle(() => {
      task();
      window.setTimeout(next, QUEUE_GAP_MS);
    }, 2000);
  };
  window.setTimeout(next, QUEUE_START_MS);
}

function enqueue(task: () => void): () => void {
  queue.push(task);
  pump();
  return () => {
    const index = queue.indexOf(task);
    if (index >= 0) queue.splice(index, 1);
  };
}

type LazyMountProps = {
  /**
   * Height reserved until it mounts, as Tailwind min-height classes per
   * breakpoint (e.g. "min-h-[84rem] md:min-h-[74rem]"). Measured from the real
   * thing, so the page does not jump when it arrives.
   */
  reserve: string;
  /** What the reserved box says before the real thing arrives. */
  label: string;
  children: ReactNode;
};

/**
 * Holds the place of an interactive and mounts it from the queue above, or
 * sooner if a visitor scrolls within a screen or so of it. Paired with
 * `next/dynamic` and `usePreload`, the first paint carries none of the
 * interactives' code. Once mounted it stays mounted.
 */
export function LazyMount({ reserve, label, children }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || mounted) return;

    const mount = () => setMounted(true);
    const dequeue = enqueue(mount);
    let cancelIdle = () => {};

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          dequeue();
          cancelIdle = whenIdle(mount, 500);
        }
      },
      { rootMargin: "1000px 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      dequeue();
      cancelIdle();
    };
  }, [mounted]);

  if (mounted) return <>{children}</>;

  return (
    <div ref={ref} className={`flex items-center justify-center bg-surface p-6 ${reserve}`}>
      <p className="eyebrow">{label}</p>
    </div>
  );
}

/** The `loading` state `next/dynamic` shows while a chunk downloads. */
export function InteractiveLoading({ reserve, label }: { reserve: string; label: string }) {
  return (
    <div className={`flex items-center justify-center bg-surface p-6 ${reserve}`}>
      <p className="eyebrow animate-pulse calm:animate-none">{label}</p>
    </div>
  );
}
