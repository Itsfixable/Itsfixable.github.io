"use client";

import { profile } from "@/data/profile";
import { sections } from "@/lib/sections";
import { Cell, Grid, type Tone } from "@/components/mondrian/Grid";
import { ValueOrPlaceholder } from "./_hero/Placeholder";

const META = sections.find((section) => section.id === "about");

/** One fact gets a colour block so the row reads as a Mondrian, not a table. */
const FACT_TONE: Record<string, Tone> = { Currently: "blue" };

export function About() {
  const [lead] = profile.about;

  return (
    <section id="about" className="shell">
      <Grid joined className="grid-cols-2 lg:grid-cols-4">
        <Cell tone="yellow" order={0} className="col-span-2 flex flex-col justify-end p-5 sm:p-8 lg:col-span-1">
          <p className="eyebrow !text-ink">{META?.label ?? "About"}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{META?.title ?? "About"}</h2>
        </Cell>

        <Cell className="col-span-2 flex items-end p-5 sm:p-8 lg:col-span-3 lg:p-10">
          <p className="max-w-[46ch] text-xl leading-snug text-text sm:text-2xl">{lead}</p>
        </Cell>

        {profile.facts.map((fact, index) => {
          const tone = FACT_TONE[fact.label] ?? "paper";
          return (
            <Cell key={fact.label} tone={tone} order={index + 1} className="p-5 sm:p-6">
              <dl>
                <dt className={`eyebrow ${tone === "paper" ? "" : "!text-white/80"}`}>{fact.label}</dt>
                <dd className="mt-2 text-base sm:text-lg">
                  <ValueOrPlaceholder value={fact.value} />
                </dd>
              </dl>
            </Cell>
          );
        })}
      </Grid>
    </section>
  );
}
