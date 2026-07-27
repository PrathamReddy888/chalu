import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { computeGst } from "@/lib/format";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// GET — list orders. Customers see their own; kitchen/owner see all (optionally filtered).
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const liveOnly = url.searchParams.get("live") === "1";

  if (payload?.role === "customer") {
    const items = await db.order.findMany({
      where: { customerId: payload.sub },
      include: { items: true, table: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ items });
  }

  // public/guest + staff/kitchen/owner: return live or recent
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  else if (liveOnly) where.status = { in: ["NEW", "COOKING", "READY", "SERVED"] };

  const items = await db.order.findMany({
    where,
    include: { items: true, table: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok({ items });
}

// POST — create a KOT (customer places an order). Emits kot:new.
export async function POST(req: Request) {
  const payload = await getUserFromRequest(req);
  const body = await readBody<{
    tableId?: string; tableCode?: string; partySize?: number; notes?: string;
    lines?: { menuItemId: string; qty: number; notes?: string }[];
    customerName?: string;
  }>(req);

  if (!body.lines?.length) return fail("Order must have at least one item", 422);

  // Resolve table
  let table = body.tableId ? await db.tableToken.findUnique({ where: { id: body.tableId } }) : null;
  if (!table && body.tableCode) {
    table = await db.tableToken.findUnique({ where: { code: body.tableCode } });
  }

  // Validate menu items + availability, snapshot prices
  const lineItems = [];
  for (const l of body.lines) {
    const dish = await db.menuItem.findUnique({ where: { id: l.menuItemId } });
    if (!dish) return fail(`Dish not found`, 422);
    if (!dish.available) return fail(`"${dish.name}" just went 86'd — please pick a substitute`, 409);
    lineItems.push({
      menuItemId: dish.id,
      name: dish.name,
      nameHi: dish.nameHi,
      price: dish.price,
      qty: Math.max(1, Math.min(20, l.qty)),
      veg: dish.veg,
      spice: dish.spice,
      notes: l.notes,
      status: "NEW",
    });
  }

  const subtotal = lineItems.reduce((s, l) => s + l.price * l.qty, 0);
  const { cgst, sgst, total } = computeGst(subtotal);

  // kotNumber = max + 1
  const maxKot = await db.order.aggregate({ _max: { kotNumber: true } });
  const kotNumber = (maxKot._max.kotNumber ?? 1000) + 1;

  const order = await db.order.create({
    data: {
      kotNumber,
      status: "NEW",
      tableId: table?.id ?? null,
      customerId: payload?.sub ?? null,
      customerName: body.customerName || payload?.name || (table ? `Table ${table.code}` : "Walk-in"),
      partySize: body.partySize ?? 1,
      notes: body.notes,
      subtotal,
      cgst,
      sgst,
      total,
      items: { create: lineItems },
    },
    include: { items: true, table: true },
  });

  // Mark table occupied
  if (table && table.status === "empty") {
    await db.tableToken.update({ where: { id: table.id }, data: { status: "occupied" } });
  }

  // === Load-aware auto-assignment (§10): if the table has no active staff
  //     assignment, route it to the least-loaded active staff member so the
  //     order isn't waiting on a fixed rotation. Falls back silently if no staff.
  if (table) {
    const existing = await db.tableAssignment.findFirst({ where: { tableId: table.id, active: true } });
    if (!existing) {
      const staff = await db.user.findMany({ where: { role: "staff" }, select: { id: true, name: true } });
      if (staff.length) {
        // count active assignments per staff, pick the least-loaded
        const loads = await Promise.all(
          staff.map(async (s) => ({
            ...s,
            load: await db.tableAssignment.count({ where: { userId: s.id, active: true } }),
          })),
        );
        loads.sort((a, b) => a.load - b.load);
        const pick = loads[0];
        if (pick) {
          await db.tableAssignment.create({ data: { tableId: table.id, userId: pick.id, section: table.section ?? null, active: true } });
          await emitRealtime(RT.STAFF_ASSIGNMENT, { tableId: table.id, userId: pick.id, userName: pick.name, tableCode: table.code, auto: true });
        }
      }
    }
  }

  // Fan out: new KOT prints into the kitchen feed + customer gets a confirm
  await emitRealtime(RT.KOT_NEW, { order });
  await emitRealtime(RT.NOTIFICATION, {
    target: "kitchen",
    title: `New ticket #${kotNumber}`,
    body: `${lineItems.length} item${lineItems.length > 1 ? "s" : ""} from ${order.customerName}`,
  });

  return ok({ order });
}
