"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { profile } from "@/data/profile";
import { scrollToSection } from "@/lib/scroll";
import { navSections, sections, type SectionId } from "@/lib/sections";
import { ResumeButton } from "./_chrome/ResumeButton";

/** Where in the viewport a section counts as "the one you are reading". */
const ACTIVE_LINE = 112;


export function Nav() {
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [condensed, setCondensed] = useState(false);

  /**
   * Active-section tracking: one IntersectionObserver over the section
   * elements named in the registry. The observer tells us *which* sections are
   * on screen; the pick below decides which of them owns the nav, by taking
   * the last one whose top has crossed the nav line. Thresholds are dense so a
   * section taller than the viewport still fires while it scrolls past.
   */
  useEffect(() => {
    const ids = sections.map((section) => section.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();

    const pick = () => {
      let above: { id: string; top: number } | null = null;
      let below: { id: string; top: number } | null = null;

      for (const id of visible) {
        const element = document.getElementById(id);
        if (!element) continue;
        const { top } = element.getBoundingClientRect();
        if (top <= ACTIVE_LINE) {
          if (!above || top > above.top) above = { id, top };
        } else if (!below || top < below.top) {
          below = { id, top };
        }
      }

      const winner = above ?? below;
      if (winner) setActiveId(winner.id as SectionId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        pick();
      },
      {
        // Discount the fixed bar at the top and the dead zone at the bottom.
        rootMargin: "-72px 0px -40% 0px",
        threshold: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * The bar condenses (and picks up its translucent backdrop) once the hero is
   * behind you. rAF-throttled, passive, and the visual half is expressed with
   * the `calm:` variant so calm mode gets a flat opaque bar with no blur.
   */
  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const hero = document.getElementById("hero");
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - 160 : 160;
      setCondensed(window.scrollY > Math.max(72, heroEnd));
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(read);
    };

    // First read is deferred a frame so the effect body never sets state
    // synchronously (and so layout has settled).
    frame = window.requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const jump = (id: SectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToSection(id);
  };

  /** `<main id="content">` sinks focus straight past the nav and the hero animation. */
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById("content");
    main?.focus({ preventScroll: true });
    scrollToSection("hero", { immediate: true });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <a
        href="#content"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-none focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink"
      >
        Skip to content
      </a>

      <nav
        aria-label="Primary"
        className={`border-b-[3px] transition-[background-color,border-color,backdrop-filter] duration-300 ${
          condensed
            ? "border-ink bg-bg/90 backdrop-blur-xl calm:bg-bg calm:backdrop-blur-none"
            : "border-transparent bg-transparent"
        }`}
      >
        <div
          className={`shell flex items-center gap-2 transition-[height] duration-300 ${
            condensed ? "h-12 md:h-14" : "h-14 md:h-18"
          }`}
        >
          <a
            href="#hero"
            onClick={jump("hero")}
            aria-label={`${profile.name} — back to top`}
            className="flex shrink-0 items-center"
          >
            <span className="text-sm font-medium text-text">{profile.name}</span>
          </a>

          {/* The section labels only fit from lg up; below that they collapse
              rather than overflow, and the page is navigated by scrolling. */}
          <ul className="ml-4 hidden min-w-0 items-center lg:flex">
            {navSections.map((section) => {
              const active = activeId === section.id;
              return (
                <li key={section.id} className="min-w-0">
                  <a
                    href={`#${section.id}`}
                    onClick={jump(section.id)}
                    aria-current={active ? "true" : undefined}
                    className={`relative inline-flex h-8 items-center whitespace-nowrap rounded-none px-2 text-sm transition-colors xl:px-3 ${
                      active ? "text-accent" : "text-muted hover:text-text"
                    }`}
                  >
                    {section.label}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2 bottom-0 h-px bg-accent xl:inset-x-3"
                      />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ResumeButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
