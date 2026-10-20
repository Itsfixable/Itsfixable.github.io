"use client";

import { Fragment } from "react";
import { contact, profile, resume, socials, type Social } from "@/data/profile";
import { IconArrowUpRight } from "@/components/_chrome/icons";
import { isPlaceholder } from "@/components/_chrome/Placeholder";
import { resumeAvailable } from "@/components/_chrome/ResumeButton";
import { Line } from "@/components/mondrian/Drawn";
import { Columns, Row, SectionFrame } from "@/components/mondrian/SectionFrame";
import { HOVER_FILL, Swatch, type Tone } from "@/components/mondrian/tone";

/**
 * Evaluated once at module load. On a static export that is build time on the
 * server and page load on the client, so the two can disagree across a New
 * Year — hence `suppressHydrationWarning` on the one span that prints it.
 */
const YEAR = new Date().getFullYear();

/** Each way to reach me has its own colour: a small square, and its fill on hover. */
const LINK_TONE: Record<string, Tone> = {
  email: "red",
  github: "blue",
  linkedin: "yellow",
  resume: "black",
};

/** Lets a long address break before the "@" instead of being cut off. */
function Breakable({ value }: { value: string }) {
  const at = value.indexOf("@");
  if (at <= 0) return <>{value}</>;
  return (
    <Fragment>
      {value.slice(0, at)}
      <wbr />
      {value.slice(at)}
    </Fragment>
  );
}

/** The only usable href for a social, or null when it is still a gap. */
function socialHref(social: Social): string | null {
  if (!isPlaceholder(social.href)) return social.href;
  if (social.id === "email" && !isPlaceholder(social.value) && social.value.includes("@")) {
    return `mailto:${social.value}`;
  }
  return null;
}

/** Email, GitHub, LinkedIn, then the résumé: four ways in, one per column. */
const linked = [
  ...["email", "github", "linkedin"]
    .map((id) => socials.find((social) => social.id === id))
    .filter((social): social is Social => social !== undefined)
    .map((social) => ({ social, href: socialHref(social) })),
  ...(resumeAvailable
    ? [{ social: { id: "resume", label: resume.label, value: "resume.pdf", href: resume.href }, href: resume.href }]
    : []),
].filter((entry): entry is { social: Social; href: string } => entry.href !== null);

export function Contact() {
  return (
    <div className="pb-16 md:pb-24">
      <SectionFrame
        id="contact"
        title={contact.heading}
        intro={
          !isPlaceholder(contact.body) ? (
            <p className="max-w-[46ch] text-lg leading-relaxed text-muted">{contact.body}</p>
          ) : null
        }
      >
        <Row label="Reach me">
          <Columns>
            {linked.map(({ social, href }, index) => {
              const isMail = href.startsWith("mailto:");
              const tone = LINK_TONE[social.id] ?? "blue";
              return (
                <div key={social.id} className="relative pt-0.5">
                  <Line at={0.15 + index * 0.1} duration={0.6} className="absolute inset-x-0 top-0 h-0.5" />
                  <a
                    href={href}
                    {...(isMail ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                    className={`group flex h-full min-h-32 flex-col justify-between gap-6 px-4 pt-4 pb-5 transition-colors duration-200 ${HOVER_FILL[tone]}`}
                  >
                    <span className="flex items-center justify-between font-mono text-xs tracking-[0.16em] uppercase">
                      <span className="flex items-center gap-2">
                        <Swatch tone={tone} className="group-hover:bg-current group-focus-visible:bg-current" />
                        {social.label}
                      </span>
                      <IconArrowUpRight className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                    <span className="text-sm font-medium break-words">
                      <Breakable value={social.value} />
                    </span>
                    {isMail ? null : <span className="sr-only">(opens in a new tab)</span>}
                  </a>
                </div>
              );
            })}
          </Columns>
        </Row>
      </SectionFrame>

      <footer className="shell mt-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] tracking-[0.14em] text-faint uppercase">
        <span>
          © <span suppressHydrationWarning>{YEAR}</span> {profile.name} · @{profile.handle}
        </span>
      </footer>
    </div>
  );
}
