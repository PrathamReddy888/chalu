"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type DashTab } from "@/stores/view";
import { TicketCard, TicketHeader, StampBadge, StatusPill, VegIndicator, PressButton, Perforation, LiveQR } from "@/components/kot";
import { t } from "@/lib/i18n";
import { formatINR, clockTime, timeAgo, computeGst } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { Loader2, Ban, RotateCcw, TrendingUp, Clock, Users, Receipt, Sparkles, Crown, ChefHat, AlertTriangle, ArrowRight, Boxes, BarChart3, CalendarClock, QrCode, Trash2, Plus, Bell, Droplets, HelpCircle, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

/* ---------- shared types ---------- */
interface Order {
  id: string; kotNumber: number; status: string; tableId: string | null; customerName: string | null;
  partySize: number; subtotal: number; cgst: number; sgst: number; total: number; paid: boolean;
  createdAt: string; items: { id: string; name: string; nameHi: string; price: number; qty: number; veg: string; spice: number; status: string }[];
  table: { code: string } | null;
}
interface TableT { id: string; code: string; label: string; seats: number; status: string; section?: string | null }
interface IngredientT { id: string; name: string; nameHi: string; stockLevel: number; lowThreshold: number; available: boolean; unit: string; dishes: { menuItem: { id: string; name: string; available: boolean } }[] }

/* ---------- OWNER HOME: at-a-glance snapshot ---------- */
export function OwnerHome() {
  const { locale } = useLocaleStore();
  const { setDashTab } = useViewStore();
  const [sales, setSales] = useState<{ today: { revenue: number; orders: number; guests: number } } | null>(null);
  const [tables, setTables] = useState<TableT[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, tb, od] = await Promise.all([
        api<{ today: { revenue: number; orders: number; guests: number } }>("/api/dashboard/sales"),
        api<{ tables: TableT[] }>("/api/tables"),
        api<{ items: Order[] }>("/api/orders?live=1"),
      ]);
      setSales(s); setTables(tb.tables); setOrders(od.items);
      // low-stock count from inventory
      try {
        const inv = await api<{ items: IngredientT[] }>("/api/inventory");
        setLowStock(inv.items.filter((i) => i.stockLevel <= i.lowThreshold || !i.available).length);
      } catch { /* non-fatal */ }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeEvent<{ orderId: string; status: string }>("kot:status", () => load());
  useRealtimeEvent<{ order: Order }>("kot:new", () => load());

  if (loading || !sales) return <Loading />;

  const occupied = tables.filter((t) => t.status === "occupied").length;
  const open = tables.filter((t) => t.status === "empty").length;
  const activeTickets = orders.length;
  const urgent = orders.filter((o) => o.status === "NEW").length;

  return (
    <div>
      {/* Top: today's KPIs — the three numbers an owner asks every shift */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Kpi icon={Receipt} label={locale === "en" ? "Today's revenue" : "आज का राजस्व"} value={formatINR(sales.today.revenue)} tone="chili" />
        <Kpi icon={Clock} label={locale === "en" ? "Active tickets" : "सक्रिय टिकट"} value={String(activeTickets)} tone="marigold" sub={urgent ? `${urgent} ${locale === "en" ? "new, waiting" : "नए, प्रतीक्षा"}` : undefined} />
        <Kpi icon={Users} label={locale === "en" ? "Guests today" : "आज के मेहमान"} value={String(sales.today.guests)} tone="curry-leaf" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Floor status — what's occupied vs open */}
        <TicketCard className="overflow-hidden">
          <TicketHeader title={locale === "en" ? "Floor right now" : "अभी फ्लोर"} id={`${tables.length} ${locale === "en" ? "tables" : "टेबल"}`} />
          <div className="p-4">
            <div className="mb-3 flex items-end gap-4">
              <div>
                <p className="font-display text-3xl leading-none">{occupied}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "occupied" : "भरे"}</p>
              </div>
              <div>
                <p className="font-display text-3xl leading-none text-clay">{open}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "open" : "खाली"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {tables.map((tb) => (
                <span
                  key={tb.id}
                  title={`${tb.code} · ${tb.status}`}
                  className="h-6 w-6 rounded-[4px] border"
                  style={{
                    background: tb.status === "occupied" ? "var(--color-curry-leaf)" : tb.status === "reserved" ? "var(--color-marigold)" : tb.status === "cleaning" ? "var(--color-clay)" : "var(--color-paper-deep)",
                    borderColor: "rgba(42,33,25,0.15)",
                  }}
                />
              ))}
            </div>
            <button onClick={() => setDashTab("tables")} className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink underline-offset-4 hover:underline">
              {locale === "en" ? "Manage floor & queue" : "फ्लोर व कतार"} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </TicketCard>

        {/* Urgent: low stock + new tickets waiting */}
        <TicketCard className="overflow-hidden">
          <TicketHeader title={locale === "en" ? "Needs attention" : "ध्यान चाहिए"} id={lowStock || urgent ? "!" : "ok"} />
          <div className="space-y-3 p-4">
            {lowStock > 0 ? (
              <button onClick={() => setDashTab("inventory")} className="flex w-full items-center justify-between rounded-[10px] border border-chili/25 bg-chili/8 px-3 py-2.5 text-left hover:bg-chili/12">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-chili)" }} />
                  <span className="text-sm font-semibold">{lowStock} {locale === "en" ? "items low or 86'd" : "आइटम कम या 86'd"}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-clay" />
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-[10px] border border-curry-leaf/25 bg-curry-leaf/8 px-3 py-2.5">
                <Boxes className="h-4 w-4" style={{ color: "var(--color-curry-leaf)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--color-curry-leaf)" }}>{locale === "en" ? "Stock is healthy" : "स्टॉक ठीक है"}</span>
              </div>
            )}
            {urgent > 0 && (
              <button onClick={() => setDashTab("live")} className="flex w-full items-center justify-between rounded-[10px] border border-marigold/40 bg-marigold/12 px-3 py-2.5 text-left hover:bg-marigold/18">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: "var(--color-marigold)" }} />
                  <span className="text-sm font-semibold">{urgent} {locale === "en" ? "new tickets waiting to start" : "नए टिकट शुरू होने को"}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-clay" />
              </button>
            )}
          </div>
        </TicketCard>

        {/* Jump to deeper dashboards */}
        <TicketCard className="overflow-hidden">
          <TicketHeader title={locale === "en" ? "Go deeper" : "और देखें"} id="" />
          <div className="grid grid-cols-2 gap-2 p-3">
            <NavCard icon={Receipt} label={t("nav_sales", locale)} onClick={() => setDashTab("sales")} />
            <NavCard icon={BarChart3} label={t("nav_analytics", locale)} onClick={() => setDashTab("analytics")} />
            <NavCard icon={Sparkles} label={locale === "en" ? "AI forecast" : "AI पूर्वानुमान"} onClick={() => setDashTab("forecast")} />
            <NavCard icon={Users} label={t("nav_staff", locale)} onClick={() => setDashTab("staff")} />
            <NavCard icon={ChefHat} label={t("nav_kitchen", locale)} onClick={() => setDashTab("live")} />
            <NavCard icon={Crown} label={t("nav_customers", locale)} onClick={() => setDashTab("customers")} />
          </div>
        </TicketCard>
      </div>
    </div>
  );
}

