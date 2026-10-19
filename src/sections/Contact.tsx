"use client";

import { contact, profile, socials, type Social } from "@/data/profile";
import { IconArrowUpRight } from "@/components/_chrome/icons";
import { isPlaceholder } from "@/components/_chrome/Placeholder";
import { Cell, Swatch, type Tone } from "@/components/mondrian/Grid";
import { Row, SectionFrame } from "@/components/mondrian/SectionFrame";

/**
 * Evaluated once at module load. On a static export that is build time on the
 * server and page load on the client, so the two can disagree across a New
 * Year — hence `suppressHydrationWarning` on the one span that prints it.
 */
const YEAR = new Date().getFullYear();

/** Each way to reach me has its own colour: a small square, and its fill on hover. */
const LINK_TONE: Record<string, Exclude<Tone, "paper" | "black">> = {
  email: "red",
  github: "blue",
  linkedin: "yellow",
};

const HOVER_FILL = {
  red: "hover:bg-m-red hover:text-white focus-visible:bg-m-red focus-visible:text-white",
  blue: "hover:bg-m-blue hover:text-white focus-visible:bg-m-blue focus-visible:text-white",
  yellow: "hover:bg-m-yellow focus-visible:bg-m-yellow",
} as const;

/** The only usable href for a social, or null when it is still a gap. */
function socialHref(social: Social): string | null {
  if (!isPlaceholder(social.href)) return social.href;
  if (social.id === "email" && !isPlaceholder(social.value) && social.value.includes("@")) {
    return `mailto:${social.value}`;
  }
  return null;
}

const linked = socials
  .map((social) => ({ social, href: socialHref(social) }))
  .filter((entry): entry is { social: Social; href: string } => entry.href !== null);

export function Contact() {
  return (
    <div className="pb-16 md:pb-24">
      <SectionFrame
        id="contact"
        entrance="rise"
        title={contact.heading}
        intro={
          !isPlaceholder(contact.body) ? (
            <p className="max-w-[46ch] text-lg leading-relaxed text-muted">{contact.body}</p>
          ) : null
        }
      >
        <Row label="Reach me" flush>
          <div className="mondrian-grid h-full grid-cols-1 border-0 sm:grid-cols-3">
            {linked.map(({ social, href }) => {
              const isMail = href.startsWith("mailto:");
              const tone = LINK_TONE[social.id] ?? "blue";
              return (
                <Cell key={social.id}>
                  <a
                    href={href}
                    {...(isMail ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                    className={`group flex h-full min-h-28 flex-col justify-between gap-6 p-5 transition-colors duration-200 sm:p-6 ${HOVER_FILL[tone]}`}
                  >
                    <span className="flex items-center justify-between font-mono text-xs tracking-[0.16em] uppercase">
                      <span className="flex items-center gap-2">
                        <Swatch tone={tone} className="group-hover:bg-current group-focus-visible:bg-current" />
                        {social.label}
                      </span>
                      <IconArrowUpRight className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                    <span className="truncate text-sm font-medium">{social.value}</span>
                    {isMail ? null : <span className="sr-only">(opens in a new tab)</span>}
                  </a>
                </Cell>
              );
            })}
          </div>
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
