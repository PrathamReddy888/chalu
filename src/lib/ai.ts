import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Use Gemini 1.5 Flash (free tier, fast, good for this use case)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface MenuContextItem {
  id: string; name: string; nameHi: string; category: string; price: number;
  veg: string; spice: number; available: boolean; bestseller: boolean; description: string;
}

export async function liveMenuContext(): Promise<MenuContextItem[]> {
  const items = await db.menuItem.findMany({ orderBy: { category: "asc" } });
  return items.map((m) => ({
    id: m.id, name: m.name, nameHi: m.nameHi, category: m.category, price: m.price,
    veg: m.veg, spice: m.spice, available: m.available, bestseller: m.bestseller,
    description: m.description,
  }));
}

/** Helper: call Gemini and get text back. Exported so other routes can use it. */
export async function geminiChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt },
  ]);
  return result.response.text();
}

/** Substitute suggestion — ties directly to the 86'd wedge. */
export async function suggestSubstitute(dishName: string, reason = "out of stock") {
  const menu = await liveMenuContext();
  const available = menu.filter((m) => m.available);
  const list = available
    .map((m) => `- ${m.name} (${m.nameHi}) | ${m.category} | ₹${m.price} | ${m.veg} | spice ${m.spice} | ${m.bestseller ? "bestseller" : "regular"}`)
    .join("\n");

  try {
    const raw = await geminiChat(
      "You are the kitchen brain of an Indian restaurant called Chalu. A dish was just 86'd (marked out of stock). " +
      "Suggest 2-3 substitute dishes from the LIVE AVAILABLE menu only. Match cuisine, veg/non-veg preference, " +
      "spice level and price band as closely as possible. Respond in Hinglish-friendly English with a one-line reason each. " +
      'Respond ONLY as JSON: {"substitutes":[{"name":string,"reason":string}]}. Use exact dish names from the list.',
      `86'd dish: ${dishName} (reason: ${reason}).\n\nAvailable menu:\n${list}`
    );
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const byName = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
    const subs = (parsed.substitutes ?? [])
      .map((s: { name: string; reason: string }) => {
        const match = byName.get(s.name.toLowerCase());
        return match ? { item: match, reason: s.reason } : null;
      })
      .filter(Boolean);
    return subs;
  } catch {
    // fallback: simple category + veg match
    const target = menu.find((m) => m.name === dishName);
    const fallback = available
      .filter((m) => (!target || m.category === target.category) && (!target || m.veg === target.veg))
      .slice(0, 3)
      .map((item) => ({ item, reason: `Same category as ${dishName}.` }));
    return fallback;
  }
}

/** Demand forecast — projects tomorrow's needed stock from recent order history. */
export async function forecastDemand() {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since } },
    include: { items: true },
  });

  const dishTrend = new Map<string, { name: string; nameHi: string; total: number; days: Set<string> }>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    for (const it of o.items) {
      const cur = dishTrend.get(it.name) ?? { name: it.name, nameHi: it.nameHi, total: 0, days: new Set<string>() };
      cur.total += it.qty;
      cur.days.add(day);
      dishTrend.set(it.name, cur);
    }
  }

  const ingredients = await db.ingredient.findMany({ include: { dishes: { include: { menuItem: true } } } });

  const summary = [...dishTrend.values()]
    .map((d) => ({ name: d.name, nameHi: d.nameHi, avgPerDay: +(d.total / Math.max(1, d.days.size)).toFixed(1), projectedTomorrow: Math.ceil(d.total / Math.max(1, d.days.size) * 1.1) }))
    .sort((a, b) => b.projectedTomorrow - a.projectedTomorrow);

  const ingredientNeeds = ingredients.map((ing) => {
    const linkedDishes = ing.dishes.map((d) => d.menuItem.name);
    const projected = ing.dishes.reduce((sum, d) => {
      const trend = dishTrend.get(d.menuItem.name);
      return sum + (trend ? Math.ceil(trend.total / Math.max(1, trend.days.size) * 1.1) * d.quantity : 0);
    }, 0);
    return {
      ingredient: ing.name,
      nameHi: ing.nameHi,
      currentStock: ing.stockLevel,
      unit: ing.unit,
      projectedNeed: projected,
      status: projected > ing.stockLevel ? "RESTOCK" : ing.stockLevel <= ing.lowThreshold ? "LOW" : "OK",
      linkedDishes,
    };
  });

  let prepList = "";
  try {
    prepList = await geminiChat(
      "You are the kitchen brain of Chalu. Given tomorrow's projected dish demand and ingredient needs, " +
      "write a 4-6 bullet prep list for the morning shift in Hinglish-friendly English. Be concrete about what to prep and restock. Keep it under 120 words.",
      `Top projected dishes tomorrow:\n${summary.slice(0, 8).map((s) => `- ${s.name}: ~${s.projectedTomorrow} portions`).join("\n")}\n\n` +
      `Ingredient needs:\n${ingredientNeeds.map((i) => `- ${i.ingredient}: have ${i.currentStock}${i.unit}, need ~${i.projectedNeed} (${i.status})`).join("\n")}`
    );
  } catch {
    prepList = "Unable to generate AI prep list. See ingredient restock flags below.";
  }

  return {
    dishProjection: summary.slice(0, 12),
    ingredientNeeds: ingredientNeeds.sort((a, b) => (a.status === "RESTOCK" ? -1 : b.status === "RESTOCK" ? 1 : 0)),
    prepList,
    note: "Projection = 7-day avg × 1.1 (10% growth buffer). RESTOCK = projected need exceeds current stock.",
  };
}

/** Hinglish customer chat assistant — answers against the live menu. */
export async function chatAssistant(message: string, history: { role: string; content: string }[] = []) {
  const menu = await liveMenuContext();
  const available = menu.filter((m) => m.available);
  const list = available
    .map((m) => `- ${m.name} (${m.nameHi}) | ${m.category} | ₹${m.price} | ${m.veg} | spice ${m.spice}/3 | ${m.bestseller ? "bestseller" : ""} | ${m.description}`)
    .join("\n");
  const eightySixed = menu.filter((m) => !m.available).map((m) => `${m.name} (${m.nameHi})`).join(", ") || "none";

  try {
    const systemPrompt =
      "You are Chalu AI, the friendly assistant inside a live Indian restaurant menu app. " +
      "Answer the customer's question using ONLY the live menu below. " +
      "Be concise (under 90 words), warm, and use light Hinglish if the customer does. " +
      "Always show ₹ prices and mention veg/non-veg and spice where relevant. " +
      "If the customer asks for something that is 86'd, say it's out of stock today and suggest a live substitute from the menu. " +
      "Never invent dishes not in the list. Never give medical/dietary advice beyond what's on the menu.\n\n" +
      `LIVE AVAILABLE MENU:\n${list}\n\n86'd TODAY: ${eightySixed}`;

    const historyText = history.map((h) => `${h.role}: ${h.content}`).join("\n");
    const prompt = historyText ? `${historyText}\nuser: ${message}` : message;

    const raw = await geminiChat(systemPrompt, prompt);
    return raw;
  } catch {
    return "Sorry, I couldn't get a response — please ask the staff.";
  }
}
