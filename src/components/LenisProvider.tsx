"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useMotionMode } from "@/store/ui";
import { setLenis } from "@/lib/scroll";

/**
 * Smooth scroll, mounted once around the whole page.
 *
 * In calm mode the instance is torn down entirely rather than configured to be
 * fast: smoothing the wheel at all is the thing some users are asking us not
 * to do, and native scrolling is also the more accessible default.
 *
 * Lenis drives the real window scroll position (it does not transform a
 * wrapper), which is why framer-motion's `useScroll` keeps working underneath
 * it without any extra wiring.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const motionMode = useMotionMode();

  useEffect(() => {
    if (motionMode === "calm") {
      setLenis(null);
      return;
    }

    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Touch devices already have momentum scrolling; doubling it feels laggy.
      smoothWheel: true,
      autoRaf: true,
      anchors: true,
    });

    setLenis(lenis);
    document.documentElement.classList.add("lenis");

    return () => {
      setLenis(null);
      document.documentElement.classList.remove("lenis");
      lenis.destroy();
    };
  }, [motionMode]);

  return <>{children}</>;
}
