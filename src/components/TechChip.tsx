import {
  siArduino,
  siC,
  siClaude,
  siEspressif,
  siGreensock,
  siJavascript,
  siNextdotjs,
  siPython,
  siPytorch,
  siReact,
  siSupabase,
  siTailwindcss,
  siTanstack,
  siThreedotjs,
  siTypescript,
  type SimpleIcon,
} from "simple-icons";

/**
 * Logos from Simple Icons (CC0), drawn in ink so they sit in the Mondrian
 * palette instead of eight competing brand colours. Named imports keep only
 * these paths in the bundle. Tools without an icon in the set (Zustand,
 * Open-Meteo) or without an honest one (REST APIs) show their name alone.
 */
const LOGOS: Record<string, SimpleIcon> = {
  Arduino: siArduino,
  C: siC,
  "Claude API": siClaude,
  ESP32: siEspressif,
  GSAP: siGreensock,
  JavaScript: siJavascript,
  "Next.js": siNextdotjs,
  Python: siPython,
  PyTorch: siPytorch,
  React: siReact,
  Supabase: siSupabase,
  "Tailwind CSS": siTailwindcss,
  "TanStack Query": siTanstack,
  "TanStack Table": siTanstack,
  "Three.js": siThreedotjs,
  TypeScript: siTypescript,
};

export function TechChip({ name }: { name: string }) {
  const logo = LOGOS[name];
  return (
    <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-surface px-2.5 py-1 font-mono text-[0.6875rem] text-text">
      {logo ? (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true" className="shrink-0">
          <path d={logo.path} />
        </svg>
      ) : null}
      {name}
    </span>
  );
}
