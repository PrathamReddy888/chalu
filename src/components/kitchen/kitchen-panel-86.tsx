"use client";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { TicketCard, TicketHeader, StampBadge, VegIndicator, PressButton } from "@/components/kot";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api-client";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { Ban, RotateCcw, Loader2, Sparkles, ChevronDown } from "lucide-react";

interface MenuItemLite {
  id: string; name: string; nameHi: string; category: string; veg: string; spice: number; price: number; available: boolean; bestseller: boolean;
}

export function KitchenPanel86() {
  const { locale } = useLocaleStore();
  const [items, setItems] = useState<MenuItemLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    try {
      const data = await api<{ items: MenuItemLite[] }>("/api/menu");
      setItems(data.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // live: reflect 86 changes from any source (including this panel via the API echo)
  useRealtimeEvent<{ menuItemId: string; available: boolean }>("menu:availability", (p) => {
    setItems((prev) => prev.map((m) => (m.id === p.menuItemId ? { ...m, available: p.available } : m)));
  });

  const toggle = async (id: string, available: boolean) => {
    setBusy(id);
    try {
      await api(`/api/menu/${id}/availability`, { method: "PATCH", body: { available } });
      toast.success(available ? t("toast_restocked", locale) : t("toast_86", locale));
    } catch (e) {
      toast.error((e as Error).message);
      load();
    } finally {
      setBusy(null);
    }
  };

  const eightySixed = items.filter((m) => !m.available);
  const live = items.filter((m) => m.available);

  if (loading) {
    return (
      <TicketCard className="p-4">
        <Loader2 className="h-5 w-5 animate-spin text-steel" />
      </TicketCard>
    );
  }

  return (
    <TicketCard className="sticky top-20 overflow-hidden">
      <TicketHeader
        title={locale === "en" ? "86 control" : "86 कंट्रोल"}
        id={`${eightySixed.length} off`}
        right={<StampBadge tone="chili" rotate={-2} size="xs">{t("status_86", locale)}</StampBadge>}
      />

      {/* 86'd section */}
      {eightySixed.length > 0 && (
        <div className="border-b-[2px] border-ink bg-chili/10 p-2">
          <p className="px-1 py-1 font-mono text-[10px] uppercase tracking-wider text-chili">
            {locale === "en" ? "off the pass — synced to all screens" : "बंद — सभी स्क्रीन पर सिंक"}
          </p>
          <ul className="flex flex-col gap-1.5">
            {eightySixed.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 border-[2px] border-ink bg-chalk px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <VegIndicator isVeg={m.veg as "veg" | "nonveg" | "egg"} size={12} />
                  <span className="truncate font-headline text-xs font-semibold line-through">{locale === "hi" ? m.nameHi : m.name}</span>
                </div>
                <PressButton variant="curry" size="sm" onClick={() => toggle(m.id, true)} disabled={busy === m.id}>
                  {busy === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  {t("act_restore", locale)}
                </PressButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live toggle list */}
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel">
          {locale === "en" ? "tap to 86 a dish" : "कोई व्यंजन बंद करने के लिए टैप करें"}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <ul className="max-h-[50vh] divide-y-[1px] divide-ink/15 overflow-y-auto">
          {live.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-chalk-deep">
              <div className="flex min-w-0 items-center gap-1.5">
                <VegIndicator isVeg={m.veg as "veg" | "nonveg" | "egg"} size={12} />
                <div className="min-w-0">
                  <p className="truncate font-headline text-xs font-semibold">{locale === "hi" ? m.nameHi : m.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-steel">{m.category} · ₹{m.price}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(m.id, false)}
                disabled={busy === m.id}
                className="press grid h-7 w-7 place-items-center border-[2px] border-ink bg-chalk text-chili hover:bg-chili hover:text-chalk"
                aria-label={`86 ${m.name}`}
                title={t("act_86", locale)}
              >
                {busy === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t-[2px] border-ink bg-chalk-deep p-2">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-steel">
          <Sparkles className="h-3 w-3 text-chili" />
          {locale === "en" ? "86'd dishes auto-offer an AI substitute on customer screens" : "बंद व्यंजन ग्राहक स्क्रीन पर AI विकल्प दिखाते हैं"}
        </p>
      </div>
    </TicketCard>
  );
}
