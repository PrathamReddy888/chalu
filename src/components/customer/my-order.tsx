"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore } from "@/stores/view";
import { useAuthStore } from "@/stores/auth";
import { TicketCard, TicketHeader, StampBadge, VegIndicator, ChiliMeter, PressButton, Perforation } from "@/components/kot";
import { t } from "@/lib/i18n";
import { computeGst, formatINR, clockTime, timeAgo } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { Loader2, Receipt, ChefHat, BellRing, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";
import { SplitBill } from "./split-bill";

interface OrderLine { id: string; name: string; nameHi: string; price: number; qty: number; veg: string; spice: number; status: string; notes?: string | null }
interface Order {
  id: string; kotNumber: number; status: string; tableId: string | null; customerName: string | null;
  partySize: number; subtotal: number; cgst: number; sgst: number; total: number; paid: boolean; paymentMode: string | null;
  createdAt: string; cookingAt: string | null; readyAt: string | null; servedAt: string | null;
  items: OrderLine[]; table: { code: string; label: string } | null;
}

const STATUS_FLOW = ["NEW", "COOKING", "READY", "SERVED", "CLOSED"];

export function MyOrder() {
  const { locale } = useLocaleStore();
  const { setView } = useViewStore();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Order[] }>("/api/orders");
      setOrders(data.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // live updates
  useRealtimeEvent<{ orderId: string; status: string; kotNumber: number }>("kot:status", (p) => {
    setOrders((prev) => prev.map((o) => (o.id === p.orderId ? { ...o, status: p.status } : o)));
    const stamp: Record<string, string> = {
      COOKING: t("toast_marked_cooking", locale),
      READY: t("toast_marked_ready", locale),
      SERVED: t("toast_marked_served", locale),
    };
    if (stamp[p.status]) toast(stamp[p.status], { description: `KOT #${p.kotNumber}` });
  });
  useRealtimeEvent<{ order: Order }>("kot:new", (p) => {
    setOrders((prev) => (prev.find((o) => o.id === p.order.id) ? prev : [p.order, ...prev]));
  });

  const pay = async (id: string) => {
    try {
      await api(`/api/orders/${id}/bill`, { method: "PATCH", body: { paid: true, paymentMode: "upi" } });
      toast.success(locale === "en" ? "Bill paid — thank you!" : "बिल चुकता — धन्यवाद!");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-steel" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <TicketCard className="p-8 text-center">
          <Receipt className="mx-auto h-10 w-10 text-steel" />
          <h2 className="mt-3 font-display text-2xl">{locale === "en" ? "No tickets yet" : "अभी कोई टिकट नहीं"}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("label_empty_menu", locale)}</p>
          <PressButton variant="ink" className="mt-5" onClick={() => setView("menu")}>
            {t("nav_menu", locale)} <ArrowRight className="h-4 w-4" />
          </PressButton>
        </TicketCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{t("nav_orders", locale)}</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-steel">
            {locale === "en" ? "your tickets, updated live" : "आपके टिकट, लाइव अपडेट"}
          </p>
        </div>
        <PressButton variant="chalk" size="sm" onClick={() => setView("menu")}>{t("nav_menu", locale)}</PressButton>
      </div>

      <div className="flex flex-col gap-5">
        {orders.map((o) => (
          <OrderTicket key={o.id} order={o} onPay={() => pay(o.id)} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function OrderTicket({ order, onPay, locale }: { order: Order; onPay: () => void; locale: "en" | "hi" }) {
  const stepIndex = STATUS_FLOW.indexOf(order.status);
  const stamp = statusStamp(order.status, locale);
  return (
    <TicketCard className="overflow-hidden">
      <TicketHeader
        title={`${t("label_ticket", locale)} #${order.kotNumber}`}
        id={`${order.table?.code ?? "walk-in"} · ${clockTime(order.createdAt)}`}
        right={<StampBadge tone={stamp.tone} rotate={stamp.rotate} size="sm">{stamp.label}</StampBadge>}
      />

      {/* Progress strip */}
      <div className="flex items-stretch border-b-[2px] border-ink">
        {["NEW", "COOKING", "READY", "SERVED"].map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          const icon = i === 0 ? BellRing : i === 1 ? ChefHat : i === 2 ? CheckCircle2 : Receipt;
          const Icon = icon;
          return (
            <div key={s} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-center ${
              active ? "bg-turmeric" : done ? "bg-curry/20" : "bg-chalk"
            } ${i < 3 ? "border-r-[2px] border-ink" : ""}`}>
              <Icon className={`h-4 w-4 ${active ? "text-ink" : done ? "text-curry" : "text-steel"}`} />
              <span className={`font-mono text-[9px] uppercase tracking-wider ${active ? "text-ink font-bold" : done ? "text-curry" : "text-steel"}`}>
                {statusLabel(s, locale)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Items */}
      <ul className="divide-y-[1px] divide-ink/15">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <VegIndicator isVeg={it.veg as "veg" | "nonveg" | "egg"} size={14} />
              <div className="min-w-0">
                <p className="truncate font-headline text-sm font-semibold">{locale === "hi" ? it.nameHi : it.name}</p>
                <div className="flex items-center gap-2">
                  <ChiliMeter level={it.spice as 0 | 1 | 2 | 3} size={11} />
                  <span className="font-mono text-[10px] text-steel">×{it.qty}</span>
                </div>
              </div>
            </div>
            <span className="font-mono text-sm font-bold">{formatINR(it.price * it.qty)}</span>
          </li>
        ))}
      </ul>

      <Perforation />

      {/* Bill */}
      <div className="p-3">
        <BillRow label={t("bill_subtotal", locale)} value={formatINR(order.subtotal)} />
        <BillRow label={t("bill_cgst", locale)} value={formatINR(order.cgst)} muted />
        <BillRow label={t("bill_sgst", locale)} value={formatINR(order.sgst)} muted />
        <div className="my-1.5 border-t-[2px] border-dashed border-ink/30" />
        <BillRow label={t("bill_grand_total", locale)} value={formatINR(order.total)} bold />
        <SplitBill subtotal={order.subtotal} cgst={order.cgst} sgst={order.sgst} total={order.total} />
        {order.paid ? (
          <div className="mt-3 flex items-center justify-center gap-2 border-[2px] border-curry bg-curry/15 py-2">
            <CheckCircle2 className="h-4 w-4 text-curry" />
            <span className="font-headline text-sm font-bold uppercase text-curry">
              {locale === "en" ? `Paid via ${order.paymentMode ?? "UPI"}` : `${order.paymentMode ?? "UPI"} से भुगतान हो गया`}
            </span>
          </div>
        ) : (
          <PressButton variant="curry" size="lg" className="mt-3 w-full" onClick={onPay}>
            <CreditCard className="h-4 w-4" /> {t("act_pay", locale)} · {formatINR(order.total)}
          </PressButton>
        )}
      </div>

      <div className="border-t-[2px] border-ink bg-chalk-deep px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-steel">
        {locale === "en" ? "ordered" : "ऑर्डर किया"} {timeAgo(order.createdAt)}
        {order.cookingAt && ` · ${locale === "en" ? "cooking" : "बनना शुरू"} ${timeAgo(order.cookingAt)}`}
        {order.readyAt && ` · ${locale === "en" ? "ready" : "तैयार"} ${timeAgo(order.readyAt)}`}
      </div>
    </TicketCard>
  );
}

function BillRow({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${bold ? "font-display text-lg" : "text-sm"} ${muted ? "text-steel" : "text-ink"}`}>
      <span>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}

function statusLabel(s: string, locale: "en" | "hi") {
  const map: Record<string, { en: string; hi: string }> = {
    NEW: { en: "New", hi: "नया" },
    COOKING: { en: "Cooking", hi: "बन रहा" },
    READY: { en: "Ready", hi: "तैयार" },
    SERVED: { en: "Served", hi: "परोसा" },
    CLOSED: { en: "Closed", hi: "बंद" },
  };
  return map[s]?.[locale] ?? s;
}

function statusStamp(s: string, locale: "en" | "hi") {
  const map: Record<string, { tone: "ink" | "chili" | "turmeric" | "curry" | "steel"; rotate: number; label: string }> = {
    NEW: { tone: "ink", rotate: -2, label: statusLabel("NEW", locale) },
    COOKING: { tone: "turmeric", rotate: 2, label: statusLabel("COOKING", locale) },
    READY: { tone: "curry", rotate: -3, label: statusLabel("READY", locale) },
    SERVED: { tone: "steel", rotate: 1, label: statusLabel("SERVED", locale) },
    CLOSED: { tone: "steel", rotate: 0, label: statusLabel("CLOSED", locale) },
  };
  return map[s] ?? { tone: "steel", rotate: 0, label: s };
}
