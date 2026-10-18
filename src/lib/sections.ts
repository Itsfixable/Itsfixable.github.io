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
};

export const sections: SectionMeta[] = [
  { id: "hero", label: "Top", title: "Back to top", keywords: ["home", "start", "hero"], navHidden: true },
  { id: "about", label: "About", title: "About Koji", keywords: ["bio", "who"] },
  { id: "experience", label: "Experience", title: "Experience", keywords: ["rox", "internship", "intern", "fbla", "hack club", "arduino", "query lab", "supabase", "tanstack"] },
  { id: "ecopulse", label: "EcoPulse", title: "EcoPulse case study", keywords: ["diesel", "dreamhacks", "41", "case study", "game", "solver"] },
  { id: "projects", label: "Korean Quest", title: "Korean Quest", keywords: ["project", "korean", "hangul", "tracing", "fbla"] },
  { id: "contact", label: "Contact", title: "Contact", keywords: ["email", "hire", "resume", "linkedin"] },
];

export const navSections = sections.filter((s) => !s.navHidden);
