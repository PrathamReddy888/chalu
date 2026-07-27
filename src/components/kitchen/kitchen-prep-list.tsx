"use client";
import { useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { TicketCard, TicketHeader, StatusPill, PressButton } from "@/components/kot";
import { api } from "@/lib/api-client";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";

interface Forecast {
  prepList: string;
  dishProjection: { name: string; nameHi: string; projectedTomorrow: number }[];
  ingredientNeeds: { ingredient: string; currentStock: number; unit: string; projectedNeed: number; status: string }[];
  note: string;
}

/**
 * Kitchen AI prep list for tomorrow — shown at the bottom of the Chef home.
 * Reuses the existing /api/forecast endpoint (LLM prep list + dish projection + ingredient flags).
 * Collapsible so it doesn't compete with the live KOT queue during service.
 */
export function KitchenPrepList() {
  const { locale } = useLocaleStore();
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api<Forecast>("/api/forecast");
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !data && !error) await load();
  };

  return (
    <div className="mt-6">
      <TicketCard className="overflow-hidden">
        <TicketHeader
          title={locale === "en" ? "AI prep list — tomorrow" : "AI तैयारी सूची — कल"}
          id="LLM"
          tone="curry-leaf"
          right={
            <div className="flex items-center gap-2">
              <StatusPill tone="cooking" size="xs">
                <Sparkles className="h-3 w-3" /> AI
              </StatusPill>
              <PressButton variant="chalk" size="sm" onClick={toggle} shadow={false}>
                {open ? (locale === "en" ? "Hide" : "छुपाएं") : (locale === "en" ? "Show" : "देखें")}
              </PressButton>
            </div>
          }
        />

        {open && (
          <div className="p-4">
            {loading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-clay" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-clay">
                  {locale === "en" ? "Generating tomorrow's prep list…" : "कल की तैयारी सूची बन रही है…"}
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-[8px] border-2 border-chili/25 bg-chili/8 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-chili" />
                <span className="text-sm text-ink/75">{error}</span>
                <PressButton variant="chalk" size="sm" onClick={load} className="ml-auto">{locale === "en" ? "Retry" : "फिर"}</PressButton>
              </div>
            ) : data ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                {/* The LLM prep list */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-clay">
                    {locale === "en" ? "Morning shift prep" : "सुबह की शिफ्ट तैयारी"}
                  </p>
                  <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{data.prepList}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-clay">{data.note}</p>
                </div>

                {/* Ingredient restock flags */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-clay">
                    {locale === "en" ? "Restock flags" : "रीस्टॉक फ़्लैग"}
                  </p>
                  <ul className="space-y-1">
                    {data.ingredientNeeds.slice(0, 8).map((i) => (
                      <li key={i.ingredient} className="flex items-center justify-between rounded-[6px] border border-ink/10 bg-paper px-2 py-1">
                        <span className="text-xs">{i.ingredient}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-clay">{i.currentStock}{i.unit} → ~{i.projectedNeed}</span>
                          <StatusPill
                            tone={i.status === "RESTOCK" ? "eighty-six" : i.status === "LOW" ? "cooking" : "ready"}
                            size="xs"
                          >
                            {i.status}
                          </StatusPill>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </TicketCard>
    </div>
  );
}
