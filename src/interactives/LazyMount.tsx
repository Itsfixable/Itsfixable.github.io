"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type LazyMountProps = {
  /** Reserved height while unmounted, so the page does not jump when it loads. */
  minHeight: string;
  /** What the reserved box says before the real thing arrives. */
  label: string;
  children: ReactNode;
};

/**
 * Renders `children` only once the box comes within ~one screen of the
 * viewport. Paired with `next/dynamic`, that keeps each interactive's code out
 * of the first page load entirely: nothing is downloaded until a visitor
 * scrolls toward it. Once mounted it stays mounted.
 */
export function LazyMount({ minHeight, label, children }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  if (near) return <>{children}</>;

  return (
    <div
      ref={ref}
      style={{ minHeight }}
      className="card flex items-center justify-center p-6"
    >
      <p className="eyebrow">{label}</p>
    </div>
  );
}

/** The `loading` state `next/dynamic` shows while a chunk downloads. */
export function InteractiveLoading({ minHeight, label }: { minHeight: string; label: string }) {
  return (
    <div style={{ minHeight }} className="card flex items-center justify-center p-6">
      <p className="eyebrow animate-pulse calm:animate-none">{label}</p>
    </div>
  );
}
