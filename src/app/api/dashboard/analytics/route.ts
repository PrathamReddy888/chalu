import { db } from "@/lib/db";
import { ok } from "@/lib/api";

// Analytics: best/worst sellers, peak hours, category mix (last 7 days)
export async function GET() {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since } },
    include: { items: true },
  });

  const dishCount = new Map<string, { name: string; nameHi: string; qty: number; revenue: number; veg: string }>();
  const hourBuckets = new Array(24).fill(0);
  const catMix = new Map<string, number>();

  for (const o of orders) {
    const h = new Date(o.createdAt).getHours();
    hourBuckets[h] += o.items.length;
    for (const it of o.items) {
      const cur = dishCount.get(it.name) ?? { name: it.name, nameHi: it.nameHi, qty: 0, revenue: 0, veg: it.veg };
      cur.qty += it.qty;
      cur.revenue += it.qty * it.price;
      dishCount.set(it.name, cur);
    }
  }

  const dishes = [...dishCount.values()].sort((a, b) => b.qty - a.qty);
  const bestsellers = dishes.slice(0, 5);
  const worst = dishes.slice(-5).reverse();

  // peak hours: top 3
  const peak = hourBuckets
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((x) => x.count > 0);

  const totalItems = dishes.reduce((s, d) => s + d.qty, 0);

  return ok({
    bestsellers,
    worst,
    peakHours: peak,
    hourBuckets,
    totalOrders: orders.length,
    totalItems,
    topRevenue: [...dishes].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  });
}
