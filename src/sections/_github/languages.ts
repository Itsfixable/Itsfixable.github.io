"use client";

import type { Repo } from "./types";

/**
 * Language dots use GitHub's own colours rather than the site accent: the
 * acid lime is reserved for the one active thing in a section, and thirty
 * lime dots would spend it on nothing.
 *
 * Unlisted languages fall back to a neutral so an unknown language still
 * reads as a language.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  Assembly: "#6E4C13",
  Astro: "#ff5a03",
  C: "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  CSS: "#563d7c",
  Clojure: "#db5855",
  Dart: "#00B4AB",
  Dockerfile: "#384d54",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  "F#": "#b845fc",
  Go: "#00ADD8",
  Groovy: "#4298b8",
  HCL: "#844FBA",
  HTML: "#e34c26",
  Haskell: "#5e5086",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  "Jupyter Notebook": "#DA5B0B",
  Julia: "#a270ba",
  Kotlin: "#A97BFF",
  Lua: "#000080",
  MDX: "#fcb32c",
  Makefile: "#427819",
  Nim: "#ffc200",
  Nix: "#7e7eff",
  "Objective-C": "#438eff",
  OCaml: "#ef7a08",
  PHP: "#4F5D95",
  PLpgSQL: "#336790",
  Perl: "#0298c3",
  PowerShell: "#012456",
  Python: "#3572A5",
  R: "#198CE7",
  Ruby: "#701516",
  Rust: "#dea584",
  SCSS: "#c6538c",
  Scala: "#c22d40",
  Shell: "#89e051",
  Solidity: "#AA6746",
  Svelte: "#ff3e00",
  Swift: "#F05138",
  TeX: "#3D6117",
  TypeScript: "#3178c6",
  "Vim Script": "#199f4b",
  Vue: "#41b883",
  Zig: "#ec915c",
};

const FALLBACK_COLOR = "#5c636a";

export function languageColor(language: string | null): string {
  if (!language) return FALLBACK_COLOR;
  return LANGUAGE_COLORS[language] ?? FALLBACK_COLOR;
}

export type LanguageFacet = {
  name: string;
  count: number;
};

/**
 * The filter chips are derived from whatever actually came back, never from a
 * hardcoded list — a new language shows up on its own, and a language that
 * disappears takes its chip with it.
 *
 * Sorted by frequency, then alphabetically so equal counts are stable.
 */
export function deriveLanguages(repos: Repo[]): LanguageFacet[] {
  const counts = new Map<string, number>();

  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
