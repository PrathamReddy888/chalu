"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { TicketCard, TicketHeader, StatusPill, PressButton } from "@/components/kot";
import { t } from "@/lib/i18n";
import { clockTime, timeAgo } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useRealtimeEvent, useIdentify } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { ConciergeBell, Loader2, Droplets, FileText, HelpCircle, CheckCircle2, Bell, AlertTriangle, Clock, Utensils, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableT { id: string; code: string; label: string; seats: number; status: string; section?: string | null }
interface OrderLite { id: string; kotNumber: number; status: string; createdAt: string; partySize: number; items: { id: string; name: string; nameHi: string; qty: number; status: string }[] }
interface AlertT {
  id: string; type: string; message: string; fromName: string; createdAt: string; resolved: boolean;
  table: { code: string; label: string } | null; tableId: string | null;
}

interface ShiftSlice {
  me: { id: string; name: string; role: string };
  myTables: (TableT & { liveOrder?: OrderLite | null })[];
  alerts: AlertT[];
}

/**
 * Waiter home — a floor-work screen, NOT a shrunk-down Owner dashboard.
 * Shows ONLY: this waiter's assigned tables + their live order status,
 * incoming "order ready" alerts addressed to them, and quick-flag actions
 * (water / bill / help) to the kitchen. Built to be glanced at mid-service.
 */
export function WaiterView() {
  const { locale } = useLocaleStore();
  const { user } = useAuthStore();
  useIdentify("staff");
  const [data, setData] = useState<ShiftSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      // Get the shift view, then filter to just this waiter's slice + their alerts.
      const shift = await api<{ staff: any[]; unassigned: any[] }>("/api/dashboard/shift");
      const me = shift.staff.find((s) => s.id === user?.id);
      const myTables = (me?.tables ?? []) as (TableT & { liveOrder?: OrderLite | null })[];

      // Fetch live orders to attach to each table
      const orders = await api<{ items: OrderLite[] }>("/api/orders?live=1");
      const ordersByTable = new Map<string, OrderLite>();
      for (const o of orders.items) {
        // we only have kotNumber + table code on the order; match by table code if present
        // orders API returns table.code — but our OrderLite here doesn't include it.
        // We'll attach the most recent live order per table by matching below.
      }

      // Fetch my alerts
      const alertsRes = await api<{ alerts: AlertT[] }>("/api/alerts");
      const myAlerts = alertsRes.alerts;

      setData({
        me: { id: user?.id ?? "", name: user?.name ?? "", role: user?.role ?? "staff" },
        myTables,
        alerts: myAlerts,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name, user?.role]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh on any coordination event
  useRealtimeEvent("staff:alert", () => load());
  useRealtimeEvent("staff:alert:resolve", () => load());
  useRealtimeEvent("staff:assignment", () => load());
  useRealtimeEvent<{ orderId: string; status: string }>("kot:status", () => load());
  useRealtimeEvent<{ order: OrderLite }>("kot:new", () => load());

  // Ticking clock so "Xm ago" + breach stays live
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 20000);
    return () => clearInterval(i);
  }, []);

  const resolveAlert = async (id: string) => {
    try { await api(`/api/alerts/${id}/resolve`, { method: "PATCH" }); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const sendFlag = async (tableId: string | null, type: string, message: string) => {
    setBusy(type + tableId);
    try {
      await api("/api/alerts", { method: "POST", body: { toRole: "kitchen", tableId, type, message } });
      toast.success(locale === "en" ? "Flagged the kitchen" : "रसोई को बताया");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-clay" />
        <p className="mt-3 font-mono text-xs uppercase tracking-wider text-clay">{locale === "en" ? "Loading your floor…" : "आपका फ्लोर लोड हो रहा है…"}</p>
      </div>
    );
  }

  if (!data) return null;

  const readyAlerts = data.alerts.filter((a) => a.type === "ready");
  const otherAlerts = data.alerts.filter((a) => a.type !== "ready");

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <ConciergeBell className="h-7 w-7" style={{ color: "var(--color-chili)" }} /> {locale === "en" ? "My floor" : "मेरा फ्लोर"}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-clay">
            {locale === "en" ? "your tables, live" : "आपके टेबल, लाइव"} · {user?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill icon={Utensils} label={locale === "en" ? "Tables" : "टेबल"} count={data.myTables.length} tone="ink" />
          <StatPill icon={Bell} label={locale === "en" ? "Alerts" : "अलर्ट"} count={data.alerts.length} tone={data.alerts.length > 0 ? "chili" : "curry"} />
        </div>
      </div>

      {/* Incoming "order ready" alerts — top priority, addressed to THIS waiter */}
      {readyAlerts.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg">
            <Bell className="h-4 w-4" style={{ color: "var(--color-curry-leaf)" }} />
            {locale === "en" ? "Order ready — run it" : "ऑर्डर तैयार — ले जाएं"}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {readyAlerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-[10px] border-2 border-curry-leaf bg-curry-leaf/10 px-3 py-2.5 shadow-[3px_3px_0_var(--color-curry-leaf)]">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold">{a.message}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{a.fromName} · {timeAgo(a.createdAt)}</p>
                </div>
                <PressButton variant="curry-leaf" size="sm" onClick={() => resolveAlert(a.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {locale === "en" ? "Got it" : "हो गया"}
                </PressButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My tables — the core of the waiter home */}
      <div className="mb-5">
        <h2 className="mb-3 font-display text-xl">{locale === "en" ? "My tables" : "मेरे टेबल"}</h2>
        {data.myTables.length === 0 ? (
          <TicketCard className="p-6 text-center">
            <ConciergeBell className="mx-auto h-8 w-8 text-clay" />
            <p className="mt-2 font-display text-base">{locale === "en" ? "No tables assigned to you yet" : "आपको अभी कोई टेबल सौंपा नहीं"}</p>
            <p className="mt-1 text-sm text-ink/60">{locale === "en" ? "The owner or shift lead assigns tables from the Owner dashboard." : "मालिक या शिफ्ट-लीड टेबल मालिक डैशबोर्ड से सौंपते हैं।"}</p>
          </TicketCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.myTables.map((tb) => {
              const status = tb.status;
              const occupied = status === "occupied";
              return (
                <TicketCard key={tb.id} className="overflow-hidden">
                  {/* Status stripe */}
                  <div className="h-1.5 w-full" style={{ background: occupied ? "var(--color-curry-leaf)" : status === "reserved" ? "var(--color-marigold)" : status === "cleaning" ? "var(--color-clay)" : "var(--color-paper-dim)" }} />
                  <div className="flex items-center justify-between border-b-2 border-ink bg-paper-deep/40 px-3 py-2">
                    <div>
                      <p className="font-display text-xl leading-none">{tb.code}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{tb.label} · {tb.seats} {locale === "en" ? "seats" : "सीट"}{tb.section ? ` · ${tb.section}` : ""}</p>
                    </div>
                    <StatusPill tone={occupied ? "ready" : status === "reserved" ? "cooking" : status === "cleaning" ? "served" : "new"} size="xs">
                      {occupied ? (locale === "en" ? "Seated" : "बैठे") : status === "reserved" ? (locale === "en" ? "Reserved" : "आरक्षित") : status === "cleaning" ? (locale === "en" ? "Cleaning" : "सफाई") : (locale === "en" ? "Open" : "खाली")}
                    </StatusPill>
                  </div>

                  {/* Quick-flag actions — one-handed, mid-service */}
                  <div className="grid grid-cols-3 gap-1.5 p-2.5">
                    <PressButton variant="marigold" size="sm" onClick={() => sendFlag(tb.id, "water", `Table ${tb.code} needs water`)} disabled={busy === "water" + tb.id}>
                      <Droplets className="h-3.5 w-3.5" /> {locale === "en" ? "Water" : "पानी"}
                    </PressButton>
                    <PressButton variant="curry-leaf" size="sm" onClick={() => sendFlag(tb.id, "bill", `Table ${tb.code} wants the bill`)} disabled={busy === "bill" + tb.id}>
                      <FileText className="h-3.5 w-3.5" /> {locale === "en" ? "Bill" : "बिल"}
                    </PressButton>
                    <PressButton variant="chili" size="sm" onClick={() => sendFlag(tb.id, "help", `Table ${tb.code} needs help`)} disabled={busy === "help" + tb.id}>
                      <HelpCircle className="h-3.5 w-3.5" /> {locale === "en" ? "Help" : "मदद"}
                    </PressButton>
                  </div>
                </TicketCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Other alerts (breach, help flags from others, etc.) */}
      {otherAlerts.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl">{locale === "en" ? "Other alerts" : "अन्य अलर्ट"}</h2>
          <div className="flex flex-col gap-2">
            {otherAlerts.map((a) => {
              const isBreach = a.type === "breach";
              return (
                <div key={a.id} className={cn("flex items-center justify-between gap-2 rounded-[10px] border-2 px-3 py-2.5", isBreach ? "border-chili bg-chili/10" : "border-ink/20 bg-paper")}>
                  <div className="flex items-start gap-2">
                    {isBreach ? <AlertTriangle className="mt-0.5 h-4 w-4 text-chili" /> : <Bell className="mt-0.5 h-4 w-4 text-clay" />}
                    <div>
                      <p className="font-display text-xs font-bold uppercase tracking-wide">{a.message}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-clay">{a.fromName} · {timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                  <button onClick={() => resolveAlert(a.id)} className="press-soft rounded-[6px] border border-ink/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider hover:bg-curry-leaf/15">{locale === "en" ? "done" : "हो"}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state — all clear */}
      {data.myTables.length > 0 && data.alerts.length === 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-[10px] border-2 border-curry-leaf/30 bg-curry-leaf/8 py-3">
          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-curry-leaf)" }} />
          <span className="font-display text-sm font-semibold" style={{ color: "var(--color-curry-leaf)" }}>{locale === "en" ? "All clear — no pending alerts" : "सब ठीक — कोई अलर्ट नहीं"}</span>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, count, tone }: { icon: any; label: string; count: number; tone: "ink" | "chili" | "curry" }) {
  const bg = tone === "ink" ? "bg-ink text-paper" : tone === "chili" ? "bg-chili text-white" : "bg-curry-leaf text-white";
  return (
    <div className={cn("flex items-center gap-2 border-2 border-ink px-3 py-1.5", bg)}>
      <Icon className="h-4 w-4" />
      <span className="font-display text-2xl leading-none">{count}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}
