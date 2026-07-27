"use client";
import { useMemo, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore } from "@/stores/view";
import { useCartStore } from "@/stores/cart";
import { useMenu } from "@/hooks/use-menu";
import { MenuItemCard } from "./menu-item-card";
import { CartTray } from "./cart-tray";
import { Recommendations } from "./recommendations";
import { StampBadge, PressButton } from "@/components/kot";
import { t } from "@/lib/i18n";
import { Loader2, Search } from "lucide-react";

type CatFilter = "all" | "starters" | "mains" | "breads" | "rice" | "desserts" | "beverages";
type VegFilter = "all" | "veg" | "nonveg";

export function MenuView() {
  const { locale } = useLocaleStore();
  const { setView } = useViewStore();
  const { items, loading, error } = useMenu();
  const [cat, setCat] = useState<CatFilter>("all");
  const [veg, setVeg] = useState<VegFilter>("all");
  const [q, setQ] = useState("");

  const catLabel: Record<CatFilter, string> = {
    all: t("cat_all", locale),
    starters: t("cat_starters", locale),
    mains: t("cat_mains", locale),
    breads: t("cat_breads", locale),
    rice: t("cat_rice", locale),
    desserts: t("cat_desserts", locale),
    beverages: t("cat_beverages", locale),
  };

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (veg !== "all" && m.veg !== veg) return false;
      if (q && !`${m.name} ${m.nameHi} ${m.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, cat, veg, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const m of filtered) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const availableCount = items.filter((m) => m.available).length;
  const eightyCount = items.length - availableCount;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-steel" />
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-steel">Pulling today's live menu…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <StampBadge tone="chili" rotate={-2} size="md">error</StampBadge>
        <p className="mt-3 text-sm text-ink/70">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{t("nav_menu", locale)}</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-steel">
            {availableCount} live · {eightyCount} 86'd · {locale === "en" ? "synced in real time" : "रियल टाइम सिंक"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StampBadge tone="curry" rotate={-2} size="sm">● live</StampBadge>
          <PressButton variant="chalk" size="sm" onClick={() => setView("myorder")}>
            {t("nav_orders", locale)}
          </PressButton>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 border-[2.5px] border-ink bg-chalk p-3 shadow-[3px_3px_0_var(--color-ink)]">
        <div className="flex items-center gap-2 border-[2px] border-ink bg-chalk px-2 py-1.5">
          <Search className="h-4 w-4 text-steel" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={locale === "en" ? "Search paneer, biryani, chai…" : "पनीर, बिरयानी, चाय खोजें…"}
            className="w-full bg-transparent font-body text-sm outline-none placeholder:text-steel"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(catLabel) as CatFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`press h-8 border-[2px] px-2.5 font-headline text-xs font-semibold uppercase tracking-wide ${
                cat === c ? "border-ink bg-ink text-chalk" : "border-ink bg-chalk text-ink hover:bg-chalk-deep"
              }`}
            >
              {catLabel[c]}
            </button>
          ))}
          <span className="mx-1 hidden w-px bg-ink/20 sm:inline-block" />
          {(["all", "veg", "nonveg"] as VegFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setVeg(v)}
              className={`press h-8 border-[2px] px-2.5 font-headline text-xs font-semibold uppercase tracking-wide ${
                veg === v ? "border-ink bg-curry text-chalk" : "border-ink bg-chalk text-ink hover:bg-chalk-deep"
              }`}
            >
              {v === "all" ? (locale === "en" ? "all" : "सभी") : v === "veg" ? t("status_veg", locale) : t("status_nonveg", locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid + cart */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          {/* AI recommendations — only when no filter/search is active so it doesn't compete with filtered results */}
          <Recommendations show={cat === "all" && veg === "all" && !q} />
          {grouped.length === 0 && (
            <div className="border-[2.5px] border-ink bg-chalk p-8 text-center shadow-[3px_3px_0_var(--color-ink)]">
              <p className="font-headline text-lg">{locale === "en" ? "No dishes match that filter." : "इस फ़िल्टर से कोई व्यंजन नहीं मिला।"}</p>
              <p className="mt-1 text-sm text-ink/60">{locale === "en" ? "Try clearing the search or switching category." : "सर्च साफ करें या कैटेगरी बदलें।"}</p>
            </div>
          )}
          {grouped.map(([category, list]) => (
            <section key={category}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-2xl uppercase tracking-wide">{catLabel[category as CatFilter]}</h2>
                <span className="h-[2px] flex-1 bg-ink/20" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-steel">{list.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((m) => (
                  <MenuItemCard key={m.id} item={m} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Desktop cart */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <CartTray />
          </div>
        </div>
      </div>

      {/* Mobile cart bar */}
      <MobileCartBar />
    </div>
  );
}

function MobileCartBar() {
  const { locale } = useLocaleStore();
  const { setView } = useViewStore();
  const count = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t-[2.5px] border-ink bg-ink text-chalk lg:hidden">
      <button onClick={() => setView("myorder")} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-headline text-sm uppercase tracking-wide">
          {count} {locale === "en" ? "items in order" : "आइटम ऑर्डर में"}
        </span>
        <span className="font-mono text-base font-bold">₹{subtotal}</span>
      </button>
    </div>
  );
}
