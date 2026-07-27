"use client";
import { create } from "zustand";

export interface CartLine {
  menuItemId: string;
  name: string;
  nameHi: string;
  price: number;
  veg: "veg" | "nonveg" | "egg";
  spice: 0 | 1 | 2 | 3;
  qty: number;
  notes?: string;
}

interface CartState {
  tableId: string | null;
  lines: CartLine[];
  setTable: (id: string | null) => void;
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  setNotes: (id: string, notes: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  tableId: null,
  lines: [],
  setTable: (id) => set({ tableId: id }),
  add: (item, qty = 1) =>
    set((s) => {
      const existing = s.lines.find((l) => l.menuItemId === item.menuItemId);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.menuItemId === item.menuItemId ? { ...l, qty: l.qty + qty } : l,
          ),
        };
      }
      return { lines: [...s.lines, { ...item, qty }] };
    }),
  inc: (id) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.menuItemId === id ? { ...l, qty: l.qty + 1 } : l)),
    })),
  dec: (id) =>
    set((s) => ({
      lines: s.lines
        .map((l) => (l.menuItemId === id ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    })),
  remove: (id) =>
    set((s) => ({ lines: s.lines.filter((l) => l.menuItemId !== id) })),
  setNotes: (id, notes) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.menuItemId === id ? { ...l, notes } : l)),
    })),
  clear: () => set({ lines: [] }),
  count: () => get().lines.reduce((n, l) => n + l.qty, 0),
  subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.qty, 0),
}));
