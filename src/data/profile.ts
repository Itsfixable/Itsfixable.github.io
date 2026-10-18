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
  /** An interactive shown open on the page, under the project list. */
  playable: "hangul" | null;
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
  role: "Student Developer",
  location: "Alpharetta, GA",
  /** Hero sub-line. Two short clauses read best here. */
  tagline: "I build things that measure whether they actually worked.",
  about: [
    "I like problems with a number attached. The projects I'm proudest of are the ones where I can point at a measurement and say what changed.",
    "I started with Arduino hardware in 2023 and moved into software. Now I build full-stack web apps, and I speak English and Japanese.",
  ],
  /** Short list under the About copy. */
  facts: [
    { label: "Based in", value: "Alpharetta, GA" },
    { label: "Currently", value: "High school junior" },
    { label: "Focused on", value: "Frontend engineering, data-backed products" },
    { label: "Open to", value: "Internships and hackathon teams" },
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
    value: "mr.koji.tanaka@gmail.com",
    href: "mailto:mr.koji.tanaka@gmail.com",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    value: "in/koji-tanaka-188119414",
    href: "https://www.linkedin.com/in/koji-tanaka-188119414/",
  },
];

/**
 * Résumé button target: `public/resume.pdf`. A plain <a> does not get the
 * GitHub Pages base path added automatically, so it is prefixed here.
 */
