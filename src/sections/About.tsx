"use client";

import { profile } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { Cell } from "@/components/mondrian/Grid";
import { Row, SectionFrame } from "@/components/mondrian/SectionFrame";
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
        <div className="mondrian-grid h-full grid-cols-2 border-0 lg:grid-cols-4">
          {profile.facts.map((fact) => (
            <Cell key={fact.label} className="p-5 sm:p-6">
              <dl>
                <dt className="eyebrow">{fact.label}</dt>
                <dd className="mt-2 text-base sm:text-lg">
                  <ValueOrPlaceholder value={fact.value} />
                </dd>
              </dl>
            </Cell>
          ))}
        </div>
      </Row>
    </SectionFrame>
  );
}
