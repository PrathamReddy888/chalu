"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { TicketCard, TicketHeader, StatusPill, VegIndicator, ChiliMeter, PressButton, Perforation } from "@/components/kot";
import { t } from "@/lib/i18n";
import { clockTime, timeAgo } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useRealtimeEvent, useIdentify } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { Flame, ChefHat, CheckCircle2, BellRing, Loader2, Ban, RotateCcw, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { KitchenPanel86 } from "./kitchen-panel-86";
import { KitchenPrepList } from "./kitchen-prep-list";

interface OrderLine { id: string; name: string; nameHi: string; price: number; qty: number; veg: string; spice: number; status: string; notes?: string | null }
interface Order {
  id: string; kotNumber: number; status: string; tableId: string | null; customerName: string | null;
  partySize: number; subtotal: number; createdAt: string; cookingAt: string | null; readyAt: string | null;
  items: OrderLine[]; table: { code: string } | null;
}

export function KitchenView() {
  const { locale } = useLocaleStore();
  const { user } = useAuthStore();
  useIdentify(user?.role ?? "kitchen");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0); // forces re-render on realtime updates + clock tick

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Order[] }>("/api/orders?live=1");
      setOrders(data.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ticking clock so breach indicators stay live without a reload
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(i);
  }, []);

  // realtime: new ticket prints in
  useRealtimeEvent<{ order: Order }>("kot:new", (p) => {
    setOrders((prev) => (prev.find((o) => o.id === p.order.id) ? prev : [p.order, ...prev]));
    setTick((x) => x + 1);
    toast(`${locale === "en" ? "New ticket" : "नया टिकट"} #${p.order.kotNumber}`, { description: `${p.order.items.length} items · ${p.order.table?.code ?? "walk-in"}` });
  });
  // status change
  useRealtimeEvent<{ orderId: string; status: string; kotNumber: number }>("kot:status", (p) => {
    setOrders((prev) => prev.map((o) => (o.id === p.orderId ? { ...o, status: p.status } : o)));
    setTick((x) => x + 1);
  });

  const advance = async (id: string) => {
    try {
      await api(`/api/orders/${id}/status`, { method: "PATCH" });
      // optimistic; realtime will confirm
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  // === Active wait-time reduction (§10) ===
  // Target = max item prepMinutes across the ticket (the longest dish drives ready time).
  // Breach = elapsed minutes since order exceeded target. At-risk = within 3 min of target.
  // NEW tickets are sorted so the most-breached surface first — work the risk, not the queue order.
  const breachFor = (o: Order) => {
    const target = Math.max(...o.items.map((it) => 10), ...o.items.map((it) => (it as any).prepMinutes ?? 12)) || 12;
    const elapsed = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
    return { target, elapsed, over: Math.max(0, elapsed - target), near: elapsed >= target - 3 && elapsed < target };
  };

  const newOrders = orders
    .filter((o) => o.status === "NEW")
    .sort((a, b) => breachFor(b).over - breachFor(a).over || breachFor(b).elapsed - breachFor(a).elapsed);
  const cooking = orders
    .filter((o) => o.status === "COOKING")
    .sort((a, b) => breachFor(b).over - breachFor(a).over);
  const ready = orders.filter((o) => o.status === "READY" || o.status === "SERVED");

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-steel" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <ChefHat className="h-7 w-7 text-chili" /> {t("nav_kitchen", locale)}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-steel">
            {locale === "en" ? "the pass — tickets print in live" : "द पास — टिकट लाइव छपते हैं"} · {user?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill tone="ink" label={t("status_new", locale)} count={newOrders.length} icon={BellRing} />
          <StatPill tone="turmeric" label={t("status_cooking", locale)} count={cooking.length} icon={Flame} />
          <StatPill tone="curry" label={t("status_ready", locale)} count={ready.length} icon={CheckCircle2} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Three-column KOT board */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KotColumn title={t("status_new", locale)} tone="ink" orders={newOrders} onAdvance={advance} locale={locale} actionLabel={t("act_mark_cooking", locale)} actionIcon={Flame} actionTone="turmeric" breachFor={breachFor} />
          <KotColumn title={t("status_cooking", locale)} tone="turmeric" orders={cooking} onAdvance={advance} locale={locale} actionLabel={t("act_mark_ready", locale)} actionIcon={CheckCircle2} actionTone="curry" breachFor={breachFor} />
          <KotColumn title={t("status_ready", locale)} tone="curry" orders={ready} onAdvance={advance} locale={locale} actionLabel={t("act_mark_served", locale)} actionIcon={CheckCircle2} actionTone="ink" breachFor={breachFor} />
        </div>

        {/* 86 control panel */}
        <KitchenPanel86 />
      </div>

      {/* AI prep list for tomorrow — at the bottom of the Chef home (§1) */}
      <KitchenPrepList />
    </div>
  );
}

function StatPill({ tone, label, count, icon: Icon }: { tone: "ink" | "turmeric" | "curry"; label: string; count: number; icon: React.ComponentType<{ className?: string }> }) {
  const bg = tone === "ink" ? "bg-ink text-chalk" : tone === "turmeric" ? "bg-turmeric text-ink" : "bg-curry text-chalk";
  return (
    <div className={`flex items-center gap-2 border-[2.5px] border-ink ${bg} px-3 py-1.5`}>
      <Icon className="h-4 w-4" />
      <span className="font-display text-2xl leading-none">{count}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

function KotColumn({
  title, tone, orders, onAdvance, locale, actionLabel, actionIcon: ActionIcon, actionTone, breachFor,
}: {
  title: string; tone: "ink" | "turmeric" | "curry";
  orders: Order[]; onAdvance: (id: string) => void; locale: "en" | "hi";
  actionLabel: string; actionIcon: React.ComponentType<{ className?: string }>; actionTone: "ink" | "turmeric" | "curry" | "chili";
  breachFor: (o: Order) => { target: number; elapsed: number; over: number; near: boolean };
}) {
  const accentColor = tone === "ink" ? "var(--color-ink)" : tone === "turmeric" ? "var(--color-marigold)" : "var(--color-curry-leaf)";
  const atRisk = orders.filter((o) => breachFor(o).over > 0 || breachFor(o).near).length;
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentColor }} />
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        {atRisk > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-chili bg-chili/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-chili">
            <AlertTriangle className="h-2.5 w-2.5" /> {atRisk} {locale === "en" ? "at risk" : "जोखिम"}
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-clay">{orders.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {orders.map((o) => (
            <KotTicket key={o.id} order={o} onAdvance={onAdvance} locale={locale} actionLabel={actionLabel} actionIcon={ActionIcon} actionTone={actionTone} breach={breachFor(o)} />
          ))}
        </AnimatePresence>
        {orders.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-ink/15 p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "empty station" : "खाली स्टेशन"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KotTicket({
  order, onAdvance, locale, actionLabel, actionIcon: ActionIcon, actionTone, breach,
}: {
  order: Order; onAdvance: (id: string) => void; locale: "en" | "hi";
  actionLabel: string; actionIcon: React.ComponentType<{ className?: string }>; actionTone: "ink" | "turmeric" | "curry" | "chili";
  breach: { target: number; elapsed: number; over: number; near: boolean };
}) {
  const isOver = breach.over > 0;
  const isNear = breach.near;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`overflow-hidden rounded-[12px] border-2 border-ink bg-paper ${isOver ? "shadow-[4px_4px_0_var(--color-chili)]" : "shadow-[4px_4px_0_var(--color-ink)]"}`}
    >
      {/* Color-coded status stripe — turns chili when overdue */}
      <div className="h-1.5 w-full" style={{ background: isOver ? "var(--color-chili)" : order.status === "NEW" ? "var(--color-ink)" : order.status === "COOKING" ? "var(--color-marigold)" : order.status === "READY" ? "var(--color-curry-leaf)" : "var(--color-clay)" }} />
      <div className="flex items-center justify-between border-b-2 border-ink bg-paper-deep/40 px-3 py-2">
        <div>
          <p className="font-display text-2xl leading-none">#{order.kotNumber}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-clay">
            {order.table?.code ?? "walk-in"} · {clockTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill tone={order.status === "NEW" ? "new" : order.status === "COOKING" ? "cooking" : order.status === "READY" ? "ready" : "served"} size="sm">
            {order.status === "NEW" ? t("status_new", locale) : order.status === "COOKING" ? t("status_cooking", locale) : order.status === "READY" ? t("status_ready", locale) : t("status_served", locale)}
          </StatusPill>
          {isOver ? (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-chili bg-chili px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
              <AlertTriangle className="h-2.5 w-2.5" /> {breach.over}m {locale === "en" ? "over" : "अधिक"}
            </span>
          ) : isNear ? (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-marigold bg-marigold/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
              <Clock className="h-2.5 w-2.5" /> {locale === "en" ? "at risk" : "जोखिम"}
            </span>
          ) : null}
        </div>
      </div>

      {/* items */}
      <ul className="divide-y divide-ink/8">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-2 px-3 py-1.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 font-display text-lg leading-none">{it.qty}×</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <VegIndicator isVeg={it.veg as "veg" | "nonveg" | "egg"} size={12} />
                  <span className="font-headline text-sm font-semibold">{locale === "hi" ? it.nameHi : it.name}</span>
                </div>
                <ChiliMeter level={it.spice as 0 | 1 | 2 | 3} size={10} />
                {it.notes && <p className="font-mono text-[10px] text-chili">⚠ {it.notes}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Perforation className="mx-3 my-1" />

      {/* action */}
      <div className="p-2.5">
        <PressButton variant={actionTone} size="sm" className="w-full" onClick={() => onAdvance(order.id)}>
          <ActionIcon className="h-3.5 w-3.5" /> {actionLabel}
        </PressButton>
        <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-wider text-clay">
          {breach.elapsed}/{breach.target}m · {order.partySize} {locale === "en" ? "guests" : "मेहमान"}
        </p>
      </div>
    </motion.div>
  );
}
