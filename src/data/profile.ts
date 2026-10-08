/**
 * Single source of truth for every piece of personal content on the site.
 *
 * Anything not yet confirmed is written as the literal string "[placeholder]"
 * (or wrapped in PLACEHOLDER) so it is obvious in the UI and greppable:
 *   grep -rn "\[placeholder\]" src/
 */

export const PLACEHOLDER = "[placeholder]" as const;

export type Social = {
  id: string;
  label: string;
  /** Visible handle / address. */
  value: string;
  href: string;
};

export type Project = {
  id: string;
  name: string;
  /** One-line positioning statement. */
  tagline: string;
  year: string;
  role: string;
  /** Short paragraph for cards. */
  blurb: string;
  /** Punchy bullets, 2-4 items. */
  highlights: string[];
  stack: string[];
  demo: string | null;
  repo: string | null;
  /** Shown as a badge on the card. */
  status: "live" | "in-progress" | "archived" | "physical";
};

export type TimelineEntry = {
  id: string;
  tool: string;
  /** When Koji picked it up. */
  when: string;
  /** The itch that made this tool worth learning. */
  why: string;
  /** What he actually shipped with it. */
  built: string;
  /** Rendered as a short monospace label. */
  marker: string;
};

export const profile = {
  name: "Koji Tanaka",
  handle: "Itsfixable",
  role: PLACEHOLDER,
  location: PLACEHOLDER,
  /** Hero sub-line. Two short clauses read best here. */
  tagline: "I build things that measure whether they actually worked.",
  availability: PLACEHOLDER,
  about: [
    "I am a builder who likes problems with a number attached. The projects I am proudest of are the ones where I can point at a measurement and say: this is what changed.",
    PLACEHOLDER,
    PLACEHOLDER,
  ],
  /** Short list under the About copy. */
  facts: [
    { label: "Based in", value: PLACEHOLDER },
    { label: "Currently", value: PLACEHOLDER },
    { label: "Focused on", value: "Frontend engineering, data-backed products" },
    { label: "Open to", value: PLACEHOLDER },
  ],
} as const;

export const socials: Social[] = [
  {
    id: "github",
    label: "GitHub",
    value: "@Itsfixable",
    href: "https://github.com/Itsfixable",
  },
  {
    id: "email",
    label: "Email",
    value: PLACEHOLDER,
    href: "mailto:placeholder@example.com",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    value: PLACEHOLDER,
    href: "#",
  },
];

/** Résumé button target. Drop the PDF in /public and point this at it. */
export const resume = {
  label: "Résumé",
  href: PLACEHOLDER,
  /** When false the button renders disabled rather than linking nowhere. */
  available: false,
};

export const githubUsername = "Itsfixable";

export const projects: Project[] = [
  {
    id: "ecopulse",
    name: "EcoPulse",
    tagline: "Fleet telemetry that turns idling into a number you can cut.",
    year: "2026",
    role: PLACEHOLDER,
    blurb:
      "Built at DreamHacks 2026 at Georgia Tech. EcoPulse watches a diesel fleet's duty cycle and surfaces the waste that nobody was looking at — the result was a 41% cut in diesel use.",
    highlights: [
      "Cut diesel use by 41%",
      "Built at DreamHacks 2026, Georgia Tech",
      "Live demo deployed on Vercel",
    ],
    stack: ["React", "TypeScript", PLACEHOLDER],
    demo: "https://eco-pulse-omega.vercel.app",
    repo: null,
    status: "live",
  },
  {
    id: "korean-quest",
    name: "Korean Quest",
    tagline: "Learning Hangul as a game loop instead of a flashcard pile.",
    year: PLACEHOLDER,
    role: PLACEHOLDER,
    blurb:
      "A browser game for drilling Korean reading. The bet: a tight quest loop keeps you coming back where a vocabulary list does not.",
    highlights: [
      "Playable in the browser, no install",
      "Shipped on GitHub Pages",
      PLACEHOLDER,
    ],
    stack: ["JavaScript", PLACEHOLDER],
    demo: "https://itsfixable.github.io/Korean-Quest",
    repo: "https://github.com/Itsfixable/Korean-Quest",
    status: "live",
  },
  {
    id: "proxy-war",
    name: "Proxy War",
    tagline: "A board game about fighting through someone else's hands.",
    year: PLACEHOLDER,
    role: "Designer",
    blurb:
      "A tabletop design exercise: two powers that can never attack each other directly, only through proxies they have to keep bought-in. Playtesting is where the design actually gets made.",
    highlights: [
      "Physical board game, no screen involved",
      PLACEHOLDER,
      PLACEHOLDER,
    ],
    stack: ["Game design", "Playtesting"],
    demo: null,
    repo: null,
    status: "physical",
  },
];

