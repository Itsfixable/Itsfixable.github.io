/**
 * The page's section registry — the single list that the page order, the nav
 * and the ⌘K palette all read from, so they can never drift apart.
 *
 * `id` is the DOM id the section root must carry (scroll anchors depend on it).
 */
export type SectionId =
  | "hero"
  | "about"
  | "experience"
  | "ecopulse"
  | "projects"
  | "gpt"
  | "contact";

export type SectionMeta = {
  id: SectionId;
  /** Short label for the nav. */
  label: string;
  /** Longer label for the command palette. */
  title: string;
  /** Extra ⌘K search terms. */
  keywords: string[];
  /** Hidden from the nav bar (still reachable from the palette). */
  navHidden?: boolean;
  /** Position in the reading order, shown as "01", "02"… */
  number?: string;
  /**
   * The section's one colour: its square in the section header and the nav,
   * and its hover fill. Used the same way in every section.
   */
  tone?: "red" | "blue" | "yellow";
};

export const sections: SectionMeta[] = [
  { id: "hero", label: "Top", title: "Back to top", keywords: ["home", "start", "hero"], navHidden: true },
  { id: "about", label: "About", title: "About Koji", keywords: ["bio", "who"], number: "01", tone: "yellow" },
  { id: "experience", label: "Experience", title: "Experience", keywords: ["rox", "internship", "intern", "fbla", "hack club", "arduino", "query lab", "supabase", "tanstack"], number: "02", tone: "blue" },
  { id: "ecopulse", label: "EcoPulse", title: "EcoPulse case study", keywords: ["diesel", "dreamhacks", "41", "case study", "game", "solver"], number: "03", tone: "red" },
  { id: "projects", label: "Korean Quest", title: "Korean Quest", keywords: ["project", "korean", "hangul", "tracing", "fbla"], number: "04", tone: "yellow" },
  { id: "gpt", label: "Tiny GPT", title: "Tiny GPT", keywords: ["gpt", "transformer", "pytorch", "shakespeare", "language model", "attention", "karpathy"], number: "05", tone: "red" },
  { id: "contact", label: "Contact", title: "Contact", keywords: ["email", "hire", "resume", "linkedin"], number: "06", tone: "blue" },
];

export const navSections = sections.filter((s) => !s.navHidden);

export function sectionMeta(id: SectionId): SectionMeta {
  const meta = sections.find((section) => section.id === id);
  if (!meta) throw new Error(`Unknown section: ${id}`);
  return meta;
}

/** The section after `id` in reading order, for each section's "Next" row. */
export function nextSection(id: SectionId): SectionMeta | null {
  const index = navSections.findIndex((section) => section.id === id);
  return index >= 0 && index < navSections.length - 1 ? navSections[index + 1] : null;
}