export const resume = {
  label: "Résumé",
  href: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/resume.pdf`,
  /** When false the button renders disabled rather than linking nowhere. */
  available: true,
};

export const githubUsername = "Itsfixable";

/**
 * Repositories left out of the live GitHub section: experiments and school
 * assignments that are public on GitHub but are not portfolio work.
 */
export const hiddenRepos: readonly string[] = [
  "test1",
  "pokemonCard",
  "fbla-game-simulation-and-programming",
  "Proxy_War_Board_Game",
];

export const projects: Project[] = [
  {
    id: "ecopulse",
    name: "EcoPulse",
    tagline: "Decides every hour where an island's power and water go.",
    year: "2026",
    role: "Solo builder",
    blurb:
      "Built at DreamHacks 2026 at Georgia Tech. EcoPulse reads the live weather forecast for Ta'ū, American Samoa, and plans the next 24 hours of solar, wind, battery and diesel. It cut diesel use by 41% compared with a fixed schedule, without ever cutting power to critical loads.",
    highlights: [
      "Cut diesel use by 41%",
      "Built at DreamHacks 2026, Georgia Tech",
      "Live demo deployed on Vercel",
    ],
    stack: [
      "React",
      "TypeScript",
      "Next.js",
      "Three.js",
      "GSAP",
      "Tailwind CSS",
      "Claude API",
      "Open-Meteo",
    ],
    demo: "https://eco-pulse-omega.vercel.app",
    repo: null,
    status: "live",
    playable: null,
  },
  {
    id: "korean-quest",
    name: "Korean Quest",
    tagline: "Learning Hangul as a game loop instead of a flashcard pile.",
    year: "2025–2026",
    role: "Designer and developer",
    blurb:
      "A Korean-learning site with lessons, flashcards, Hangul tracing and a pixel-art adventure game. It started as a static site for FBLA, and I rebuilt it as a Next.js app.",
    highlights: [
      "Playable in the browser, no install",
      "Shipped on GitHub Pages",
      "Qualified for FBLA nationals",
    ],
    stack: [
      "JavaScript",
      "Next.js",
      "React",
      "TypeScript",
      "Zustand",
      "Tailwind CSS",
      "Supabase",
    ],
    demo: "https://itsfixable.github.io/Korean-Quest",
    repo: "https://github.com/Itsfixable/Korean-Quest",
    status: "live",
    playable: "hangul",
  },
];

export type ExperienceEntry = {
  id: string;
  org: string;
  role: string;
  when: string;
  highlights: string[];
  stack: string[];
  /** A live demo rendered under the entry. */
  demo: "query-lab" | null;
};

/** From the résumé, most recent first. */
export const experience: ExperienceEntry[] = [
  {
    id: "rox",
    org: "Rox AI",
    role: "Product Engineer Intern",
    when: "June 2026",
    highlights: [
      "Shipped production features for a React and TypeScript web app",
      "Rebuilt a customer-facing page that was later adopted by Verkada",
      "Built server-side search, filtering and sorting, and tuned production code for speed",
    ],
    stack: [
      "React",
      "TypeScript",
      "Tailwind CSS",
      "TanStack Table",
      "TanStack Query",
      "Zustand",
      "REST APIs",
    ],
    demo: "query-lab",
  },
  {
    id: "fbla",
    org: "Future Business Leaders of America",
    role: "Competitive member and officer",
    when: "Aug 2024 – present",
    highlights: [
      "1st place in Computer Problem Solving at the State Leadership Conference, qualifying for nationals",
      "2nd place in Website Design at the State Leadership Conference, qualifying for nationals",
    ],
    stack: [],
    demo: null,
  },
  {
    id: "hack-club",
    org: "Hack Club",
    role: "Member and officer",
    when: "Aug 2024 – present",
    highlights: [
      "Builds AI and machine-learning projects",
      "Prototyped a smart voice assistant",
    ],
    stack: [],
    demo: null,
  },
  {
    id: "hardware",
    org: "Hardware projects",
    role: "Arduino and ESP32",
    when: "July 2023",
    highlights: [
      "Designed and built an Arduino radar that detects objects and shows their distance",
      "Built text and graphics displays on OLED and LCD screens",
      "Built an Alexa-style voice assistant on Arduino and ESP32",
    ],
    stack: ["Arduino", "ESP32", "C"],
    demo: null,
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
    caption: "against a fixed schedule, same island, same 24-hour forecast",
  },
  problem: {
    title: "Problem",
    body: "Ta'ū runs on solar, wind, a battery bank and a diesel generator with a limited fuel reserve. Its desalination plant is both the island's biggest flexible load and its only source of drinking water. Power and fresh water are one problem: when power is short, you are choosing between light and water.",
  },
  approach: {
    title: "Approach",
    body: "Pull the real hourly forecast, model what the panels and turbine will produce, then plan all 24 hours in priority order. The clinic, water pumps and comms never lose power. Desalination and the ice plant shift to sunny hours, and the battery charges ahead of forecast gaps. The plan re-solves whenever conditions change, and Claude explains each decision.",
  },
  result: {
    title: "Result",
    body: "On the same forecast, a fixed schedule burns 303 L of diesel and EcoPulse burns 179 L: 41% less diesel and 332 kg of CO₂ avoided, with no critical outages and the water tank never running dry.",
  },
  /**
   * Diesel burned per hour in one 24-hour plan, from EcoPulse's own solver run
   * on its saved Ta'ū forecast (`npx tsx scripts/verify.ts` in the EcoPulse
   * repo; generator kW × 0.28 L/kWh). The other 20 hours burn no diesel in
   * either plan, so only these four are charted.
   */
  chart: {
    isPlaceholder: false,
    unit: "L / hour",
    period: "hour",
    note: "One 24-hour plan for Ta'ū. Neither plan burns diesel outside 6–9 am. At 8 and 9 am the fixed schedule runs desalination on the generator, while EcoPulse waits for the sun.",
    series: [
      { label: "Fixed schedule", key: "baseline" as const },
      { label: "With EcoPulse", key: "withEcoPulse" as const },
    ],
    data: [
      { bucket: "6 am", baseline: 72, withEcoPulse: 72 },
      { bucket: "7 am", baseline: 86, withEcoPulse: 86 },
      { bucket: "8 am", baseline: 116, withEcoPulse: 21 },
      { bucket: "9 am", baseline: 29, withEcoPulse: 0 },
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
    when: "2025",
    why: "Wanted to stop rebuilding the same DOM by hand on every state change.",
    built: "Korean Quest, a Korean-learning site with a pixel-art adventure game.",
    marker: "01",
  },
  {
    id: "typescript",
    tool: "TypeScript",
    when: "2026",
    why: "Got tired of finding out about a renamed prop at runtime.",
    built: "EcoPulse's 24-hour power and water dispatch solver.",
    marker: "02",
  },
  {
    id: "tailwind",
    tool: "Tailwind CSS",
    when: "2026",
    why: "Styling in the same file as the markup turned out to be faster than naming things.",
    built: "A customer-facing page I rebuilt at Rox AI, later adopted by Verkada.",
    marker: "03",
  },
  {
    id: "zustand",
    tool: "Zustand",
    when: "2026",
    why: "Needed state two unrelated components could share without threading props through five levels.",
    built: "The motion-mode and filter store running this site.",
    marker: "04",
  },
  {
    id: "tanstack",
    tool: "TanStack Query",
    when: "2026",
    why: "Server data is not state — caching, refetching and loading flags should not be hand-rolled.",
    built: "The live GitHub section further up this page.",
    marker: "05",
  },
];

export const contact = {
  heading: "Let's build something measurable",
  body: "If you're hiring interns, putting a hackathon team together, or have a problem with a number attached, I'd like to hear about it. Email is the fastest way to reach me.",
  socials,
  resume,
};
