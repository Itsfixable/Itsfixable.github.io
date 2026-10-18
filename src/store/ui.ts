"use client";

import { create } from "zustand";
import {
  MOTION_STORAGE_KEY,
  type MotionMode,
  resolveInitialMotionMode,
} from "@/lib/motion-mode";

/**
 * The server has no way to know the user's preference, so both the server
 * render and the first client render use this value. `Providers` then corrects
 * it in a layout effect, which runs before the browser paints — so a calm-mode
 * user never actually sees a wild frame, and we never risk a hydration
 * mismatch by rendering two different trees for the same HTML.
 *
 * CSS-level calm does not wait for any of this: the inline script in the root
 * layout stamps <html data-motion> while the HTML is still parsing.
 */
const SSR_MOTION_MODE: MotionMode = "wild";

export type { MotionMode };
export { MOTION_STORAGE_KEY, REDUCED_MOTION_QUERY } from "@/lib/motion-mode";

export type UiState = {
  motionMode: MotionMode;
  /** True once the client has taken over from the server-rendered default. */
  hydrated: boolean;

  setMotionMode: (mode: MotionMode) => void;
  toggleMotionMode: () => void;
  /** Re-reads storage + the OS preference. Called once on mount. */
  syncFromEnvironment: () => void;
};

function persist(mode: MotionMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, mode);
  } catch {
    // Non-fatal: the mode still applies for this session.
  }
}

/** Keeps `<html data-motion>` in step so CSS can react without a re-render. */
function reflectOnDocument(mode: MotionMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = mode;
}

export const useUiStore = create<UiState>((set, get) => ({
  motionMode: SSR_MOTION_MODE,
  hydrated: false,

  setMotionMode: (mode) => {
    persist(mode);
    reflectOnDocument(mode);
    set({ motionMode: mode });
  },

  toggleMotionMode: () => {
    get().setMotionMode(get().motionMode === "wild" ? "calm" : "wild");
  },


  syncFromEnvironment: () => {
    const mode = resolveInitialMotionMode();
    reflectOnDocument(mode);
    set({ motionMode: mode, hydrated: true });
  },
}));

/* ---------------------------------------------------------------------------
 * Selector hooks. Prefer these in components: they subscribe to one slice, so
 * changing one slice never re-renders components that read another.
 * ------------------------------------------------------------------------- */

export const useMotionMode = () => useUiStore((s) => s.motionMode);

/** The one-liner most animations want: `const calm = useIsCalm()`. */
export const useIsCalm = () => useUiStore((s) => s.motionMode === "calm");

export const useToggleMotionMode = () => useUiStore((s) => s.toggleMotionMode);
export const useSetMotionMode = () => useUiStore((s) => s.setMotionMode);