/** The EcoPulse case study gets its own long-form section. */
export const ecoPulse = {
  project: "EcoPulse",
  event: "DreamHacks 2026",
  venue: "Georgia Tech",
  demo: "https://eco-pulse-omega.vercel.app",
  headlineMetric: {
    /** Negative because it is a reduction. The counter animates to this. */
    value: -41,
    unit: "%",
    label: "diesel use",
    caption: "measured against the fleet's own baseline duty cycle",
  },
  problem: {
    title: "Problem",
    body: "A diesel fleet burns a large share of its fuel doing nothing — idling at loading bays, warming up, waiting on a dispatcher. None of that shows up on a fuel card, so nobody can argue with it, and nobody fixes it.",
  },
  approach: {
    title: "Approach",
    body: "Instrument the duty cycle instead of the fuel tank. EcoPulse reads engine-on time against actual productive movement, splits every hour into working versus wasted, and puts the waste on one screen a dispatcher will actually look at mid-shift.",
  },
  result: {
    title: "Result",
    body: "Once the idle time had a number next to it, the behaviour changed on its own. Diesel use dropped 41% over the measured window.",
  },
  /**
   * Illustrative series for the case-study chart — shape is right, values are
   * not yet the real logged numbers.
   */
  chart: {
    isPlaceholder: true,
    unit: "L / day",
    series: [
      { label: "Baseline", key: "baseline" as const },
      { label: "With EcoPulse", key: "withEcoPulse" as const },
    ],
    data: [
      { bucket: "Wk 1", baseline: 100, withEcoPulse: 97 },
      { bucket: "Wk 2", baseline: 102, withEcoPulse: 88 },
      { bucket: "Wk 3", baseline: 99, withEcoPulse: 74 },
      { bucket: "Wk 4", baseline: 101, withEcoPulse: 66 },
      { bucket: "Wk 5", baseline: 100, withEcoPulse: 61 },
      { bucket: "Wk 6", baseline: 103, withEcoPulse: 59 },
    ],
  },
} as const;

/**
 * One entry per tool, in the order they were picked up. The timeline draws
 * itself as you scroll, so order matters more than exact dates.
 */
export const timeline: TimelineEntry[] = [
  {
    id: "react",
    tool: "React",
    when: PLACEHOLDER,
    why: "Wanted to stop rebuilding the same DOM by hand on every state change.",
    built: PLACEHOLDER,
    marker: "01",
  },
  {
    id: "typescript",
    tool: "TypeScript",
    when: PLACEHOLDER,
    why: "Got tired of finding out about a renamed prop at runtime.",
    built: PLACEHOLDER,
    marker: "02",
  },
  {
    id: "tailwind",
    tool: "Tailwind CSS",
    when: PLACEHOLDER,
    why: "Styling in the same file as the markup turned out to be faster than naming things.",
    built: PLACEHOLDER,
    marker: "03",
  },
  {
    id: "zustand",
    tool: "Zustand",
    when: PLACEHOLDER,
    why: "Needed state two unrelated components could share without threading props through five levels.",
    built: "The motion-mode and filter store running this site.",
    marker: "04",
  },
  {
    id: "tanstack",
    tool: "TanStack Query",
    when: PLACEHOLDER,
    why: "Server data is not state — caching, refetching and loading flags should not be hand-rolled.",
    built: "The live GitHub section further up this page.",
    marker: "05",
  },
];

export const contact = {
  heading: "Let's build something measurable",
  body: PLACEHOLDER,
  socials,
  resume,
};
