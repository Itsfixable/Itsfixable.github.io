"use client";

import { contact, profile, socials, type Social } from "@/data/profile";
import { IconArrowUpRight } from "@/components/_chrome/icons";
import { isPlaceholder } from "@/components/_chrome/Placeholder";
import { Cell, Grid, type Tone } from "@/components/mondrian/Grid";

/**
 * Evaluated once at module load. On a static export that is build time on the
 * server and page load on the client, so the two can disagree across a New
 * Year — hence `suppressHydrationWarning` on the one span that prints it.
 */
const YEAR = new Date().getFullYear();

/** Each way to reach me is its own primary block. */
const LINK_TONE: Record<string, Tone> = { email: "red", github: "blue", linkedin: "yellow" };

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
    <section id="contact" className="shell pb-16 md:pb-24">
      <Grid joined className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <Cell className="p-5 sm:col-span-3 sm:p-8 lg:col-span-1 lg:p-10">
          <p className="eyebrow">Contact</p>
          <h2 className="mt-4 text-headline font-semibold">{contact.heading}</h2>
          {!isPlaceholder(contact.body) ? (
            <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-muted">{contact.body}</p>
          ) : null}
        </Cell>

        {linked.map(({ social, href }, index) => {
          const isMail = href.startsWith("mailto:");
          return (
            <Cell key={social.id} tone={LINK_TONE[social.id] ?? "paper"} order={index}>
              <a
                href={href}
                {...(isMail ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                className="group flex h-full min-h-28 flex-col justify-between gap-6 p-5 sm:p-6"
              >
                <span className="flex items-center justify-between font-mono text-xs tracking-[0.16em] uppercase">
                  {social.label}
                  <IconArrowUpRight className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 calm:group-hover:translate-0" />
                </span>
                <span className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                  {social.value}
                </span>
                {isMail ? null : <span className="sr-only">(opens in a new tab)</span>}
              </a>
            </Cell>
          );
        })}

        <Cell tone="black" order={3} className="px-5 py-4 sm:col-span-3 sm:px-8 lg:col-span-4">
          <footer className="font-mono text-[11px] tracking-[0.14em] uppercase">
            © <span suppressHydrationWarning>{YEAR}</span> {profile.name} · @{profile.handle}
          </footer>
        </Cell>
      </Grid>
    </section>
  );
}
