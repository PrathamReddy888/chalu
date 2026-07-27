"use client";
import { useState, useRef, useEffect } from "react";
import { useLocaleStore } from "@/stores/locale";
import { PressButton, StampBadge } from "@/components/kot";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Sparkles, X, Send, Loader2, MessageCircle } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What's spicy and vegetarian under ₹200?",
  "कुछ नॉन-वेज बेस्टसेलर सुझाओ",
  "Best dessert today?",
  "Paneer options with low spice",
];

export function AiChatWidget() {
  const { locale } = useLocaleStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: locale === "en" ? "Namaste! I'm Chalu AI. Ask me what's spicy, what's veg, what's under ₹200 — I'll answer against today's live menu. (Hinglish welcome!)" : "नमस्ते! मैं चालू AI हूं। आज के लाइव मेनू के हिसाब से पूछिए — क्या तीखा है, क्या वेज है, ₹200 के नीचे क्या है। (हिंग्लिश में बात कर सकते हैं!)" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await api<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        body: { message: text, history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press fixed bottom-4 right-4 z-40 flex items-center gap-2 border-[2.5px] border-ink bg-chili px-4 py-3 text-chalk shadow-[4px_4px_0_var(--color-ink)] hover:bg-chili/90"
        aria-label={t("act_ask_ai", locale)}
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-headline text-sm font-bold uppercase tracking-wide">{t("act_ask_ai", locale)}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col border-[2.5px] border-ink bg-chalk shadow-[6px_6px_0_var(--color-ink)]">
      {/* header */}
      <div className="flex items-center justify-between border-b-[2.5px] border-ink bg-ink px-3 py-2 text-chalk">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-turmeric" />
          <div>
            <p className="font-display text-sm leading-none">Chalu AI</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-chalk/60">{locale === "en" ? "live-menu assistant" : "लाइव-मेनू सहायक"}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} aria-label="close" className="press grid h-7 w-7 place-items-center border-[2px] border-chalk hover:bg-chili">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <StampBadge tone="chili" rotate={-3} size="xs" className="mr-1.5 mt-1 shrink-0">AI</StampBadge>}
            <div className={`max-w-[80%] border-[2px] px-2.5 py-1.5 text-sm ${m.role === "user" ? "border-ink bg-ink text-chalk" : "border-ink bg-chalk-deep text-ink"}`}>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <StampBadge tone="chili" rotate={-3} size="xs" className="mr-1.5 mt-1">AI</StampBadge>
            <div className="border-[2px] border-ink bg-chalk-deep px-2.5 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-steel" />
            </div>
          </div>
        )}
      </div>

      {/* suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 border-t-[1px] border-ink/20 p-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="press border-[2px] border-ink bg-chalk px-2 py-1 text-[11px] hover:bg-turmeric/20">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <div className="flex items-center gap-1.5 border-t-[2.5px] border-ink bg-chalk-deep p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          placeholder={locale === "en" ? "Ask about today's menu…" : "आज के मेनू के बारे में पूछें…"}
          className="h-9 flex-1 border-[2px] border-ink bg-chalk px-2 font-body text-sm outline-none"
        />
        <PressButton variant="ink" size="icon" onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="send">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </PressButton>
      </div>
    </div>
  );
}
