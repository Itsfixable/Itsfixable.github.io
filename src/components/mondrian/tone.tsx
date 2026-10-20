/**
 * Mondrian's palette as the page uses it: three primaries plus black. Colour
 * is a marker, never a field: a small block where two lines meet, a square
 * beside a label, or the fill of something you are about to click.
 */

export type Tone = "red" | "blue" | "yellow" | "black";

export const FILL: Record<Tone, string> = {
  red: "bg-m-red",
  blue: "bg-m-blue",
  yellow: "bg-m-yellow",
  black: "bg-ink",
};

/**
 * The one hover treatment for anything clickable: a white box that fills
 * with its colour. Full static strings so Tailwind can see them.
 */
export const HOVER_FILL: Record<Tone, string> = {
  red: "hover:bg-m-red hover:text-white focus-visible:bg-m-red focus-visible:text-white",
  blue: "hover:bg-m-blue hover:text-white focus-visible:bg-m-blue focus-visible:text-white",
  yellow: "hover:bg-m-yellow focus-visible:bg-m-yellow",
  black: "hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white",
};

/** A small solid square of colour, for marking a label or a link. */
export function Swatch({ tone, className = "" }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 ${FILL[tone]} ${className}`} />;
}
