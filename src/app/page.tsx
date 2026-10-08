import { Nav } from "@/components/Nav";
import { CommandPalette } from "@/components/CommandPalette";
import { MainContent } from "@/components/MainContent";
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
      <MainContent>
        <Hero />
        <About />
        <EcoPulse />
        <Projects />
        <Timeline />
        <GitHub />
        <Contact />
      </MainContent>
    </>
  );
}
