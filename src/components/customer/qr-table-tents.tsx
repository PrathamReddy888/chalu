"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocaleStore } from "@/stores/locale";
import { TicketCard, TicketHeader, StampBadge, PressButton } from "@/components/kot";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Loader2 } from "lucide-react";

interface TableT { id: string; code: string; label: string; seats: number; qrToken: string }

export function QrTableTents() {
  const { locale } = useLocaleStore();
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<TableT[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await api<{ tables: TableT[] }>("/api/tables");
        if (cancelled) return;
        setTables(d.tables);
        const map: Record<string, string> = {};
        for (const tb of d.tables) {
          const url = `${window.location.origin}/?table=${encodeURIComponent(tb.code)}`;
          map[tb.id] = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#1B1B18", light: "#F6F1E4" } });
        }
        if (cancelled) return;
        setQrs(map);
        setLoaded(true);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  const loading = open && !loaded;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PressButton variant="chalk" size="md">
          <QrCode className="h-4 w-4" /> {t("act_scan_order", locale)}
        </PressButton>
      </DialogTrigger>
      <DialogContent className="max-w-3xl border-[2.5px] border-ink bg-chalk p-0 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b-[2.5px] border-ink bg-chalk-deep px-4 py-3">
          <DialogTitle className="font-display text-xl">{locale === "en" ? "Table QR tents" : "टेबल QR टेंट"}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="mb-3 text-sm text-ink/70">
            {locale === "en"
              ? "Each table has its own QR. A customer scans it and lands straight on that table's live menu — no app install. Print these as table tents."
              : "हर टेबल का अपना QR है। ग्राहक स्कैन करते ही उस टेबल के लाइव मेनू पर पहुंच जाता है — कोई ऐप नहीं। इन्हें टेबल टेंट के रूप में छापें।"}
          </p>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-steel" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tables.map((tb) => (
                <TicketCard key={tb.id} className="overflow-hidden">
                  <TicketHeader title={tb.code} id={tb.label} right={<StampBadge tone="ink" rotate={-2} size="xs">{tb.seats} seats</StampBadge>} />
                  <div className="flex flex-col items-center gap-2 p-3">
                    {qrs[tb.id] && <img src={qrs[tb.id]} alt={`QR for table ${tb.code}`} className="border-[2px] border-ink" />}
                    <p className="font-mono text-[10px] uppercase tracking-wider text-steel">{t("act_scan_order", locale)}</p>
                  </div>
                </TicketCard>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
