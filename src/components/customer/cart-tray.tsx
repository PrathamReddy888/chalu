"use client";
import { useEffect, useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore } from "@/stores/view";
import { useCartStore } from "@/stores/cart";
import { TicketCard, TicketHeader, VegIndicator, ChiliMeter, PressButton, StampBadge, Perforation } from "@/components/kot";
import { t } from "@/lib/i18n";
import { computeGst, formatINR } from "@/lib/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Send, Loader2, ChefHat } from "lucide-react";

interface TableOpt { id: string; code: string; label: string; status: string }

export function CartTray() {
  const { locale } = useLocaleStore();
  const { setView } = useViewStore();
  const { lines, inc, dec, remove, clear, subtotal, count, tableId, setTable } = useCartStore();
  const [tables, setTables] = useState<TableOpt[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<{ tables: TableOpt[] }>("/api/tables").then((d) => setTables(d.tables)).catch(() => {});
  }, []);

  const gst = computeGst(subtotal());

  const sendToKitchen = async () => {
    if (!lines.length) return;
    setSending(true);
    try {
      const res = await api<{ order: { id: string; kotNumber: number } }>("/api/orders", {
        method: "POST",
        body: {
          tableId: tableId,
          lines: lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty, notes: l.notes })),
        },
      });
      toast.success(t("toast_sent_kitchen", locale), { description: `KOT #${res.order.kotNumber}` });
      clear();
      setView("myorder");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <TicketCard className="overflow-hidden">
      <TicketHeader
        title={locale === "en" ? "Your order slip" : "आपका ऑर्डर स्लिप"}
        id={`#${count()} ${locale === "en" ? "items" : "आइटम"}`}
        right={<StampBadge tone="turmeric" rotate={2} size="xs">draft</StampBadge>}
      />

      {/* Table selector */}
      <div className="border-b-[2px] border-ink bg-chalk-deep p-3">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-steel">
          {t("label_table", locale)}
        </label>
        <select
          value={tableId ?? ""}
          onChange={(e) => setTable(e.target.value || null)}
          className="h-10 w-full border-[2px] border-ink bg-chalk px-2 font-headline text-sm"
        >
          <option value="">{locale === "en" ? "Walk-in / no table" : "वॉक-इन / कोई टेबल नहीं"}</option>
          {tables.map((tb) => (
            <option key={tb.id} value={tb.id} disabled={tb.status === "occupied" && tb.id !== tableId}>
              {tb.code} · {tb.label} ({tb.seats} {locale === "en" ? "seats" : "सीटें"}){tb.status === "occupied" ? " — occupied" : tb.status === "reserved" ? " — reserved" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Lines */}
      <div className="max-h-[40vh] overflow-y-auto">
        {lines.length === 0 ? (
          <div className="p-6 text-center">
            <ChefHat className="mx-auto h-8 w-8 text-steel" />
            <p className="mt-2 text-sm text-ink/60">{t("label_empty_cart", locale)}</p>
          </div>
        ) : (
          <ul className="divide-y-[2px] divide-ink/15">
            {lines.map((l) => (
              <li key={l.menuItemId} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <VegIndicator isVeg={l.veg} size={14} />
                    <div className="min-w-0">
                      <p className="truncate font-headline text-sm font-semibold">{locale === "hi" ? l.nameHi : l.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <ChiliMeter level={l.spice} size={11} />
                        <span className="font-mono text-[10px] text-steel">{formatINR(l.price)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => dec(l.menuItemId)} className="press grid h-7 w-7 place-items-center border-[2px] border-ink bg-chalk" aria-label="decrease">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-sm font-bold">{l.qty}</span>
                    <button onClick={() => inc(l.menuItemId)} className="press grid h-7 w-7 place-items-center border-[2px] border-ink bg-chalk" aria-label="increase">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => remove(l.menuItemId)} className="press ml-1 grid h-7 w-7 place-items-center border-[2px] border-ink bg-chalk text-chili" aria-label="remove">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 text-right font-mono text-sm font-bold">{formatINR(l.price * l.qty)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <>
          <Perforation />
          <div className="p-3">
            <Row label={t("bill_subtotal", locale)} value={formatINR(gst.subtotal)} />
            <Row label={t("bill_cgst", locale)} value={formatINR(gst.cgst)} muted />
            <Row label={t("bill_sgst", locale)} value={formatINR(gst.sgst)} muted />
            <div className="my-2 border-t-[2px] border-dashed border-ink/30" />
            <Row label={t("bill_grand_total", locale)} value={formatINR(gst.total)} bold />
          </div>
          <div className="border-t-[2.5px] border-ink p-3">
            <PressButton variant="ink" size="lg" className="w-full" onClick={sendToKitchen} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("act_send_kitchen", locale)}
            </PressButton>
            <button onClick={clear} className="mt-2 w-full text-center font-mono text-[10px] uppercase tracking-wider text-steel hover:text-chili">
              {locale === "en" ? "clear slip" : "स्लिप साफ करें"}
            </button>
          </div>
        </>
      )}
    </TicketCard>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 ${bold ? "font-display text-lg" : "font-body text-sm"} ${muted ? "text-steel" : "text-ink"}`}>
      <span>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
