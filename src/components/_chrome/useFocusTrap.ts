"use client";

import { useCallback, useRef, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps Tab / Shift+Tab inside a container while it is active.
 *
 * Returns the ref to put on the container and a keydown handler to spread onto
 * it. No global listener and no focus stealing — it only reacts to Tab, so
 * every other key still reaches the component underneath.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean): {
  containerRef: RefObject<T | null>;
  handleTabKeyDown: (event: KeyboardEvent) => void;
} {
  const containerRef = useRef<T | null>(null);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active || event.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;

      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // getClientRects() is the reliable visibility test here: offsetParent
        // is null for anything inside a `fixed` ancestor.
        (node) => node.getClientRects().length > 0,
      );

      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && root.contains(current);

      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [active],
  );

  return { containerRef, handleTabKeyDown };
}
