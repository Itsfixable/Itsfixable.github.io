"use client";

/**
 * The spine and the nodes have to agree on one x-position at every breakpoint,
 * and the spine is positioned against the <ol> while the nodes live inside
 * their grid cells. Keeping both numbers in one file is the only way they stay
 * in step.
 *
 * Mobile  — [node 1.5rem][gap 1.25rem][body]
 *           node centre = 0.75rem                       -> left-3
 * Desktop — [meta 7rem][gap 1.25rem][node 1.5rem][gap 1.25rem][body]
 *           node centre = 7 + 1.25 + 0.75 = 9rem        -> left-[9rem]
 */
export const ENTRY_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-5 md:grid-cols-[7rem_1.5rem_minmax(0,1fr)]";

/** Horizontal placement of the spine, matched to the node column centre. */
export const SPINE_X = "left-3 md:left-[9rem]";

/** Vertical start of the spine: the centre of the first node (h-6 -> 0.75rem). */
export const SPINE_TOP = "top-3";
