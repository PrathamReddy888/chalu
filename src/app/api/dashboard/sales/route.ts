import { db } from "@/lib/db";
import { ok } from "@/lib/api";

// Daily sales for the last 14 days (revenue, orders, guests)
export async function GET() {
  const sales = await db.salesDaily.findMany({ orderBy: { date: "asc" }, take: 14 });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayOrders = await db.order.findMany({
    where: { createdAt: { gte: todayStart } },
    select: { total: true, partySize: true, status: true },
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const todayGuests = todayOrders.reduce((s, o) => s + o.partySize, 0);
  return ok({
    series: sales,
    today: { revenue: todayRevenue, orders: todayOrders.length, guests: todayGuests },
  });
}
