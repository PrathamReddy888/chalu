"use client";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type Persona } from "@/stores/view";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { PressButton, StatusPill, TicketCard, VegIndicator, LiveQR } from "@/components/kot";
import { t } from "@/lib/i18n";
import { useMenu } from "@/hooks/use-menu";
import { useRestaurant } from "@/hooks/use-restaurant";
import { api } from "@/lib/api-client";
import { Flame, UtensilsCrossed, ChefHat, Crown, ArrowRight, QrCode, Smartphone, MapPin, Users, ConciergeBell, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

interface TableT { id: string; code: string; label: string; seats: number; status: string; section?: string | null }

export function Landing() {
  const { locale } = useLocaleStore();
  const { setView, setPersona, setPendingPersona } = useViewStore();
  const { user } = useAuthStore();
  const { items } = useMenu();
  const { info: restaurant } = useRestaurant();
  const setTable = useCartStore((s) => s.setTable);

  const eightySixed = items.filter((m) => !m.available);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [tables, setTables] = useState<TableT[]>([]);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const loadTables = () => {
    api<{ tables: TableT[] }>("/api/tables")
      .then((d) => { setTables(d.tables); setTablesLoaded(true); })
      .catch(() => setTablesLoaded(true));
  };

  const enterCustomer = () => {
    setPersona("customer");
    setView("menu");
  };
  const enterKitchen = () => {
    if (user?.role === "kitchen" || user?.role === "owner" || user?.role === "staff") {
      setPersona("kitchen"); setView("kitchen");
    } else {
      setPendingPersona("kitchen"); setView("login");
    }
  };
  const enterWaiter = () => {
    if (user?.role === "staff" || user?.role === "owner") {
      setPersona("waiter"); setView("waiter");
    } else {
      setPendingPersona("waiter"); setView("login");
    }
  };
  const enterOwner = () => {
    if (user?.role === "owner") {
      setPersona("owner"); setView("dashboard");
    } else {
      setPendingPersona("owner"); setView("login");
    }
  };

  const pickTable = (tb: TableT) => {
    setTable(tb.id);
    setPersona("customer");
    setView("menu");
    toast.success(locale === "en" ? `Table ${tb.code} selected` : `Table ${tb.code} selected`, {
      description: locale === "en" ? "Happy to have you — here's today's live menu." : "Here's today's live menu.",
    });
  };

  const freeTables = tables.filter((t) => t.status === "empty" || t.status === "cleaning");
  const reservationsEnabled = restaurant?.reservationsEnabled ?? false;

  return (
    <div className="spotlight">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:pt-12">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="eighty-six">{t("label_86_banner", locale)}</StatusPill>
          <span className="font-mono text-xs uppercase tracking-widest text-clay">VibeAthon 6.0</span>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <div className="grid items-stretch gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
            <div className="flex flex-col gap-4 rounded-[12px] border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_var(--color-ink)] sm:flex-row sm:items-center">
              <LiveQR value={origin} size={156} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-display text-base font-bold uppercase tracking-wide">
                  <QrCode className="h-4 w-4" style={{ color: "var(--color-chili)" }} />
                  {locale === "en" ? "Scan to order" : "Scan to order"}
                </div>
                <p className="mt-1.5 max-w-[280px] text-sm text-ink/75">
                  {locale === "en"
                    ? "Point your phone camera here to open Chalu and see today's live menu. No app install."
                    : "Point your phone camera here to open Chalu and see today's live menu. No app install."}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-clay">
                  <Smartphone className="h-3 w-3" /> {locale === "en" ? "or pick a table below" : "or pick a table below"}
                </p>
              </div>
            </div>

            <button
              onClick={enterCustomer}
              className="press flex flex-col items-start justify-center gap-2 rounded-[12px] border-2 border-ink bg-chili p-5 text-left text-white shadow-[4px_4px_0_var(--color-ink)] transition hover:shadow-[5px_5px_0_var(--color-ink)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-white/30 bg-white/10">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold leading-tight">{t("hero_cta_order", locale)}</span>
              <span className="text-xs text-white/80">{locale === "en" ? "Browse today's live menu, order, track your ticket." : "Browse today's live menu, order, track your ticket."}</span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/70">
                <ArrowRight className="h-3 w-3" /> {locale === "en" ? "no login needed" : "no login needed"}
              </span>
            </button>

            <button
              onClick={() => setView("login")}
              className="press flex flex-col items-start justify-center gap-2 rounded-[12px] border-2 border-ink bg-ink p-5 text-left text-paper shadow-[4px_4px_0_var(--color-ink)] transition hover:shadow-[5px_5px_0_var(--color-ink)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[10px] border-2 border-paper/30 bg-paper/10">
                <LogIn className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold leading-tight">{locale === "en" ? "Restaurant access" : "Restaurant access"}</span>
              <span className="text-xs text-paper/70">{locale === "en" ? "Kitchen, waiter, or owner - log in to your shift." : "Kitchen, waiter, or owner - log in to your shift."}</span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-paper/50">
                <LogIn className="h-3 w-3" /> {locale === "en" ? "staff & owners" : "staff & owners"}
              </span>
            </button>
          </div>

          {reservationsEnabled ? (
            <div className="w-full rounded-[12px] border-2 border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">{locale === "en" ? "Pick a table" : "Pick a table"}</h2>
                {!tablesLoaded && <span className="font-mono text-[10px] uppercase tracking-wider text-clay">...</span>}
                {tablesLoaded && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-clay">
                    {freeTables.length} {locale === "en" ? "free" : "free"}
                  </span>
                )}
              </div>
              {!tablesLoaded ? (
                <button onClick={loadTables} className="press inline-flex h-9 items-center gap-1.5 rounded-[8px] border-2 border-ink bg-paper-deep px-3 font-display text-xs font-semibold uppercase tracking-wide">
                  <MapPin className="h-3.5 w-3.5" /> {locale === "en" ? "Show free tables" : "Show free tables"}
                </button>
              ) : freeTables.length === 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-wider text-clay">
                  {locale === "en" ? "All tables are taken right now." : "All tables are taken right now."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {freeTables.map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => pickTable(tb)}
                      onMouseEnter={() => setSelectedTable(tb.id)}
                      onMouseLeave={() => setSelectedTable(null)}
                      className={cn(
                        "press flex flex-col items-start gap-0.5 rounded-[8px] border-2 px-2.5 py-2 text-left",
                        selectedTable === tb.id ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper hover:border-ink/50 hover:bg-paper-deep",
                      )}
                    >
                      <span className="font-display text-base font-bold leading-none">{tb.code}</span>
                      <span className={cn("font-mono text-[9px] uppercase tracking-wider", selectedTable === tb.id ? "text-paper/70" : "text-clay")}>
                        {tb.label}
                      </span>
                      <span className={cn("inline-flex items-center gap-0.5 font-mono text-[9px]", selectedTable === tb.id ? "text-paper/70" : "text-clay")}>
                        <Users className="h-2.5 w-2.5" /> {tb.seats}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-clay">
                {locale === "en" ? "Tap a free table to start your order there." : "Tap a free table to start your order there."}
              </p>
            </div>
          ) : (
            <PressButton variant="chili" size="lg" onClick={enterCustomer}>
              {t("hero_cta_order", locale)} <ArrowRight className="h-4 w-4" />
            </PressButton>
          )}
        </div>

        {eightySixed.length > 0 && (
          <div className="mt-8">
            <TicketCard className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-paper-deep/70 px-4 py-2.5 rounded-t-[10px]">
                <h3 className="font-display font-bold text-sm">{locale === "en" ? "Off the pass right now" : "Off the pass right now"}</h3>
                <StatusPill tone="eighty-six" size="xs">{eightySixed.length} items</StatusPill>
              </div>
              <div className="flex flex-wrap gap-3 p-4">
                {eightySixed.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-[10px] border-2 border-ink bg-paper-deep/50 px-3 py-2 opacity-70">
                    <VegIndicator isVeg={m.veg as "veg" | "nonveg" | "egg"} />
                    <div className="min-w-0">
                      <span className="font-display text-sm font-semibold line-through">{locale === "hi" ? m.nameHi : m.name}</span>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-chili">86'd</div>
                    </div>
                  </div>
                ))}
              </div>
            </TicketCard>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Pillar n="01" tone="chili" title={locale === "en" ? "Live 86'd sync" : "Live 86'd sync"}
            body={locale === "en" ? "Kitchen marks an ingredient out and it greys out on every customer screen in under a second, with an AI-suggested substitute offered in its place." : "Kitchen marks an ingredient out and it greys out on every customer screen in under a second, with an AI-suggested substitute offered in its place."} />
          <Pillar n="02" tone="marigold" title={locale === "en" ? "KOT-first pipeline" : "KOT-first pipeline"}
            body={locale === "en" ? "Every order becomes a Kitchen Order Ticket moving NEW to COOKING to READY to SERVED, visible to both kitchen and customer." : "Every order becomes a Kitchen Order Ticket moving NEW to COOKING to READY to SERVED, visible to both kitchen and customer."} />
          <Pillar n="03" tone="curry-leaf" title={locale === "en" ? "Honest wait times" : "Honest wait times"}
            body={locale === "en" ? "Live, honest wait estimates that reflect real table turns and Chalu works to shorten them: breach-sorted tickets, load-balanced staff, alerts before a table breaches its wait." : "Live, honest wait estimates that reflect real table turns and Chalu works to shorten them: breach-sorted tickets, load-balanced staff, alerts before a table breaches its wait."} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[14px] border-2 border-ink bg-paper p-6 shadow-[5px_5px_0_var(--color-ink)] sm:p-10">
          <h1 className="max-w-3xl font-display text-3xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {t("hero_title_1", locale)}
            <span className="mt-2 block" style={{ color: "var(--color-chili)" }}>{t("hero_title_2", locale)}</span>
          </h1>
          <p className="mt-5 max-w-2xl font-body text-base text-ink/80 sm:text-lg">
            {locale === "en"
              ? "Chalu is the live-operations layer for a single restaurant. The moment the kitchen marks a dish 86'd, it greys out on every customer's screen and an AI suggests a substitute on the spot."
              : "Chalu is the live-operations layer for a single restaurant. The moment the kitchen marks a dish 86'd, it greys out on every customer's screen and an AI suggests a substitute on the spot."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PressButton variant="chili" size="lg" onClick={enterCustomer}>
              {t("hero_cta_order", locale)} <ArrowRight className="h-4 w-4" />
            </PressButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5">
          <h2 className="font-display text-2xl sm:text-3xl">{locale === "en" ? "Run the floor" : "Run the floor"}</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-clay">
            {locale === "en" ? "three roles, three apps - pick yours" : "three roles, three apps - pick yours"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AppEntry persona="kitchen" icon={ChefHat}
            title={locale === "en" ? "I'm kitchen staff" : "I'm kitchen staff"}
            desc={locale === "en" ? "Live KOT queue + 86'd control. Login required." : "Live KOT queue + 86'd control. Login required."}
            cta={t("hero_cta_kitchen", locale)} onClick={enterKitchen} accent="marigold" />
          <AppEntry persona="waiter" icon={ConciergeBell}
            title={locale === "en" ? "I'm a waiter" : "I'm a waiter"}
            desc={locale === "en" ? "My tables, live status, ready alerts. Login required." : "My tables, live status, ready alerts. Login required."}
            cta={locale === "en" ? "My floor" : "My floor"} onClick={enterWaiter} accent="chili" />
          <AppEntry persona="owner" icon={Crown}
            title={locale === "en" ? "I run this place" : "I run this place"}
            desc={locale === "en" ? "Today at a glance: sales, tables, stock. Login required." : "Today at a glance: sales, tables, stock. Login required."}
            cta={t("hero_cta_admin", locale)} onClick={enterOwner} accent="curry-leaf" />
        </div>
      </section>
    </div>
  );
}

function AppEntry({
  persona, icon: Icon, title, desc, cta, onClick, accent,
}: {
  persona: Persona; icon: typeof Flame; title: string; desc: string; cta: string; onClick: () => void; accent: "chili" | "marigold" | "curry-leaf";
}) {
  const accentBg = accent === "chili" ? "var(--color-chili)" : accent === "marigold" ? "var(--color-marigold)" : "var(--color-curry-leaf)";
  const accentText = accent === "marigold" ? "var(--color-ink)" : "white";
  return (
    <div className="group relative flex flex-col gap-3 rounded-[12px] border-2 border-ink bg-paper p-5 shadow-[4px_4px_0_var(--color-ink)] transition hover:shadow-[5px_5px_0_var(--color-ink)]">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-2 border-ink" style={{ background: accentBg, color: accentText }}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-clay">{persona}</span>
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-ink/70">{desc}</p>
      </div>
      <button
        onClick={onClick}
        className="press mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] border-2 border-ink px-3 font-display text-xs font-semibold uppercase tracking-wide"
        style={{ background: accentBg, color: accentText }}
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Pillar({ n, tone, title, body }: { n: string; tone: "chili" | "marigold" | "curry-leaf"; title: string; body: string }) {
  const toneText = tone === "chili" ? "text-chili" : tone === "marigold" ? "text-ink" : "text-curry-leaf";
  const dot = tone === "chili" ? "bg-chili" : tone === "marigold" ? "bg-marigold" : "bg-curry-leaf";
  return (
    <TicketCard weight="soft" className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className={cn("font-display text-3xl", toneText)}>{n}</span>
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-sm text-ink/75">{body}</p>
    </TicketCard>
  );
}