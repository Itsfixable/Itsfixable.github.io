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
      entrance="drop"
      title={META.title}
      intro={<p className="max-w-[52ch] text-xl leading-snug text-muted sm:text-2xl">{lead}</p>}
    >
      <Row label="Facts" flush>
        <Columns>
          {profile.facts.map((fact) => (
            <Fact key={fact.label} label={fact.label}>
              <ValueOrPlaceholder value={fact.value} />
            </Fact>
          ))}
        </Columns>
      </Row>
    </SectionFrame>
  );
}
