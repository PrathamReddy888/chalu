"use client";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type Persona } from "@/stores/view";
import { t } from "@/lib/i18n";
import { Flame } from "lucide-react";

export function Footer({ persona }: { persona: Persona | null }) {
  const { locale } = useLocaleStore();
  const { setView } = useViewStore();

  // Only show links relevant to the current persona — no duplication with the topbar.
  const links: { label: string; view: () => void }[] = [];
  if (persona === "customer") {
    links.push({ label: t("nav_menu", locale), view: () => setView("menu") });
    links.push({ label: t("nav_orders", locale), view: () => setView("myorder") });
  }
  // kitchen/owner have their nav in the topbar; footer stays minimal.

  return (
    <footer className="mt-auto border-t border-ink/10 bg-paper-deep/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[6px]" style={{ background: "var(--color-chili)", color: "white" }}>
            <Flame className="h-3 w-3" />
          </span>
          <div>
            <p className="font-display text-sm leading-none">{t("brand", locale)}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-clay">{t("tagline", locale)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-clay">
          {links.map((l, i) => (
            <button key={i} onClick={l.view} className="hover:text-ink">
              {l.label}
            </button>
          ))}
          <span className="text-clay/50">·</span>
          <span>VibeAthon 6.0</span>
        </div>
      </div>
    </footer>
  );
}
