import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok } from "@/lib/api";
import { liveMenuContext, geminiChat } from "@/lib/ai";

/**
 * AI recommendations for the customer menu (§11).
 * Signal, in priority order:
 *   1. Never recommend 86'd items (availability is non-negotiable).
 *   2. If the customer is logged in, bias toward their order history (same categories/veg preference).
 *   3. Bestsellers / popularity (from recent order history).
 *   4. Time-of-day cue (morning → beverages/breads; midday → mains/rice; evening → starters/mains; night → desserts).
 * Falls back to today's bestsellers for a logged-out / first-time visitor — never shows nothing.
 * Returns a handful (max 6) so it's a short section, not a wall (§2 noise discipline).
 */
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  const menu = await liveMenuContext();
  const available = menu.filter((m) => m.available);
  if (available.length === 0) return ok({ recommendations: [] });

  const hour = new Date().getHours();
  const timeOfDay: "morning" | "midday" | "evening" | "night" =
    hour < 11 ? "morning" : hour < 15 ? "midday" : hour < 19 ? "evening" : "night";

  // --- Popularity from recent order history (last 7 days) ---
  const since = new Date(); since.setDate(since.getDate() - 7);
  const recentOrders = await db.order.findMany({
    where: { createdAt: { gte: since } },
    include: { items: true },
  });
  const popularity = new Map<string, number>();
  for (const o of recentOrders) for (const it of o.items) {
    popularity.set(it.name, (popularity.get(it.name) ?? 0) + it.qty);
  }

  // --- Logged-in customer's history bias ---
  let customerVeg: "veg" | "nonveg" | null = null;
  let customerCats: string[] = [];
  let customerNames: string[] = [];
  if (payload?.sub) {
    const myOrders = await db.order.findMany({
      where: { customerId: payload.sub },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const myItems = myOrders.flatMap((o) => o.items);
    if (myItems.length) {
      const vegCount = myItems.filter((i) => i.veg === "veg").length;
      customerVeg = vegCount > myItems.length / 2 ? "veg" : "nonveg";
      customerCats = [...new Set(myItems.map((i) => {
        const m = menu.find((mm) => mm.name === i.name);
        return m?.category;
      }).filter(Boolean))] as string[];
      customerNames = [...new Set(myItems.map((i) => i.name))];
    }
  }

  // --- Score each available dish ---
  const timeCats: Record<string, string[]> = {
    morning: ["beverages", "breads"],
    midday: ["mains", "rice"],
    evening: ["starters", "mains"],
    night: ["desserts", "beverages"],
  };
  const scored = available.map((m) => {
    let score = 0;
    if (m.bestseller) score += 30;
    score += (popularity.get(m.name) ?? 0) * 8;
    if (timeCats[timeOfDay].includes(m.category)) score += 18;
    if (customerVeg && m.veg === customerVeg) score += 22;
    if (customerCats.includes(m.category)) score += 14;
    if (customerNames.includes(m.name)) score += 25; // they liked it before
    return { item: m, score };
  });

  // Try Gemini for a short, personalized pick; fall back to the scored ranking on any failure.
  try {
    const shortlist = scored.sort((a, b) => b.score - a.score).slice(0, 12).map((s) =>
      `- ${s.item.name} (${s.item.nameHi}) | ${s.item.category} | ₹${s.item.price} | ${s.item.veg} | spice ${s.item.spice} | ${s.item.bestseller ? "bestseller" : ""} | ${s.item.description}`,
    ).join("\n");

    const systemPrompt =
      "You are the menu brain of an Indian restaurant called Chalu. Pick 4-6 dishes to recommend to THIS customer right now. " +
      "Only pick from the shortlist (all are available). Vary by category and veg/non-veg unless the customer clearly prefers one. " +
      `Signal: time-of-day=${timeOfDay}${customerVeg ? `, customer prefers ${customerVeg}` : ""}${customerCats.length ? `, customer likes ${customerCats.join("/")}` : ""}. ` +
      'Respond ONLY as JSON: {"picks":[{"name":string,"reason":string}]}. Reason: one short, plain line, not salesy.';

    const raw = await geminiChat(systemPrompt, `Shortlist:\n${shortlist}`);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const byName = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
    const recs = (parsed.picks ?? [])
      .map((p: { name: string; reason: string }) => {
        const item = byName.get(p.name.toLowerCase());
        return item ? { item, reason: p.reason } : null;
      })
      .filter(Boolean)
      .slice(0, 6);
    if (recs.length) return ok({ recommendations: recs, source: "ai", timeOfDay });
  } catch {
    /* fall through to scored ranking */
  }

  // Fallback: top scored (effectively today's bestsellers + popularity for a logged-out visitor)
  const fallback = scored.sort((a, b) => b.score - a.score).slice(0, 6).map((s) => ({
    item: s.item,
    reason: s.item.bestseller
      ? (payload ? "You've ordered around this before — and it's a bestseller." : "A bestseller today.")
      : (popularity.get(s.item.name) ? "Popular this week." : "A good pick right now."),
  }));
  return ok({ recommendations: fallback, source: "scored", timeOfDay });
}
