"use client";

import { useIsPaletteOpen } from "./_chrome/paletteStore";

/**
 * `<main>` itself, pulled out of the server-rendered `page.tsx` only because it
 * needs one bit of client reactivity: while the command palette is open, the
 * page behind it is marked `inert` so a screen reader (or a stray Tab) cannot
 * wander into content that is visually covered. `CommandPalette` already traps
 * Tab and restores focus on close; this closes the matching gap on the other
 * side of the dialog.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const paletteOpen = useIsPaletteOpen();

  return (
    <main id="content" tabIndex={-1} className="flex-1 outline-none" inert={paletteOpen}>
      {children}
    </main>
  );
}
