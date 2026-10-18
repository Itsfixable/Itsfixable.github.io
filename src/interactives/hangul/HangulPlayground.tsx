"use client";

import { useId, useState } from "react";
import { HangulBuilder } from "./HangulBuilder";
import { TracingPad } from "./tracing/TracingPad";

type Tab = "trace" | "build";

const TABS: { id: Tab; label: string }[] = [
  { id: "trace", label: "Trace a letter" },
  { id: "build", label: "Build a syllable" },
];

/**
 * Korean Quest's two interactives, shown open on the page under the project
 * list: tracing (KQ's stroke data and grader) and the syllable builder.
 */
export function HangulPlayground() {
  const tabsId = useId();
  const [tab, setTab] = useState<Tab>("trace");

  return (
    <div className="card p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Try it · Korean Quest</p>
          <h4 className="mt-2 text-2xl font-semibold tracking-tight text-text">Learn some Hangul</h4>
        </div>
        <div role="tablist" aria-label="Activity" className="flex gap-1 border-b border-line">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              id={`${tabsId}-${id}-tab`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={tab === id ? `${tabsId}-${id}-panel` : undefined}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === id ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`${tabsId}-${tab}-panel`} aria-labelledby={`${tabsId}-${tab}-tab`} className="mt-6">
        {tab === "trace" ? <TracingPad /> : <HangulBuilder />}
      </div>
    </div>
  );
}
