import { Nav } from "@/components/Nav";
import { CommandPalette } from "@/components/CommandPalette";
import { Hero } from "@/sections/Hero";
import { About } from "@/sections/About";
import { EcoPulse } from "@/sections/EcoPulse";
import { Projects } from "@/sections/Projects";
import { Timeline } from "@/sections/Timeline";
import { GitHub } from "@/sections/GitHub";
import { Contact } from "@/sections/Contact";

/**
 * One component per section, in scroll order. The ids these render must match
 * `src/lib/sections.ts`, which the nav and the ⌘K palette navigate by.
 */
export default function Page() {
  return (
    <>
      <Nav />
      <CommandPalette />
      <main className="flex-1">
        <Hero />
        <About />
        <EcoPulse />
        <Projects />
        <Timeline />
        <GitHub />
        <Contact />
      </main>
    </>
  );
}
