"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (l) => set({ locale: l }),
      toggle: () => set({ locale: get().locale === "en" ? "hi" : "en" }),
    }),
    { name: "chalu-locale" },
  ),
);