function NavCard({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press flex flex-col items-start gap-1.5 rounded-[10px] border border-ink/12 bg-paper p-2.5 text-left hover:bg-paper-deep">
      <Icon className="h-4 w-4 text-clay" />
      <span className="font-display text-[11px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );
}

/* ---------- LIVE ORDERS TAB ---------- */
export function LiveOrdersTab() {
  const { locale } = useLocaleStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Order[] }>("/api/orders?live=1");
      setOrders(d.items);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeEvent<{ order: Order }>("kot:new", (p) => setOrders((prev) => prev.find((o) => o.id === p.order.id) ? prev : [p.order, ...prev]));
  useRealtimeEvent<{ orderId: string; status: string }>("kot:status", (p) => setOrders((prev) => prev.map((o) => o.id === p.orderId ? { ...o, status: p.status } : o)));

  const advance = async (id: string) => {
    try { await api(`/api/orders/${id}/status`, { method: "PATCH" }); } catch (e) { toast.error((e as Error).message); load(); }
  };

  if (loading) return <Loading />;
  if (!orders.length) return <Empty label={locale === "en" ? "No live tickets — orders will print in here the moment a table submits one." : "कोई लाइव टिकट नहीं — ऑर्डर आते ही यहां छपेंगे।"} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((o) => (
        <TicketCard key={o.id} className="overflow-hidden">
          <div className="flex items-center justify-between border-b-[2px] border-dashed border-ink px-3 py-2">
            <div>
              <p className="font-display text-xl leading-none">#{o.kotNumber}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-steel">{o.table?.code ?? "walk-in"} · {clockTime(o.createdAt)}</p>
            </div>
            <StampBadge tone={o.status === "NEW" ? "ink" : o.status === "COOKING" ? "turmeric" : o.status === "READY" ? "curry" : "steel"} rotate={o.status === "NEW" ? -3 : 2} size="xs">
              {o.status === "NEW" ? t("status_new", locale) : o.status === "COOKING" ? t("status_cooking", locale) : o.status === "READY" ? t("status_ready", locale) : t("status_served", locale)}
            </StampBadge>
          </div>
          <ul className="divide-y-[1px] divide-ink/15">
            {o.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="flex items-center gap-1.5"><b className="font-display">{it.qty}×</b>{locale === "hi" ? it.nameHi : it.name}</span>
                <VegIndicator isVeg={it.veg as "veg" | "nonveg" | "egg"} size={12} />
              </li>
            ))}
          </ul>
          <Perforation />
          <div className="flex items-center justify-between p-2">
            <span className="font-mono text-sm font-bold">{formatINR(o.total)}</span>
            <PressButton variant={o.status === "NEW" ? "turmeric" : o.status === "COOKING" ? "curry" : "ink"} size="sm" onClick={() => advance(o.id)}>
              {o.status === "NEW" ? t("act_mark_cooking", locale) : o.status === "COOKING" ? t("act_mark_ready", locale) : o.status === "READY" ? t("act_mark_served", locale) : "✓"}
            </PressButton>
          </div>
        </TicketCard>
      ))}
    </div>
  );
}

