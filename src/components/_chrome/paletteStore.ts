"use client";

import { create } from "zustand";

/**
 * `Nav` and `CommandPalette` are siblings in `page.tsx` with no shared parent
 * state, and the shared UI store is owned by another part of the app. A tiny
 * local store keeps the open flag in one place without touching either.
 */
type PaletteStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const usePaletteStore = create<PaletteStore>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));

export const useIsPaletteOpen = () => usePaletteStore((s) => s.open);
export const useSetPaletteOpen = () => usePaletteStore((s) => s.setOpen);
export const useTogglePalette = () => usePaletteStore((s) => s.toggle);
