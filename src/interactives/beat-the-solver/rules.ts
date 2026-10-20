import type { ShiftableId } from "./engine";

/**
 * The game's one rule: how many hours each shiftable load must run, matched
 * to what EcoPulse actually delivered that day. It ran desalination 9 hours
 * and the ice plant 7, pausing one hour of each rather than burn diesel.
 *
 * Kept out of the game component so the section can quote it in the
 * instructions without pulling the game's code into the first page load.
 */
export const REQUIRED: Record<ShiftableId, number> = { desal: 9, ice: 7 };
