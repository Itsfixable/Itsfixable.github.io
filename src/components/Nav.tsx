"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { profile } from "@/data/profile";
import { scrollToSection } from "@/lib/scroll";
import { navSections, sections, type SectionId } from "@/lib/sections";
import { ResumeButton } from "./_chrome/ResumeButton";

/** Where in the viewport a section counts as "the one you are reading". */
const ACTIVE_LINE = 112;


/**
 * A slim bar in the section's own colour under the current section, and the
 * same bar on hover. Full static class strings so Tailwind can see them.
 */
const UNDERLINE = {
  red: "shadow-[inset_0_-4px_0_0_var(--color-m-red)]",
  blue: "shadow-[inset_0_-4px_0_0_var(--color-m-blue)]",
  yellow: "shadow-[inset_0_-4px_0_0_var(--color-m-yellow)]",
} as const;

const HOVER_UNDERLINE = {
  red: "hover:shadow-[inset_0_-4px_0_0_var(--color-m-red)]",
  blue: "hover:shadow-[inset_0_-4px_0_0_var(--color-m-blue)]",
  yellow: "hover:shadow-[inset_0_-4px_0_0_var(--color-m-yellow)]",
} as const;

export function Nav() {
  const [activeId, setActiveId] = useState<SectionId | null>(null);

  /**
   * Active-section tracking: one IntersectionObserver over the section
   * elements named in the registry. The observer tells us *which* sections are
   * on screen; the pick below decides which of them owns the nav, by taking
   * the last one whose top has crossed the nav line. Thresholds are dense so a
   * section taller than the viewport still fires while it scrolls past.
   * At the very bottom of the page the last section wins, since one shorter
   * than the screen never reaches the line.
   */
  useEffect(() => {
    const ids = sections.map((section) => section.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();
    const lastId = ids[ids.length - 1];

    const pick = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && visible.has(lastId)) {
        setActiveId(lastId);
        return;
      }

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

    // The observer can go quiet before the last few pixels of scroll.
    let frame = 0;
    const onScroll = () => {
      if (frame === 0)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          pick();
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
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

      {/* One black line under the bar, nothing boxed. The current section
          is underlined in its own colour. */}
      <nav
        aria-label="Primary"
        className="border-b-[length:var(--rule)] border-ink bg-bg"
      >
        <div className="shell flex h-12 items-stretch md:h-14">
          <a
            href="#hero"
            onClick={jump("hero")}
            aria-label={`${profile.name} — back to top`}
            className="-ml-3 flex shrink-0 items-center px-3 text-sm font-semibold text-text transition-colors hover:bg-m-yellow focus-visible:bg-m-yellow"
          >
            {profile.name}
          </a>

          {/* The section labels only fit from lg up; below that they collapse
              rather than overflow, and the page is navigated by scrolling. */}
          <ul className="ml-6 hidden min-w-0 items-stretch gap-1 lg:flex xl:ml-10">
            {navSections.map((section) => {
              const active = activeId === section.id;
              const tone = section.tone ?? "blue";
              return (
                <li key={section.id} className="flex min-w-0">
                  <a
                    href={`#${section.id}`}
                    onClick={jump(section.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex items-center gap-2 whitespace-nowrap px-3 text-sm transition-[box-shadow,color] duration-200 xl:px-4 ${
                      active ? `font-medium text-text ${UNDERLINE[tone]}` : `text-muted hover:text-text ${HOVER_UNDERLINE[tone]}`
                    }`}
                  >
                    <span className="font-mono text-[0.625rem] tabular-nums text-faint">{section.number}</span>
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex shrink-0 items-center">
            <ResumeButton tone="ghost" />
          </div>
        </div>
      </nav>
    </header>
  );
}
