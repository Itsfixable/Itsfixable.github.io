"use client";

import type { SVGProps } from "react";

/**
 * Hand-written inline SVGs — no icon package is installed, and none should be.
 * Everything is 16x16 on a 1.5px stroke so icons sit on the same optical line
 * as 11-13px mono labels.
 */

type IconProps = SVGProps<SVGSVGElement>;

const strokeIcon = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export function IconSearch(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.25 10.25 14 14" />
    </svg>
  );
}

/**
 * Two states for one control: a travelling wave for wild motion, a flat line
 * for calm. The shape change is the whole point — the label says the word, the
 * icon says the feeling.
 */
export function IconMotion({ calm, ...props }: IconProps & { calm: boolean }) {
  return (
    <svg {...strokeIcon} {...props}>
      {calm ? (
        <>
          <path d="M1.75 8h12.5" />
          <path d="M4.25 11.25h7.5" opacity="0.45" />
          <path d="M4.25 4.75h7.5" opacity="0.45" />
        </>
      ) : (
        <>
          <path d="M1.75 8c1.04-3.6 2.08-3.6 3.12 0s2.09 3.6 3.13 0 2.08-3.6 3.12 0 2.09 3.6 3.13 0" />
          <path d="M1.75 12.5c1.04-1.8 2.08-1.8 3.12 0" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M9 1.75H4.25a1.5 1.5 0 0 0-1.5 1.5v9.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V6z" />
      <path d="M9 1.75V6h4.25" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M4.75 11.25 11.25 4.75" />
      <path d="M5.75 4.75h5.5v5.5" />
    </svg>
  );
}

export function IconEnter(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M13.25 3.75v4a1.5 1.5 0 0 1-1.5 1.5H3.25" />
      <path d="M6 6.5 3.25 9.25 6 12" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
