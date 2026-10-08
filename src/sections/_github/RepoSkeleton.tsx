"use client";

import { motion } from "framer-motion";
import { CARD_SHELL } from "./RepoCard";

/**
 * A placeholder that occupies exactly the same box as a real card: same
 * `CARD_SHELL`, same `min-h`, same internal rhythm. Swapping one for the other
 * when the data lands must not move anything on the page.
 */
export function RepoSkeleton({ calm }: { calm: boolean }) {
  return (
    <li
      // Decorative: screen readers get the live region in the toolbar instead
      // of six identical empty cards.
      aria-hidden="true"
      className={`${CARD_SHELL} relative overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-[0.9375rem] w-1/2 rounded-sm bg-surface-3" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded-sm bg-surface-2" />
        <div className="h-3 w-4/5 rounded-sm bg-surface-2" />
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-line pt-3">
        <div className="size-2 shrink-0 rounded-full bg-surface-3" />
        <div className="h-2.5 w-16 rounded-sm bg-surface-2" />
        <div className="h-2.5 w-8 rounded-sm bg-surface-2" />
        <div className="ml-auto h-2.5 w-20 rounded-sm bg-surface-2" />
      </div>

      {/* Wild mode only: a slow sweep across the placeholder. In calm mode the
          element is not rendered at all, leaving a static dim block — the
          layout is identical either way. */}
      {calm ? null : (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
          initial={{ x: "-110%" }}
          animate={{ x: "110%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}
    </li>
  );
}

/** The loading grid. Count matches the real card cap so nothing reflows. */
export function RepoSkeletonGrid({ calm, count }: { calm: boolean; count: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <RepoSkeleton key={index} calm={calm} />
      ))}
    </ul>
  );
}
