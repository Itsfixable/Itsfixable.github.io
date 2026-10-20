"use client";

import { profile } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { Columns, Fact, Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { ValueOrPlaceholder } from "./_hero/Placeholder";

const META = sectionMeta("about");

export function About() {
  const [lead] = profile.about;

  return (
    <SectionFrame
      id="about"
      title={META.title}
      intro={<p className="max-w-[52ch] text-xl leading-snug text-muted sm:text-2xl">{lead}</p>}
    >
      <Row label="Facts">
        <Columns>
          {profile.facts.map((fact, index) => (
            <Fact key={fact.label} label={fact.label} index={index}>
              <ValueOrPlaceholder value={fact.value} />
            </Fact>
          ))}
        </Columns>
      </Row>
    </SectionFrame>
  );
}
