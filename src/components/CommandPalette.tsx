"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { PLACEHOLDER, projects, resume, socials, type Social } from "@/data/profile";
import { EASE_OUT, calmTransition, durations } from "@/lib/motion";
import { getLenis, scrollToSection } from "@/lib/scroll";
import { sections } from "@/lib/sections";
import { useIsCalm, useToggleMotionMode } from "@/store/ui";
import { IconArrowUpRight, IconClose, IconEnter, IconSearch } from "./_chrome/icons";
import { isPlaceholder, PlaceholderChip } from "./_chrome/Placeholder";
import { useIsPaletteOpen, useSetPaletteOpen, useTogglePalette } from "./_chrome/paletteStore";
import { useModKeyLabel } from "./_chrome/platform";
import { resumeAvailable, resumeUnavailableReason } from "./_chrome/ResumeButton";
import { useFocusTrap } from "./_chrome/useFocusTrap";

/* ------------------------------------------------------------------ model */

type CommandGroup = "Sections" | "Settings" | "Links";

/** Group order is the render order, which is also the flat selection order. */
const GROUP_ORDER: CommandGroup[] = ["Sections", "Settings", "Links"];

type Command = {
  id: string;
  group: CommandGroup;
  label: string;
  /** Secondary text at the right of the row. */
  hint?: string;
  keywords: string[];
  external?: boolean;
  /**
   * Run a frame after closing instead of immediately. Needed for anything that
   * scrolls (the lock has to lift first); deliberately *not* used for links,
   * because Safari only honours `window.open` inside the original gesture.
   */
  deferred?: boolean;
  /** A command that would navigate nowhere is shown, not hidden — and inert. */
  disabled?: boolean;
  reason?: string;
  run: () => void;
};

function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function followLink(href: string) {
  if (typeof window === "undefined") return;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

/** The only usable href for a social, or null when it is still a gap. */
function socialHref(social: Social): string | null {
  if (!isPlaceholder(social.href)) return social.href;
  // If the address lands before the href does, a mailto: can still be built.
  if (social.id === "email" && !isPlaceholder(social.value) && social.value.includes("@")) {
    return `mailto:${social.value}`;
  }
  return null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/* ------------------------------------------------------------------ shell */

/**
 * The outer shell owns only the things that must survive the dialog: the
 * global key bindings and the background scroll lock. Everything stateful
 * lives in `PaletteDialog`, which mounts fresh on every open — so the query
 * and the cursor reset themselves without an effect.
 */
export function CommandPalette() {
  const open = useIsPaletteOpen();
  const setOpen = useSetPaletteOpen();
  const togglePalette = useTogglePalette();
  const calm = useIsCalm();

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        // Stops Firefox's quick-find and any browser "search" binding.
        event.preventDefault();
        togglePalette();
        return;
      }

      if (event.key === "Escape" && open && !event.defaultPrevented) {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "/" && !open && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open, setOpen, togglePalette]);

  /**
   * Lenis has to be stopped explicitly — wheel events never reach the document
   * otherwise. It returns null in calm mode, where it was destroyed, and there
   * the body overflow lock is the whole mechanism. The cleanup runs on close
   * *and* on unmount, so a closed palette can never leave the page frozen.
   */
  useEffect(() => {
    if (!open) return;

    getLenis()?.stop();

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      getLenis()?.start();
    };
  }, [open]);

  const transition = calmTransition({ duration: durations.fast, ease: EASE_OUT }, calm);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-start sm:px-6 sm:pt-[12vh]">
          <motion.div
            aria-hidden="true"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="absolute inset-0 bg-bg/80 backdrop-blur-md calm:bg-bg/95 calm:backdrop-blur-none"
          />
          <PaletteDialog calm={calm} close={close} transition={transition} />
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* ----------------------------------------------------------------- dialog */

