"use client";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useCartStore } from "@/stores/cart";
import { TicketCard, VegIndicator, ChiliMeter, PressButton, StatusPill } from "@/components/kot";
import { t } from "@/lib/i18n";
import { formatINR } from "@/lib/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Sparkles, Plus, Check, Loader2 } from "lucide-react";
import type { MenuContextItem } from "@/lib/ai";

interface Rec {
  item: MenuContextItem;
  reason: string;
}

/**
 * AI recommendations section for the customer menu (§11).
 * Short (max 6), availability-aware, reflects customer signal + popularity + time-of-day.
 * Falls back to today's bestsellers for a logged-out visitor — never shows nothing.
 * Same card language as the rest of the menu (veg dot, spice, price, add).
 */
export function Recommendations({ show }: { show: boolean }) {
  const { locale } = useLocaleStore();
  const add = useCartStore((s) => s.add);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    api<{ recommendations: Rec[] }>("/api/ai/recommend")
      .then((d) => { if (!cancelled) setRecs(d.recommendations); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [show]);

  if (!show || (!loading && recs.length === 0)) return null;

  const handleAdd = (item: MenuContextItem) => {
    add({
      menuItemId: item.id, name: item.name, nameHi: item.nameHi,
      price: item.price, veg: item.veg as "veg" | "nonveg" | "egg", spice: item.spice as 0 | 1 | 2 | 3,
    });
    setAdded(item.id);
    toast.success(t("toast_added", locale), { description: locale === "hi" ? item.nameHi : item.name });
    setTimeout(() => setAdded((a) => (a === item.id ? null : a)), 1200);
  };

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-[8px] border-2 border-ink" style={{ background: "var(--color-marigold)", color: "var(--color-ink)" }}>
          <Sparkles className="h-4 w-4" />
        </span>
        <h2 className="font-display text-2xl tracking-tight">{locale === "en" ? "Recommended for you" : "आपके लिए सुझाव"}</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "AI pick · live availability" : "AI · लाइव उपलब्धता"}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-[12px] border-2 border-ink/12 bg-paper p-4">
          <Loader2 className="h-4 w-4 animate-spin text-clay" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Picking from today's live menu…" : "आज के मेनू से चुन रहे हैं…"}</span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map(({ item, reason }) => (
            <div key={item.id} className="flex flex-col overflow-hidden rounded-[12px] border-2 border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]">
              <div className="h-1 w-full" style={{ background: "var(--color-marigold)" }} />
              <div className="flex items-start justify-between gap-2 border-b border-ink/8 bg-paper-deep/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <VegIndicator isVeg={item.veg as "veg" | "nonveg" | "egg"} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{item.category}</span>
                </div>
                {item.bestseller && <StatusPill tone="bestseller" size="xs">{t("status_bestseller", locale)}</StatusPill>}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
                <h3 className="font-display text-base leading-tight">{locale === "hi" ? item.nameHi : item.name}</h3>
                <p className="line-clamp-2 text-xs text-ink/70">{reason}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <ChiliMeter level={item.spice as 0 | 1 | 2 | 3} />
                  <span className="font-mono text-[10px] text-clay">· {item.price}₹</span>
                </div>
              </div>
              <div className="perforation-solid mx-3" aria-hidden="true" />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="font-mono text-lg font-bold">{formatINR(item.price)}</span>
                <PressButton variant="chili" size="sm" onClick={() => handleAdd(item)} className="min-w-[80px]">
                  {added === item.id ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {added === item.id ? (locale === "en" ? "Added" : "जोड़ा") : t("act_add", locale)}
                </PressButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
