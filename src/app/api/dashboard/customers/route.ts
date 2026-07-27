import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);
  const customers = await db.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const withOrders = await Promise.all(
    customers.map(async (c) => {
      const orders = await db.order.findMany({
        where: { customerId: c.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, kotNumber: true, total: true, status: true, createdAt: true },
      });
      const spent = orders.reduce((s, o) => s + o.total, 0);
      return { id: c.id, name: c.name, email: c.email, phone: c.phone, orderCount: orders.length, totalSpent: spent, lastVisit: orders[0]?.createdAt ?? null, recent: orders };
    }),
  );
  return ok({ customers: withOrders.filter((c) => c.orderCount > 0) });
}
