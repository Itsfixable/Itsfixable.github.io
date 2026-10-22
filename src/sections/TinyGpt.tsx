"use client";

import dynamic from "next/dynamic";
import { tinyGpt } from "@/data/profile";
import { sectionMeta } from "@/lib/sections";
import { Body, Bullets, OutLink, Stack } from "@/components/mondrian/Content";
import { Columns, Fact, Pair, Row, SectionFrame, TryIt } from "@/components/mondrian/SectionFrame";
import { InteractiveLoading, LazyMount, usePreload } from "@/interactives/LazyMount";
import card from "@/interactives/tiny-gpt/model-card.json";

const META = sectionMeta("gpt");

/** Measured heights of the playground at each breakpoint. */
const PLAYGROUND_RESERVE = "min-h-[56.6875rem] sm:min-h-[52rem] lg:min-h-[33rem] xl:min-h-[30.1875rem]";

const loadPlayground = () =>
  import("@/interactives/tiny-gpt/TinyGptPlayground").then((module) => module.TinyGptPlayground);
const TinyGptPlayground = dynamic(loadPlayground, {
  ssr: false,
  loading: () => <InteractiveLoading reserve={PLAYGROUND_RESERVE} label="Loading the model" />,
});

const kb = Math.round(card.bytes / 1000);

/**
 * Koji's nanoGPT, in the same rows as the other projects: try it first, then
 * details, what it is, stack. The playground runs the trained model in the
 * browser.
 */
export function TinyGpt() {
  usePreload(loadPlayground);

  return (
    <SectionFrame
      id="gpt"
      railLabel="Project"
      title={tinyGpt.name}
      intro={
        <div className="flex flex-col gap-6">
          <p className="max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{tinyGpt.tagline}</p>
          <div className="flex max-w-full flex-wrap gap-3">
            <OutLink href={tinyGpt.lecture} tone={META.tone ?? "red"} detail="Andrej Karpathy">
              The lecture it follows
            </OutLink>
          </div>
        </div>
      }
    >
      <Row
        label="Try it"
        framed
        aside={
          <TryIt title="Make it write">
            Give it the start of a line, or pick a character, and it writes one letter at a time. Each
            letter is drawn from the odds it shows. Low temperature plays it safe; high temperature gets
            strange. It only knows {card.vocab_size} characters and has never seen a word list, so
            everything it spells, it learned from Shakespeare.
          </TryIt>
        }
      >
        <LazyMount reserve={PLAYGROUND_RESERVE} label="Make it write">
          <TinyGptPlayground />
        </LazyMount>
      </Row>

      <Row label="Details">
        <Columns>
          <Fact label="Year" index={0}>
            {tinyGpt.year}
          </Fact>
          <Fact label="Size" index={1}>
            {card.parameters.toLocaleString("en-US")} parameters, {kb} KB
          </Fact>
          <Fact label="Shape" index={2}>
            {card.n_layer} layers × {card.n_head} heads, {card.block_size}-character context
          </Fact>
          <Fact label="Training" index={3}>
            {card.steps.toLocaleString("en-US")} steps, validation loss {card.valLoss}
          </Fact>
        </Columns>
      </Row>

      <Row label="What it is">
        <Pair>
          <Body>{tinyGpt.blurb}</Body>
          <Bullets items={tinyGpt.highlights} />
        </Pair>
      </Row>

      <Row label="Stack">
        <Stack items={tinyGpt.stack} />
      </Row>
    </SectionFrame>
  );
}
