"use client";

import { motion } from "framer-motion";
import { contact, profile, resume, socials, type Social } from "@/data/profile";
import { useReveal } from "@/lib/motion";
import { IconArrowUpRight } from "@/components/_chrome/icons";
import { isPlaceholder, PlaceholderChip } from "@/components/_chrome/Placeholder";
import {
  ResumeButton,
  resumeAvailable,
  resumeUnavailableReason,
} from "@/components/_chrome/ResumeButton";

/**
 * Evaluated once at module load. On a static export that is build time on the
 * server and page load on the client, so the two can disagree across a New
 * Year — hence `suppressHydrationWarning` on the one span that prints it.
 */
const YEAR = new Date().getFullYear();

/** The only usable href for a social, or null when it is still a gap. */
function socialHref(social: Social): string | null {
  if (!isPlaceholder(social.href)) return social.href;
  if (social.id === "email" && !isPlaceholder(social.value) && social.value.includes("@")) {
    return `mailto:${social.value}`;
  }
  return null;
}

export function Contact() {
  const headingReveal = useReveal();
  const linksReveal = useReveal({ index: 1 });
  const resumeReveal = useReveal({ index: 2 });
  const footerReveal = useReveal({ index: 3, amount: 0.1 });

  return (
    <section id="contact" className="relative">
      <hr className="hairline" />

      <div className="shell section-y">
        <motion.div {...headingReveal} className="max-w-3xl">
          <p className="eyebrow">Contact</p>
          <h2 className="mt-5 text-headline font-semibold text-text">{contact.heading}</h2>

          {isPlaceholder(contact.body) ? (
            <div className="mt-6 flex flex-col items-start gap-2">
              <PlaceholderChip note="contact.body" />
              <p className="text-sm text-faint">
                The closing paragraph has not been written yet. It is left visible on purpose —
                this is a prototype, and an empty space would hide the gap.
              </p>
            </div>
          ) : (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{contact.body}</p>
          )}
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          {/* ------------------------------------------------------- socials */}
          <motion.div {...linksReveal} className="min-w-0">
            <h3 className="eyebrow">Elsewhere</h3>

            <ul className="mt-4 border-t border-line">
              {socials.map((social) => {
                const href = socialHref(social);
                const valueKnown = !isPlaceholder(social.value);
                const isMail = href?.startsWith("mailto:") ?? false;

                return (
                  <li key={social.id} className="border-b border-line">
                    {href ? (
                      <a
                        href={href}
                        {...(isMail
                          ? {}
                          : { target: "_blank", rel: "noreferrer noopener" })}
                        className="group flex min-w-0 items-center justify-between gap-4 py-4 transition-colors hover:text-accent"
                      >
                        <span className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-faint transition-colors group-hover:text-muted">
                          {social.label}
                        </span>
                        <span className="flex min-w-0 items-center gap-2 text-sm text-text transition-colors group-hover:text-accent">
                          {valueKnown ? (
                            <span className="truncate">{social.value}</span>
                          ) : (
                            <PlaceholderChip note="handle" />
                          )}
                          <IconArrowUpRight className="shrink-0 opacity-60" />
                        </span>
                      </a>
                    ) : (
                      <div className="flex min-w-0 items-center justify-between gap-4 py-4">
                        <span className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-faint">
                          {social.label}
                        </span>
                        <PlaceholderChip note={`${social.id} link`} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-xs leading-relaxed text-faint">
              Links shown as{" "}
              <span className="font-mono">[placeholder]</span> have no destination yet, so they
              are rendered as gaps instead of dead links.
            </p>
          </motion.div>

          {/* -------------------------------------------------------- résumé */}
          <motion.div {...resumeReveal} className="card min-w-0 p-6 sm:p-8">
            <h3 className="eyebrow">{resume.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {resumeAvailable
                ? "One page, the same projects as above, with the numbers attached."
                : "One page, the same projects as above. Not uploaded yet — the button stays disabled rather than pointing at nothing."}
            </p>

            <ResumeButton tone="solid" size="md" className="mt-6" />

            {resumeAvailable ? null : (
              <p className="mt-3 text-xs leading-relaxed text-faint">{resumeUnavailableReason}</p>
            )}
          </motion.div>
        </div>

        {/* --------------------------------------------------------- footer */}
        <motion.footer
          {...footerReveal}
          className="mt-20 flex flex-col gap-2 border-t border-line pt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            © <span suppressHydrationWarning>{YEAR}</span> {profile.name} · @{profile.handle}
          </p>
          <p className="normal-case tracking-normal">
            Prototype — content marked [placeholder] is not final.
          </p>
        </motion.footer>
      </div>
    </section>
  );
}
