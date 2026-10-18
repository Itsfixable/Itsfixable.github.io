"use client";

import { motion } from "framer-motion";
import { profile } from "@/data/profile";
import {
  revealVariants,
  staggerParent,
  useReveal,
  viewportOnce,
} from "@/lib/motion";
import { sections } from "@/lib/sections";
import { useIsCalm } from "@/store/ui";
import { SectionRule } from "@/components/mondrian/SectionRule";
import {
  PlaceholderParagraph,
  ValueOrPlaceholder,
  isPlaceholder,
} from "./_hero/Placeholder";

/** Heading copy comes from the section registry, not from this file. */
const META = sections.find((section) => section.id === "about");

export function About() {
  const calm = useIsCalm();

  /* Two independent reveals for the two halves of the spread. */
  const revealHeading = useReveal();
  const revealLead = useReveal({ index: 1 });

  /* Lists use the parent/child variant pair instead of `useReveal` per item,
     so the stagger is driven by one subscription rather than a hook per row.
     Both collapse to a plain, near-instant opacity fade in calm mode. */
  const listParent = staggerParent(calm);
  const listChild = revealVariants(calm, 16);

  const [lead, ...rest] = profile.about;

  return (
    <section id="about" className="shell section-y">
      <SectionRule tone="blue" />

      <div className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-20">
        <motion.div {...revealHeading}>
          <p className="eyebrow">{META?.label ?? "About"}</p>
          <h2 className="mt-4 text-headline font-medium text-text">
            {META?.title ?? "About"}
          </h2>
        </motion.div>

        <div>
          {/* The lead statement — the one thing in this section that gets the
              accent, as a left rule rather than a fill. */}
          <motion.div
            {...revealLead}
            className="border-l-2 border-accent pl-5 sm:pl-6"
          >
            {isPlaceholder(lead) ? (
              <PlaceholderParagraph note="opening paragraph" />
            ) : (
              <p className="max-w-[46ch] text-xl leading-snug text-text sm:text-2xl">
                {lead}
              </p>
            )}
          </motion.div>

          {/* Remaining paragraphs */}
          <motion.div
            initial="hidden"
            whileInView="shown"
            viewport={viewportOnce}
            variants={listParent}
            className="mt-10 flex flex-col gap-5 pl-5 sm:pl-6"
          >
            {rest.map((paragraph, index) => (
              <motion.div key={index} variants={listChild}>
                {isPlaceholder(paragraph) ? (
                  <PlaceholderParagraph note={`paragraph ${index + 2} of 3`} />
                ) : (
                  <p className="max-w-[62ch] text-base leading-relaxed text-muted sm:text-lg">
                    {paragraph}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Facts */}
          <motion.dl
            initial="hidden"
            whileInView="shown"
            viewport={viewportOnce}
            variants={listParent}
            className="mt-14 grid gap-x-10 sm:grid-cols-2"
          >
            {profile.facts.map((fact) => (
              <motion.div
                key={fact.label}
                variants={listChild}
                className="border-t border-line py-5"
              >
                <dt className="eyebrow">{fact.label}</dt>
                <dd className="mt-2 text-base text-text sm:text-lg">
                  <ValueOrPlaceholder value={fact.value} />
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}
