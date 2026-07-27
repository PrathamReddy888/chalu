"use client";
import { useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { PressButton, StampBadge } from "@/components/kot";
import { t } from "@/lib/i18n";
import { formatINR, computeGst } from "@/lib/format";
import { SplitSquareHorizontal, Minus, Plus } from "lucide-react";

export function SplitBill({ subtotal, cgst, sgst, total }: { subtotal: number; cgst: number; sgst: number; total: number }) {
  const { locale } = useLocaleStore();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState(2);

  const perPerson = Math.ceil(total / people);
  const perSubtotal = subtotal / people;
  const perCgst = cgst / people;
  const perSgst = sgst / people;

  if (!open) {
    return (
      <PressButton variant="chalk" size="sm" className="mt-2 w-full" onClick={() => setOpen(true)}>
        <SplitSquareHorizontal className="h-3.5 w-3.5" /> {t("act_split_bill", locale)}
      </PressButton>
    );
  }

  return (
    <div className="mt-3 border-[2px] border-ink bg-turmeric/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-headline text-xs font-bold uppercase tracking-wide">
          <SplitSquareHorizontal className="h-3.5 w-3.5 text-chili" /> {t("act_split_bill", locale)}
        </span>
        <button onClick={() => setOpen(false)} className="font-mono text-[10px] uppercase tracking-wider text-steel hover:text-chili">close</button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setPeople((p) => Math.max(2, p - 1))} className="press grid h-9 w-9 place-items-center border-[2px] border-ink bg-chalk" aria-label="fewer people">
          <Minus className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-display text-4xl leading-none">{people}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">{locale === "en" ? "people" : "लोग"}</p>
        </div>
        <button onClick={() => setPeople((p) => Math.min(20, p + 1))} className="press grid h-9 w-9 place-items-center border-[2px] border-ink bg-chalk" aria-label="more people">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 border-[2px] border-ink bg-chalk p-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-steel">{locale === "en" ? "per person" : "प्रति व्यक्ति"}</p>
        <p className="font-display text-3xl text-chili">{formatINR(perPerson)}</p>
        <div className="mt-2 flex justify-center gap-3 font-mono text-[10px] text-steel">
          <span>{t("bill_subtotal", locale)} {formatINR(Math.round(perSubtotal))}</span>
          <span>·</span>
          <span>GST {formatINR(Math.round(perCgst + perSgst))}</span>
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-steel">
        {locale === "en" ? "rounded up to nearest ₹ — collect" : "निकटतम ₹ तक गोल — वसूलें"} {formatINR(perPerson * people)}
        {perPerson * people > total && <span className="text-curry"> (+{formatINR(perPerson * people - total)} tip)</span>}
      </p>
    </div>
  );
}
