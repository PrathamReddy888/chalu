"use client";
import { useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useCartStore } from "@/stores/cart";
import { StatusPill, VegIndicator, ChiliMeter, PressButton } from "@/components/kot";
import { t } from "@/lib/i18n";
import { formatINR } from "@/lib/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Sparkles, Plus, Check, Loader2 } from "lucide-react";
import type { MenuItemView } from "@/hooks/use-menu";

export function MenuItemCard({ item }: { item: MenuItemView }) {
  const { locale } = useLocaleStore();
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  const [subs, setSubs] = useState<{ item: MenuItemView; reason: string }[] | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const name = locale === "hi" ? item.nameHi : item.name;
  const desc = locale === "hi" ? item.descriptionHi : item.description;
  const is86 = !item.available;

  const handleAdd = () => {
    add({
      menuItemId: item.id,
      name: item.name,
      nameHi: item.nameHi,
      price: item.price,
      veg: item.veg as "veg" | "nonveg" | "egg",
      spice: item.spice as 0 | 1 | 2 | 3,
    });
    setAdded(true);
    toast.success(t("toast_added", locale), { description: name });
    setTimeout(() => setAdded(false), 1200);
  };

  const handleSubstitute = async () => {
    setLoadingSubs(true);
    try {
      const data = await api<{ substitutes: { item: MenuItemView; reason: string }[] }>(
        "/api/ai/substitute",
        { method: "POST", body: { dishName: item.name, reason: "out of stock" } },
      );
      setSubs(data.substitutes);
      if (!data.substitutes.length) toast("No live substitute found — ask the staff.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingSubs(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[12px] border border-ink/12 bg-paper transition ${
        is86 ? "opacity-65" : "hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(42,33,25,0.07),0_14px_30px_-12px_rgba(42,33,25,0.22)]"
      } shadow-[0_1px_2px_rgba(42,33,25,0.05),0_8px_22px_-8px_rgba(42,33,25,0.14)]`}
    >
      {/* Status stripe — color-coded, calm */}
      <div className="h-1 w-full" style={{ background: is86 ? "var(--color-chili)" : item.bestseller ? "var(--color-marigold)" : "var(--color-paper-dim)" }} />
      {/* Header strip */}
      <div className="flex items-start justify-between gap-2 border-b border-ink/8 bg-paper-deep/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <VegIndicator isVeg={item.veg as "veg" | "nonveg" | "egg"} />
          <span className="truncate font-mono text-[10px] uppercase tracking-wider text-clay">{item.category}</span>
        </div>
        {item.bestseller && (
          <StatusPill tone="bestseller" size="xs">{t("status_bestseller", locale)}</StatusPill>
        )}
        {is86 && (
          <StatusPill tone="eighty-six" size="xs">{t("status_86", locale)}</StatusPill>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-3">
        <h3 className={`font-display text-lg leading-tight ${is86 ? "line-through" : ""}`}>
          {name}
        </h3>
        <p className="line-clamp-2 text-sm text-ink/70">{desc}</p>
        <div className="mt-2 flex items-center gap-3">
          <ChiliMeter level={item.spice as 0 | 1 | 2 | 3} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-clay">· {item.prepMinutes}m prep</span>
        </div>
      </div>

      {/* Perforation — fine die-cut */}
      <div className="perforation-solid mx-3" aria-hidden="true" />

      {/* Stub */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-clay">₹</span>
          <span className="font-display text-2xl leading-none">{item.price}</span>
        </div>
        {is86 ? (
          <PressButton variant="marigold" size="sm" onClick={handleSubstitute} disabled={loadingSubs}>
            {loadingSubs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t("act_suggest_sub", locale)}
          </PressButton>
        ) : (
          <PressButton variant="chili" size="sm" onClick={handleAdd} className="min-w-[88px]">
            {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {added ? "Added" : t("act_add", locale)}
          </PressButton>
        )}
      </div>

      {/* AI substitute suggestions reveal */}
      {subs && subs.length > 0 && (
        <div className="border-t border-ink/10 bg-marigold/12 p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink">
            <Sparkles className="h-3 w-3" style={{ color: "var(--color-chili)" }} /> {t("label_substitute", locale)}
          </div>
          <div className="flex flex-col gap-2">
            {subs.map(({ item: sub, reason }) => (
              <div key={sub.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-ink/12 bg-paper px-2 py-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <VegIndicator isVeg={sub.veg as "veg" | "nonveg" | "egg"} size={14} />
                    <span className="truncate font-display text-sm font-semibold">{locale === "hi" ? sub.nameHi : sub.name}</span>
                  </div>
                  <p className="truncate text-[11px] text-ink/60">{reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{formatINR(sub.price)}</span>
                  <PressButton
                    variant="curry-leaf"
                    size="sm"
                    onClick={() => {
                      add({
                        menuItemId: sub.id, name: sub.name, nameHi: sub.nameHi,
                        price: sub.price, veg: sub.veg as "veg" | "nonveg" | "egg", spice: sub.spice as 0 | 1 | 2 | 3,
                      });
                      toast.success(t("toast_added", locale), { description: locale === "hi" ? sub.nameHi : sub.name });
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </PressButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