function PaletteDialog({
  calm,
  close,
  transition,
}: {
  calm: boolean;
  close: () => void;
  transition: ReturnType<typeof calmTransition>;
}) {
  const toggleMotion = useToggleMotionMode();
  const modKey = useModKeyLabel();

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const titleId = `${baseId}-title`;
  const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId]);

  const [query, setQuery] = useState("");
  /** The cursor is stored as a command id so the index can be derived. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const { containerRef, handleTabKeyDown } = useFocusTrap<HTMLDivElement>(true);

  /* ---------------------------------------------------------- commands */

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    // Every section in the registry, navHidden ones included — the palette is
    // exactly where those are meant to be reachable.
    for (const section of sections) {
      list.push({
        id: `section:${section.id}`,
        group: "Sections",
        label: section.title,
        hint: section.label,
        keywords: [section.id, section.label, ...section.keywords],
        deferred: true,
        run: () => scrollToSection(section.id),
      });
    }

    list.push({
      id: "settings:motion",
      group: "Settings",
      // Labelled with the mode it switches *to*, not the one you are in.
      label: calm ? "Switch to wild motion" : "Switch to calm motion",
      hint: `now: ${calm ? "calm" : "wild"}`,
      keywords: [
        "motion",
        "animation",
        "calm",
        "wild",
        "reduce",
        "reduced",
        "accessibility",
        "toggle",
      ],
      run: toggleMotion,
    });

    for (const social of socials) {
      const href = socialHref(social);
      const known = !isPlaceholder(social.value);
      list.push({
        id: `link:social:${social.id}`,
        group: "Links",
        label: `Open ${social.label}`,
        hint: href ? (known ? social.value : hostOf(href)) : undefined,
        keywords: [social.id, social.label, social.value, "link", "social", "contact"],
        external: true,
        disabled: href === null,
        reason: `${social.label} is still ${PLACEHOLDER}`,
        run: () => {
          if (href) followLink(href);
        },
      });
    }

    for (const project of projects) {
      const demo = project.demo;
      if (!demo || isPlaceholder(demo)) continue;
      list.push({
        id: `link:demo:${project.id}`,
        group: "Links",
        label: `Open ${project.name} demo`,
        hint: hostOf(demo),
        keywords: [project.id, project.name, project.tagline, "demo", "live", "project"],
        external: true,
        run: () => followLink(demo),
      });
    }

    list.push({
      id: "link:resume",
      group: "Links",
      label: `Open ${resume.label}`,
      hint: resumeAvailable ? hostOf(resume.href) : undefined,
      keywords: ["resume", "resumé", "résumé", "cv", "pdf", "hire", "download"],
      external: true,
      disabled: !resumeAvailable,
      reason: resumeUnavailableReason,
      run: () => followLink(resume.href),
    });

    return list;
  }, [calm, toggleMotion]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed === "") return commands;
    const terms = trimmed.split(/\s+/);
    return commands.filter((command) => {
      const haystack = [command.label, command.hint ?? "", ...command.keywords]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [commands, query]);

  /**
   * Derived, never stored: the cursor falls back to the first runnable row
   * whenever the row it was on leaves the result set.
   */
  const selected = useMemo(() => {
    if (selectedId !== null) {
      const found = filtered.findIndex(
        (command) => command.id === selectedId && !command.disabled,
      );
      if (found !== -1) return found;
    }
    const firstEnabled = filtered.findIndex((command) => !command.disabled);
    return firstEnabled === -1 ? 0 : firstEnabled;
  }, [filtered, selectedId]);

  const grouped = useMemo(() => {
    const indexed = filtered.map((command, index) => ({ command, index }));
    return GROUP_ORDER.map((group) => ({
      group,
      items: indexed.filter((entry) => entry.command.group === group),
    })).filter((bucket) => bucket.items.length > 0);
  }, [filtered]);

  /* -------------------------------------------------- focus + scrolling */

  /**
   * Mount is open and unmount is close, so this one effect covers both ends:
   * capture whatever had focus (the ⌘K button, or the body for a key press),
   * move focus into the input, and hand it back on the way out.
   */
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();

    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  // Keep the cursor row on screen as it moves.
  useEffect(() => {
    document.getElementById(optionId(selected))?.scrollIntoView({ block: "nearest" });
  }, [grouped, optionId, selected]);

  /* --------------------------------------------------------- behaviour */

  const move = (direction: 1 | -1) => {
    const count = filtered.length;
    if (count === 0) return;
    let next = selected;
    for (let step = 0; step < count; step += 1) {
      next = (next + direction + count) % count;
      if (!filtered[next]?.disabled) break;
    }
    const command = filtered[next];
    if (command && !command.disabled) setSelectedId(command.id);
  };

  const runCommand = (command: Command) => {
    if (command.disabled) return;
    close();
    // Scroll commands wait a frame, so the shell's cleanup has released Lenis
    // and the body scroll lock before the page is asked to move. Links run
    // inside the gesture so popup blockers leave them alone.
    if (command.deferred && typeof window !== "undefined") {
      window.requestAnimationFrame(() => command.run());
      return;
    }
    command.run();
  };

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }
    handleTabKeyDown(event);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const command = filtered[selected];
    if (command) runCommand(command);
  };

  /* ------------------------------------------------------------ render */

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onDialogKeyDown}
      initial={calm ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.985 }}
      animate={calm ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={calm ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
      transition={transition}
      className="relative flex h-full w-full min-w-0 flex-col overflow-hidden border-line bg-surface shadow-2xl shadow-black/60 sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-card sm:border"
    >
      <h2 id={titleId} className="sr-only">
        Command palette — jump to a section or open a link
      </h2>

      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3.5">
        <IconSearch className="shrink-0 text-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // Each keystroke re-aims at the top match.
            setSelectedId(null);
          }}
          onKeyDown={onInputKeyDown}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={filtered.length > 0 ? optionId(selected) : undefined}
          aria-autocomplete="list"
          aria-label="Search sections, settings and links"
          placeholder="Jump to a section, open a link…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-faint"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close command palette"
          className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:text-text"
        >
          <IconClose />
        </button>
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Commands"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2"
      >
        {grouped.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            No commands match <span className="font-mono text-text">{query}</span>
          </p>
        ) : (
          grouped.map((bucket) => (
            <div key={bucket.group} role="group" aria-labelledby={`${baseId}-group-${bucket.group}`}>
              <div id={`${baseId}-group-${bucket.group}`} className="eyebrow px-4 pb-1.5 pt-4">
                {bucket.group}
              </div>

              {bucket.items.map(({ command, index }) => {
                const isSelected = index === selected;
                return (
                  <div
                    key={command.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={command.disabled ? true : undefined}
                    onClick={() => runCommand(command)}
                    onMouseMove={() => {
                      if (!command.disabled) setSelectedId(command.id);
                    }}
                    className={`mx-2 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm ${
                      command.disabled
                        ? "cursor-not-allowed text-faint"
                        : `cursor-pointer ${
                            isSelected ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-2"
                          }`
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-4 w-px shrink-0 ${
                        isSelected && !command.disabled ? "bg-accent" : "bg-transparent"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>

                    {command.disabled ? (
                      <PlaceholderChip className="shrink-0" />
                    ) : command.hint ? (
                      <span className="shrink-0 font-mono text-[11px] text-faint">
                        {command.hint}
                      </span>
                    ) : null}

                    {command.external && !command.disabled ? (
                      <IconArrowUpRight className="shrink-0 opacity-50" />
                    ) : null}
                  </div>
                );
              })}

              {bucket.items.some(({ command }) => command.disabled && command.reason) ? (
                <p className="px-4 pt-1 text-[11px] leading-relaxed text-faint">
                  {bucket.items
                    .filter(({ command }) => command.disabled && command.reason)
                    .map(({ command }) => command.reason)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-line bg-surface-2 px-1">↑</kbd>
          <kbd className="rounded border border-line bg-surface-2 px-1">↓</kbd>
          move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconEnter />
          run
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-line bg-surface-2 px-1">esc</kbd>
          close
        </span>
        <span className="ml-auto hidden sm:inline">{modKey} K</span>
      </div>
    </motion.div>
  );
}