/* ---------- TABLES TAB (dynamic: add/rename/remove + live per-table QR) ---------- */
export function TablesTab() {
  const { locale } = useLocaleStore();
  const [tables, setTables] = useState<TableT[]>([]);
  const [queue, setQueue] = useState<{ id: string; name: string; partySize: number; quotedWait: number; position: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSeats, setNewSeats] = useState(4);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSection, setEditSection] = useState("");
  const [showQrFor, setShowQrFor] = useState<string | null>(null);
  const [reservationsEnabled, setReservationsEnabled] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [td, qd, rd] = await Promise.all([
        api<{ tables: TableT[] }>("/api/tables"),
        api<{ entries: any[] }>("/api/queue"),
        api<{ restaurant: { reservationsEnabled: boolean } }>("/api/restaurant"),
      ]);
      setTables(td.tables); setQueue(qd.entries); setReservationsEnabled(rd.restaurant.reservationsEnabled);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeEvent("queue:update", () => load());
  useRealtimeEvent("tables:changed", () => load());

  const toggleReservations = async () => {
    const next = !reservationsEnabled;
    setReservationsEnabled(next);
    try { await api("/api/restaurant", { method: "PATCH", body: { reservationsEnabled: next } }); toast.success(next ? (locale === "en" ? "Reservations on" : "आरक्षण चालू") : (locale === "en" ? "Reservations off" : "आरक्षण बंद")); }
    catch (e) { toast.error((e as Error).message); setReservationsEnabled(!next); }
  };

  const setStatus = async (id: string, status: string) => {
    try { await api("/api/tables", { method: "PATCH", body: { tableId: id, status } }); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const seat = async (tableId: string, queueId: string) => {
    try { await api("/api/tables", { method: "PATCH", body: { tableId, seatQueueId: queueId } }); toast.success(locale === "en" ? "Seated" : "बैठाया"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const addTable = async () => {
    setBusy("adding");
    try { await api("/api/tables", { method: "POST", body: { label: newLabel, seats: newSeats } }); toast.success(locale === "en" ? "Table added" : "टेबल जोड़ा"); setNewLabel(""); setNewSeats(4); setAdding(false); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const saveEdit = async (id: string) => {
    setBusy(id);
    try { await api("/api/tables", { method: "PATCH", body: { tableId: id, label: editLabel, section: editSection } }); toast.success(locale === "en" ? "Saved" : "सहेजा"); setEditing(null); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const removeTable = async (id: string, code: string) => {
    if (!confirm(locale === "en" ? `Remove table ${code}?` : `टेबल ${code} हटाएं?`)) return;
    setBusy(id);
    try { await api(`/api/tables?id=${id}`, { method: "DELETE" }); toast.success(locale === "en" ? "Removed" : "हटाया"); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  const statusColor: Record<string, string> = { empty: "bg-paper", occupied: "bg-curry-leaf/15", reserved: "bg-marigold/20", cleaning: "bg-clay/15" };
  const statusLabel: Record<string, { en: string; hi: string }> = { empty: { en: "Empty", hi: "खाली" }, occupied: { en: "Occupied", hi: "भरा" }, reserved: { en: "Reserved", hi: "आरक्षित" }, cleaning: { en: "Cleaning", hi: "सफाई" } };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">{locale === "en" ? "Tables — single source of truth" : "टेबल — एकमात्र सच्चा स्रोत"}</h2>
          <div className="flex items-center gap-2">
            {reservationsEnabled !== null && (
              <button
                onClick={toggleReservations}
                className={`press-soft inline-flex h-9 items-center gap-1.5 rounded-[8px] border-2 border-ink px-2.5 font-display text-xs font-semibold uppercase tracking-wide ${reservationsEnabled ? "bg-curry-leaf text-white" : "bg-paper text-ink"}`}
                title={locale === "en" ? "Toggle walk-up table reservation" : "वॉक-अप टेबल आरक्षण टॉगल"}
              >
                {locale === "en" ? "Reservations" : "आरक्षण"}: {reservationsEnabled ? (locale === "en" ? "On" : "चालू") : (locale === "en" ? "Off" : "बंद")}
              </button>
            )}
            <PressButton variant="chili" size="sm" onClick={() => setAdding((a) => !a)}>
              {adding ? (locale === "en" ? "Cancel" : "रद्द") : (locale === "en" ? "Add table" : "टेबल जोड़ें")}
            </PressButton>
          </div>
        </div>

        {adding && (
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-[10px] border-2 border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)]">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Label" : "नाम"}</span>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={locale === "en" ? "Window Booth" : "विंडो बूथ"} className="h-9 w-44 border-2 border-ink bg-paper px-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Seats" : "सीटें"}</span>
              <input type="number" min={1} max={20} value={newSeats} onChange={(e) => setNewSeats(parseInt(e.target.value) || 4)} className="h-9 w-20 border-2 border-ink bg-paper px-2 text-sm" />
            </label>
            <PressButton variant="ink" size="md" onClick={addTable} disabled={busy === "adding"}>
              {locale === "en" ? "Add" : "जोड़ें"}
            </PressButton>
            <span className="self-center font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "code auto-generated (T9, T10…)" : "कोड अपने आप (T9, T10…)"}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((tb) => (
            <div key={tb.id} className={`rounded-[12px] border-2 border-ink p-3 shadow-[3px_3px_0_var(--color-ink)] ${statusColor[tb.status] ?? "bg-paper"}`}>
              {editing === tb.id ? (
                <div className="flex flex-col gap-2">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-9 border-2 border-ink bg-paper px-2 text-sm" />
                  <input value={editSection} onChange={(e) => setEditSection(e.target.value)} placeholder={locale === "en" ? "Section (optional)" : "सेक्शन (वैकल्पिक)"} className="h-9 border-2 border-ink bg-paper px-2 text-sm" />
                  <div className="flex gap-1.5">
                    <PressButton variant="curry-leaf" size="sm" onClick={() => saveEdit(tb.id)} disabled={busy === tb.id}>{locale === "en" ? "Save" : "सहेजें"}</PressButton>
                    <PressButton variant="chalk" size="sm" onClick={() => setEditing(null)}>{locale === "en" ? "Cancel" : "रद्द"}</PressButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-2xl leading-none">{tb.code}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{tb.label} · {tb.seats} {locale === "en" ? "seats" : "सीट"}{tb.section ? ` · ${tb.section}` : ""}</p>
                    </div>
                    <StatusPill tone={tb.status === "occupied" ? "ready" : tb.status === "reserved" ? "cooking" : tb.status === "cleaning" ? "served" : "new"} size="xs">
                      {statusLabel[tb.status]?.[locale]}
                    </StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <PressButton variant="chalk" size="sm" onClick={() => setStatus(tb.id, "empty")}>{locale === "en" ? "Empty" : "खाली"}</PressButton>
                    <PressButton variant="chalk" size="sm" onClick={() => setStatus(tb.id, "cleaning")}>{locale === "en" ? "Clean" : "सफाई"}</PressButton>
                    <PressButton variant="chalk" size="sm" onClick={() => { setEditing(tb.id); setEditLabel(tb.label); setEditSection(tb.section ?? ""); }}>{locale === "en" ? "Edit" : "एडिट"}</PressButton>
                    <PressButton variant="chalk" size="sm" onClick={() => setShowQrFor(showQrFor === tb.id ? null : tb.id)}><QrCode className="h-3.5 w-3.5" /> QR</PressButton>
                    <PressButton variant="chalk" size="sm" onClick={() => removeTable(tb.id, tb.code)} disabled={busy === tb.id}><Trash2 className="h-3.5 w-3.5 text-chili" /></PressButton>
                  </div>
                  {showQrFor === tb.id && (
                    <div className="mt-3 flex flex-col items-center gap-2 rounded-[8px] border-2 border-ink bg-paper p-3">
                      <LiveQR value={`${typeof window !== "undefined" ? window.location.origin : ""}/?table=${encodeURIComponent(tb.code)}`} size={160} />
                      <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Scan to land on this table's menu" : "इस टेबल के मेनू पर जाने के लिए स्कैन करें"}</p>
                      <a href={`${typeof window !== "undefined" ? window.location.origin : ""}/?table=${encodeURIComponent(tb.code)}`} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-chili underline">
                        {locale === "en" ? "Open / share link" : "लिंक खोलें / शेयर करें"}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Smart queue" : "स्मार्ट कतार"} id={`${queue.length} ${locale === "en" ? "waiting" : "प्रतीक्षा"}`} />
        {queue.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink/60">{locale === "en" ? "No one waiting — seats are available." : "कोई प्रतीक्षा नहीं — सीटें उपलब्ध हैं।"}</div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {queue.map((q) => (
              <li key={q.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-sm font-semibold">#{q.position} {q.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-clay">{q.partySize} {locale === "en" ? "guests" : "मेहमान"} · ~{q.quotedWait}{t("label_min", locale)}</p>
                  </div>
                </div>
                <select onChange={(e) => e.target.value && seat(e.target.value, q.id)} value="" className="mt-2 h-8 w-full border-2 border-ink bg-paper px-1.5 font-mono text-xs">
                  <option value="">{locale === "en" ? "Assign table…" : "टेबल दें…"}</option>
                  {tables.filter((tb) => tb.status === "empty" || tb.status === "cleaning").map((tb) => (
                    <option key={tb.id} value={tb.id}>{tb.code} · {tb.label}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </TicketCard>
    </div>
  );
}

/* ---------- INVENTORY TAB ---------- */
export function InventoryTab() {
  const { locale } = useLocaleStore();
  const [items, setItems] = useState<IngredientT[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const d = await api<{ items: IngredientT[] }>("/api/inventory"); setItems(d.items); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, available: boolean) => {
    setBusy(id);
    try { await api("/api/inventory", { method: "PATCH", body: { ingredientId: id, available } }); toast.success(available ? t("toast_restocked", locale) : t("toast_86", locale)); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const restock = async (id: string, level: number) => {
    setBusy(id);
    try { await api("/api/inventory", { method: "PATCH", body: { ingredientId: id, stockLevel: level, available: true } }); toast.success(t("toast_restocked", locale)); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  const low = items.filter((i) => i.stockLevel <= i.lowThreshold);

  return (
    <div>
      {low.length > 0 && (
        <div className="mb-4 flex items-center gap-2 border-[2.5px] border-chili bg-chili/10 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-chili" />
          <span className="font-headline text-sm font-bold text-chili">{low.length} {locale === "en" ? "ingredients low — restocking prevents 86s" : "सामग्री कम — रीस्टॉक करें"}</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ing) => {
          const isLow = ing.stockLevel <= ing.lowThreshold;
          const isOut = !ing.available;
          return (
            <TicketCard key={ing.id} className={`p-3 ${isOut ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-headline text-sm font-semibold">{locale === "hi" ? ing.nameHi : ing.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-steel">{ing.stockLevel}{ing.unit} / {locale === "en" ? "threshold" : "सीमा"} {ing.lowThreshold}</p>
                </div>
                <StampBadge tone={isOut ? "chili" : isLow ? "turmeric" : "curry"} rotate={-2} size="xs">
                  {isOut ? t("status_out", locale) : isLow ? t("status_low", locale) : "ok"}
                </StampBadge>
              </div>
              {/* stock bar */}
              <div className="mt-2 h-2 border-[1.5px] border-ink">
                <div className={`h-full ${isOut ? "bg-chili" : isLow ? "bg-turmeric" : "bg-curry"}`} style={{ width: `${Math.min(100, (ing.stockLevel / (ing.lowThreshold * 4)) * 100)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <PressButton variant="chalk" size="sm" onClick={() => restock(ing.id, ing.lowThreshold * 3)} disabled={busy === ing.id}>
                  <RotateCcw className="h-3 w-3" /> {locale === "en" ? "Restock" : "भरें"}
                </PressButton>
                <PressButton variant={isOut ? "curry" : "chili"} size="sm" onClick={() => toggle(ing.id, isOut)} disabled={busy === ing.id}>
                  {busy === ing.id ? <Loader2 className="h-3 w-3 animate-spin" /> : isOut ? <RotateCcw className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                  {isOut ? t("act_restore", locale) : t("act_86", locale)}
                </PressButton>
              </div>
              {ing.dishes.length > 0 && (
                <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-steel">
                  {locale === "en" ? "used in" : "उपयोग"}: {ing.dishes.slice(0, 3).map((d) => d.menuItem.name).join(", ")}{ing.dishes.length > 3 ? "…" : ""}
                </p>
              )}
            </TicketCard>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SALES TAB ---------- */
export function SalesTab() {
  const { locale } = useLocaleStore();
  const [data, setData] = useState<{ series: { date: string; revenue: number; orders: number; guests: number }[]; today: { revenue: number; orders: number; guests: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/api/dashboard/sales").then((d) => setData(d)).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Loading />;
  const chartData = data.series.map((s) => ({ date: s.date.slice(5), revenue: s.revenue, orders: s.orders }));

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Kpi icon={Receipt} label={locale === "en" ? "Today's revenue" : "आज का राजस्व"} value={formatINR(data.today.revenue)} tone="ink" />
        <Kpi icon={Clock} label={locale === "en" ? "Today's orders" : "आज के ऑर्डर"} value={String(data.today.orders)} tone="turmeric" />
        <Kpi icon={Users} label={locale === "en" ? "Today's guests" : "आज के मेहमान"} value={String(data.today.guests)} tone="curry" />
      </div>
      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Revenue — last 14 days" : "राजस्व — पिछले 14 दिन"} id="₹" right={<StampBadge tone="curry" rotate={-2} size="xs"><TrendingUp className="h-3 w-3" /> trend</StampBadge>} />
        <div className="p-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1B1B18" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 10 }} stroke="#8C8A7E" />
              <YAxis tick={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 10 }} stroke="#8C8A7E" />
              <Tooltip contentStyle={{ border: "2px solid #1B1B18", background: "#F6F1E4", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }} cursor={{ fill: "#E8A93A33" }} />
              <Bar dataKey="revenue" fill="#1B1B18" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            {locale === "en" ? "replaces: end-of-night manual register tally" : "बदलता है: रात का मैनुअल रजिस्टर हिसाब"}
          </p>
        </div>
      </TicketCard>
    </div>
  );
}

/* ---------- ANALYTICS TAB ---------- */
export function AnalyticsTab() {
  const { locale } = useLocaleStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/api/dashboard/analytics").then(setData).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Loading />;

  const hourData = data.hourBuckets.map((count: number, hour: number) => ({ hour: `${hour}:00`, orders: count })).filter((d: any) => d.orders > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Bestsellers (7d)" : "बेस्टसेलर (7 दिन)"} id={`${data.totalOrders} orders`} />
        <ul className="divide-y-[1px] divide-ink/15">
          {data.bestsellers.map((d: any, i: number) => (
            <li key={d.name} className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2"><span className="font-display text-lg text-turmeric">#{i + 1}</span>{d.name}</span>
              <span className="font-mono text-sm">{d.qty}× · {formatINR(d.revenue)}</span>
            </li>
          ))}
        </ul>
      </TicketCard>
      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Slow movers (7d)" : "धीमे आइटम (7 दिन)"} id="consider cutting" right={<StampBadge tone="chili" rotate={2} size="xs">review</StampBadge>} />
        <ul className="divide-y-[1px] divide-ink/15">
          {data.worst.map((d: any) => (
            <li key={d.name} className="flex items-center justify-between p-3">
              <span>{d.name}</span>
              <span className="font-mono text-sm text-steel">{d.qty}× · {formatINR(d.revenue)}</span>
            </li>
          ))}
        </ul>
      </TicketCard>
      <TicketCard className="overflow-hidden lg:col-span-2">
        <TicketHeader title={locale === "en" ? "Peak hours" : "पीक घंटे"} id="staff accordingly" right={<StampBadge tone="turmeric" rotate={-2} size="xs"><Clock className="h-3 w-3" /> {data.peakHours.length} peaks</StampBadge>} />
        <div className="p-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1B1B18" opacity={0.15} />
              <XAxis dataKey="hour" tick={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 9 }} stroke="#8C8A7E" interval={1} />
              <YAxis tick={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 10 }} stroke="#8C8A7E" />
              <Tooltip contentStyle={{ border: "2px solid #1B1B18", background: "#F6F1E4", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12 }} cursor={{ fill: "#E8A93A33" }} />
              <Bar dataKey="orders" radius={[0, 0, 0, 0]}>
                {hourData.map((d: any, i: number) => <Cell key={i} fill={data.peakHours.some((p: any) => p.hour === parseInt(d.hour)) ? "#C0392B" : "#1B1B18"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-steel">
            {locale === "en" ? "red bars = peak hours — schedule extra hands then. replaces: guessing when it gets busy" : "लाल बार = पीक घंटे — तब एक्स्ट्रा स्टाफ रखें"}
          </p>
        </div>
      </TicketCard>
    </div>
  );
}

/* ---------- FORECAST TAB (AI) ---------- */
export function ForecastTab() {
  const { locale } = useLocaleStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/api/forecast").then(setData).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Loading />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TicketCard className="overflow-hidden lg:col-span-2">
        <TicketHeader title={locale === "en" ? "AI prep list — tomorrow" : "AI तैयारी सूची — कल"} id="LLM" right={<StampBadge tone="chili" rotate={-2} size="xs"><Sparkles className="h-3 w-3" /> AI</StampBadge>} />
        <div className="p-4">
          <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{data.prepList}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-steel">{data.note}</p>
        </div>
      </TicketCard>
      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Projected dish demand" : "अनुमानित मांग"} id="tomorrow" />
        <ul className="divide-y-[1px] divide-ink/15">
          {data.dishProjection.map((d: any) => (
            <li key={d.name} className="flex items-center justify-between p-2.5">
              <span className="text-sm">{d.name}</span>
              <span className="font-mono text-sm font-bold">~{d.projectedTomorrow}</span>
            </li>
          ))}
        </ul>
      </TicketCard>
      <TicketCard className="overflow-hidden">
        <TicketHeader title={locale === "en" ? "Ingredient restock flags" : "सामग्री रीस्टॉक"} id="action needed" />
        <ul className="divide-y-[1px] divide-ink/15">
          {data.ingredientNeeds.map((i: any) => (
            <li key={i.ingredient} className="flex items-center justify-between p-2.5">
              <div>
                <p className="text-sm">{i.ingredient}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-steel">have {i.currentStock}{i.unit} · need ~{i.projectedNeed}</p>
              </div>
              <StampBadge tone={i.status === "RESTOCK" ? "chili" : i.status === "LOW" ? "turmeric" : "curry"} rotate={-2} size="xs">{i.status}</StampBadge>
            </li>
          ))}
        </ul>
      </TicketCard>
    </div>
  );
}

/* ---------- STAFF TAB ---------- */
export function StaffTab() {
  const { locale } = useLocaleStore();
  const [shift, setShift] = useState<{ staff: any[]; unassigned: any[] } | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<any[]>([]);
  const [hiring, setHiring] = useState(false);
  const [hireName, setHireName] = useState("");
  const [hireEmail, setHireEmail] = useState("");
  const [hireRole, setHireRole] = useState<"staff" | "kitchen">("staff");
  const [hirePhone, setHirePhone] = useState("");
  const [hirePw, setHirePw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, a, r] = await Promise.all([
        api<{ staff: any[]; unassigned: any[] }>("/api/dashboard/shift"),
        api<{ alerts: any[] }>("/api/alerts"),
        api<{ staff: any[] }>("/api/dashboard/staff"),
      ]);
      setShift(s); setAlerts(a.alerts); setRoster(r.staff);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeEvent("staff:alert", () => load());
  useRealtimeEvent("staff:alert:resolve", () => load());
  useRealtimeEvent("staff:assignment", () => load());

  const assign = async (tableId: string, userId: string) => {
    try { await api("/api/tables/assign", { method: "POST", body: { tableId, userId } }); toast.success(locale === "en" ? "Assigned" : "सौंपा"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const unassign = async (tableId: string) => {
    try { await api(`/api/tables/assign?tableId=${tableId}`, { method: "DELETE" }); toast.success(locale === "en" ? "Unassigned" : "हटाया"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const resolveAlert = async (id: string) => {
    try { await api(`/api/alerts/${id}/resolve`, { method: "PATCH" }); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const sendAlert = async (type: string, toRole: string, message: string) => {
    try { await api("/api/alerts", { method: "POST", body: { toRole, type, message } }); toast.success(locale === "en" ? "Sent" : "भेजा"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const hire = async () => {
    if (!hireName || !hireEmail) { toast.error(locale === "en" ? "Name and email required" : "नाम व ईमेल जरूरी"); return; }
    setBusy("hiring");
    try {
      const res = await api<{ staff: any; tempPassword: string }>("/api/dashboard/staff", {
        method: "POST",
        body: { name: hireName, email: hireEmail, role: hireRole, phone: hirePhone, tempPassword: hirePw || undefined },
      });
      toast.success(locale === "en" ? `Hired ${res.staff.name}` : `${res.staff.name} को नियुक्त किया`, {
        description: locale === "en" ? `Temp password: ${res.tempPassword}` : `अस्थायी पासवर्ड: ${res.tempPassword}`,
      });
      setHiring(false); setHireName(""); setHireEmail(""); setHireRole("staff"); setHirePhone(""); setHirePw("");
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const fire = async (id: string, name: string) => {
    if (!confirm(locale === "en" ? `Fire ${name}? Their table assignments will be released.` : `${name} को हटाएं? उनके टेबल सौंपने खाली होंगे।`)) return;
    setBusy(id);
    try { await api(`/api/dashboard/staff?id=${id}`, { method: "DELETE" }); toast.success(locale === "en" ? `Fired ${name}` : `${name} हटाया`); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading || !shift) return <Loading />;
  const roleIcon: Record<string, any> = { owner: Crown, kitchen: ChefHat, staff: Users };
  const alertMeta: Record<string, { icon: any; tone: any; label: { en: string; hi: string } }> = {
    ready: { icon: Bell, tone: "ready", label: { en: "Order ready", hi: "ऑर्डर तैयार" } },
    water: { icon: Droplets, tone: "cooking", label: { en: "Needs water", hi: "पानी चाहिए" } },
    bill: { icon: FileText, tone: "new", label: { en: "Wants bill", hi: "बिल चाहिए" } },
    help: { icon: HelpCircle, tone: "low", label: { en: "Needs help", hi: "मदद चाहिए" } },
    breach: { icon: AlertTriangle, tone: "eighty-six", label: { en: "Wait breach", hi: "प्रतीक्षा लंबी" } },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Assignment matrix */}
      <div>
        <h2 className="mb-3 font-display text-xl">{locale === "en" ? "Table assignments" : "टेबल सौंपना"}</h2>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-clay">
          {locale === "en" ? "tap a table to assign a staff member — least-loaded first" : "सबसे कम व्यस्त स्टाफ को पहले सौंपें"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Staff with their tables */}
          {shift.staff.map((s) => {
            const Icon = roleIcon[s.role] ?? Users;
            return (
              <TicketCard key={s.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b-2 border-ink bg-paper-deep/60 px-3 py-2">
                  <span className="flex items-center gap-2 font-display text-sm font-bold"><Icon className="h-4 w-4" />{s.name}</span>
                  <StatusPill tone={s.load > 3 ? "eighty-six" : s.load > 1 ? "cooking" : "ready"} size="xs">
                    {s.load} {locale === "en" ? "tables" : "टेबल"}
                  </StatusPill>
                </div>
                {s.tables.length === 0 ? (
                  <p className="p-3 font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "no tables assigned" : "कोई टेबल नहीं"}</p>
                ) : (
                  <ul className="divide-y divide-ink/10">
                    {s.tables.map((tb: any) => (
                      <li key={tb.id} className="flex items-center justify-between px-3 py-1.5">
                        <span className="font-mono text-sm">{tb.code} <span className="text-clay">· {tb.label}</span></span>
                        <button onClick={() => unassign(tb.id)} className="press-soft font-mono text-[10px] uppercase tracking-wider text-chili hover:underline">{locale === "en" ? "unassign" : "हटाएं"}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </TicketCard>
            );
          })}
        </div>

        {/* Unassigned tables — assign via dropdown */}
        {shift.unassigned.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Unassigned tables" : "बिना सौंपे टेबल"}</h3>
            <div className="flex flex-wrap gap-2">
              {shift.unassigned.map((tb) => (
                <div key={tb.id} className="flex items-center gap-1.5 rounded-[8px] border-2 border-ink bg-paper px-2 py-1">
                  <span className="font-mono text-sm font-bold">{tb.code}</span>
                  <select onChange={(e) => e.target.value && assign(tb.id, e.target.value)} value="" className="h-7 border-2 border-ink bg-paper px-1 font-mono text-[10px]">
                    <option value="">{locale === "en" ? "assign…" : "सौंपें…"}</option>
                    {shift.staff.filter((s) => s.role === "staff").map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.load})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff roster — hire & fire (§1) */}
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">{locale === "en" ? "Staff roster" : "स्टाफ सूची"}</h2>
            <PressButton variant="chili" size="sm" onClick={() => setHiring((h) => !h)}>
              {hiring ? (locale === "en" ? "Cancel" : "रद्द") : (locale === "en" ? "Hire staff" : "स्टाफ नियुक्त करें")}
            </PressButton>
          </div>

          {hiring && (
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-[10px] border-2 border-ink bg-paper p-3 shadow-[3px_3px_0_var(--color-ink)] sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Name" : "नाम"}</span>
                <input value={hireName} onChange={(e) => setHireName(e.target.value)} className="h-9 border-2 border-ink bg-paper px-2 text-sm" placeholder="Riya Verma" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">Email</span>
                <input value={hireEmail} onChange={(e) => setHireEmail(e.target.value)} type="email" className="h-9 border-2 border-ink bg-paper px-2 text-sm" placeholder="riya@chalu.in" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Role" : "भूमिका"}</span>
                <select value={hireRole} onChange={(e) => setHireRole(e.target.value as "staff" | "kitchen")} className="h-9 border-2 border-ink bg-paper px-2 text-sm">
                  <option value="staff">{locale === "en" ? "Waiter / Staff" : "वेटर / स्टाफ"}</option>
                  <option value="kitchen">{locale === "en" ? "Kitchen" : "रसोई"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Phone (opt)" : "फ़ोन (वैकल्पिक)"}</span>
                <input value={hirePhone} onChange={(e) => setHirePhone(e.target.value)} className="h-9 border-2 border-ink bg-paper px-2 text-sm" placeholder="+91…" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "Temp password (opt)" : "अस्थायी पासवर्ड (वैकल्पिक)"}</span>
                <input value={hirePw} onChange={(e) => setHirePw(e.target.value)} className="h-9 border-2 border-ink bg-paper px-2 text-sm" placeholder="chalu123" />
              </label>
              <PressButton variant="curry-leaf" size="md" onClick={hire} disabled={busy === "hiring"} className="self-end">
                {locale === "en" ? "Hire" : "नियुक्त करें"}
              </PressButton>
            </div>
          )}

          <div className="overflow-hidden rounded-[12px] border-2 border-ink shadow-[3px_3px_0_var(--color-ink)]">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-ink bg-paper-deep/60">
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-clay">
                  <th className="p-2.5">{locale === "en" ? "Name" : "नाम"}</th>
                  <th className="p-2.5">{locale === "en" ? "Role" : "भूमिका"}</th>
                  <th className="p-2.5 hidden sm:table-cell">{locale === "en" ? "Contact" : "संपर्क"}</th>
                  <th className="p-2.5 text-right">{locale === "en" ? "Action" : "कार्रवाई"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {roster.map((s) => {
                  const Icon = roleIcon[s.role] ?? Users;
                  const isOwner = s.role === "owner";
                  return (
                    <tr key={s.id} className="hover:bg-paper-deep/40">
                      <td className="p-2.5"><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{s.name}</span></td>
                      <td className="p-2.5">
                        <StatusPill tone={s.role === "owner" ? "ready" : s.role === "kitchen" ? "cooking" : "new"} size="xs">{s.role}</StatusPill>
                      </td>
                      <td className="p-2.5 hidden sm:table-cell font-mono text-[10px] text-clay">{s.email}{s.phone ? ` · ${s.phone}` : ""}</td>
                      <td className="p-2.5 text-right">
                        {isOwner ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-clay">{locale === "en" ? "protected" : "सुरक्षित"}</span>
                        ) : (
                          <button
                            onClick={() => fire(s.id, s.name)}
                            disabled={busy === s.id}
                            className="press-soft inline-flex h-8 items-center gap-1 rounded-[6px] border-2 border-chili/30 px-2 font-mono text-[10px] uppercase tracking-wider text-chili hover:bg-chili/10 disabled:opacity-50"
                          >
                            <Ban className="h-3 w-3" /> {locale === "en" ? "Fire" : "निकालें"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-clay">
            {locale === "en" ? "hired staff get a temp password (default chalu123) — they can log in and change it" : "नया स्टाफ अस्थायी पासवर्ड से लॉगिन कर सकता है (डिफ़ॉल्ट chalu123)"}
          </p>
        </div>
      </div>

      {/* Live alerts feed + quick-send */}
      <div className="flex flex-col gap-4">
        <TicketCard className="overflow-hidden">
          <TicketHeader title={locale === "en" ? "Live alerts" : "लाइव अलर्ट"} id={`${alerts.length} active`} tone="chili" />
          {alerts.length === 0 ? (
            <p className="p-4 text-center font-mono text-[10px] uppercase tracking-wider text-clay">{locale === "en" ? "no active alerts — all clear" : "कोई अलर्ट नहीं — सब ठीक"}</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {alerts.map((a) => {
                const meta = alertMeta[a.type] ?? alertMeta.help;
                const Icon = meta.icon;
                return (
                  <li key={a.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4" style={{ color: a.type === "breach" ? "var(--color-chili)" : a.type === "ready" ? "var(--color-curry-leaf)" : "var(--color-marigold)" }} />
                        <div>
                          <p className="font-display text-xs font-bold uppercase tracking-wide">{meta.label[locale]}</p>
                          <p className="text-xs text-ink/75">{a.message || (a.table ? `Table ${a.table.code}` : "")}</p>
                          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-clay">{a.fromName} · {timeAgo(a.createdAt)}</p>
                        </div>
                      </span>
                      <button onClick={() => resolveAlert(a.id)} className="press-soft rounded-[6px] border border-ink/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider hover:bg-curry-leaf/15">{locale === "en" ? "done" : "हो"}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TicketCard>

        {/* Quick-send to kitchen */}
        <TicketCard className="overflow-hidden">
          <TicketHeader title={locale === "en" ? "Quick flag to kitchen" : "रसोई को त्वरित संदेश"} />
          <div className="grid grid-cols-2 gap-2 p-3">
            <PressButton variant="marigold" size="sm" onClick={() => sendAlert("water", "kitchen", "Table needs water")}>
              <Droplets className="h-3.5 w-3.5" /> {locale === "en" ? "Water" : "पानी"}
            </PressButton>
            <PressButton variant="curry-leaf" size="sm" onClick={() => sendAlert("bill", "kitchen", "Table wants the bill")}>
              <FileText className="h-3.5 w-3.5" /> {locale === "en" ? "Bill" : "बिल"}
            </PressButton>
            <PressButton variant="chili" size="sm" onClick={() => sendAlert("help", "kitchen", "Table needs help")}>
              <HelpCircle className="h-3.5 w-3.5" /> {locale === "en" ? "Help" : "मदद"}
            </PressButton>
          </div>
        </TicketCard>
      </div>
    </div>
  );
}

/* ---------- CUSTOMERS TAB ---------- */
export function CustomersTab() {
  const { locale } = useLocaleStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<any>("/api/dashboard/customers").then((d) => setData(d.customers)).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  if (!data.length) return <Empty label={locale === "en" ? "No customer history yet — orders will populate this CRM view." : "अभी कोई ग्राहक इतिहास नहीं।"} />;
  return (
    <TicketCard className="overflow-hidden">
      <TicketHeader title={locale === "en" ? "Customer CRM" : "ग्राहक CRM"} id={`${data.length} customers`} right={<StampBadge tone="curry" rotate={-2} size="xs">repeat guests</StampBadge>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-[2px] border-ink bg-chalk-deep">
            <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-steel">
              <th className="p-2">{locale === "en" ? "Name" : "नाम"}</th>
              <th className="p-2">{locale === "en" ? "Orders" : "ऑर्डर"}</th>
              <th className="p-2">{locale === "en" ? "Spent" : "खर्च"}</th>
              <th className="p-2">{locale === "en" ? "Last visit" : "अंतिम यात्रा"}</th>
            </tr>
          </thead>
          <tbody className="divide-y-[1px] divide-ink/15">
            {data.map((c) => (
              <tr key={c.id} className="hover:bg-chalk-deep">
                <td className="p-2"><p className="font-semibold">{c.name}</p><p className="font-mono text-[9px] text-steel">{c.email}</p></td>
                <td className="p-2 font-mono">{c.orderCount}</td>
                <td className="p-2 font-mono font-bold">{formatINR(c.totalSpent)}</td>
                <td className="p-2 font-mono text-[10px] text-steel">{c.lastVisit ? timeAgo(c.lastVisit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TicketCard>
  );
}

/* ---------- shared bits ---------- */
function Loading() { return <div className="py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-steel" /></div>; }
function Empty({ label }: { label: string }) { return <TicketCard className="p-8 text-center"><p className="text-sm text-ink/60">{label}</p></TicketCard>; }
function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "ink" | "turmeric" | "curry" }) {
  const bg = tone === "ink" ? "bg-ink text-chalk" : tone === "turmeric" ? "bg-turmeric text-ink" : "bg-curry text-chalk";
  return (
    <div className={`flex items-center gap-3 border-[2.5px] border-ink ${bg} p-3 shadow-[4px_4px_0_var(--color-ink)]`}>
      <Icon className="h-6 w-6" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="font-display text-2xl leading-none">{value}</p>
      </div>
    </div>
  );
}
