"use client";

import type { Project } from "@/data/profile";
import { hostOf, OutLink } from "@/components/mondrian/Content";
import type { Tone } from "@/components/mondrian/Grid";

/**
 * The header of a project section: the one-line pitch, then the ways to see
 * it. The demo fills with the section's colour; the source fills black.
 */
export function ProjectIntro({ project, tone }: { project: Project; tone: Exclude<Tone, "paper"> }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{project.tagline}</p>
      {project.demo || project.repo ? (
        <div className="flex max-w-full flex-wrap gap-3">
          {project.demo ? (
            <OutLink href={project.demo} tone={tone} detail={hostOf(project.demo)}>
              Live demo
            </OutLink>
          ) : null}
          {project.repo ? (
            <OutLink href={project.repo} tone="black">
              Source
            </OutLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
