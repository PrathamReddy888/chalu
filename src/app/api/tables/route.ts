import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

export async function GET() {
  const tables = await db.tableToken.findMany({ orderBy: { code: "asc" }, include: { orders: { where: { status: { in: ["NEW", "COOKING", "READY", "SERVED"] } }, take: 1 } } });
  return ok({ tables });
}

// PATCH — update table status (floor control), assign a queue entry, OR rename/resize/section a table
export async function PATCH(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "staff" && payload.role !== "owner" && payload.role !== "kitchen")
    return fail("Forbidden", 403);

  const { tableId, status, seatQueueId, label, seats, section } = await readBody<{
    tableId: string; status?: string; seatQueueId?: string; label?: string; seats?: number; section?: string;
  }>(req);
  if (!tableId) return fail("tableId required", 422);

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (typeof label === "string") data.label = label;
  if (typeof seats === "number" && seats > 0) data.seats = seats;
  if (typeof section === "string") data.section = section || null;
  const table = await db.tableToken.update({ where: { id: tableId }, data });

  if (seatQueueId) {
    await db.queueEntry.update({
      where: { id: seatQueueId },
      data: { status: "SEATED", seatedAt: new Date(), tableId: table.id },
    });
    await emitRealtime(RT.QUEUE_UPDATE, { seated: seatQueueId, tableId: table.id });
  }

  return ok({ table });
}

// POST — add a new table (owner-only). Code auto-generated if not provided.
export async function POST(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "staff") return fail("Forbidden", 403);

  const { code, label, seats, section } = await readBody<{
    code?: string; label?: string; seats?: number; section?: string;
  }>(req);

  // auto-generate next code T9, T10, … if not provided
  let finalCode = code?.trim();
  if (!finalCode) {
    const all = await db.tableToken.findMany({ orderBy: { code: "asc" } });
    const nums = all.map((t) => parseInt(t.code.replace(/[^0-9]/g, ""), 10)).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    finalCode = `T${next}`;
  }

  const existing = await db.tableToken.findUnique({ where: { code: finalCode } });
  if (existing) return fail(`Table code ${finalCode} already exists`, 409);

  const table = await db.tableToken.create({
    data: {
      code: finalCode,
      label: label?.trim() || "Table",
      seats: seats && seats > 0 ? seats : 4,
      section: section?.trim() || null,
      qrToken: `QR-${finalCode}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  await emitRealtime(RT.TABLES_CHANGED, { tableId: table.id, action: "added" });
  return ok({ table });
}

// DELETE — remove a table (owner-only). Blocked if it has live orders.
export async function DELETE(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);

  const url = new URL(req.url);
  const tableId = url.searchParams.get("id");
  if (!tableId) return fail("id query param required", 422);

  const liveOrders = await db.order.count({
    where: { tableId, status: { in: ["NEW", "COOKING", "READY", "SERVED"] } },
  });
  if (liveOrders > 0) return fail(`Cannot delete: table has ${liveOrders} live order(s)`, 409);

  await db.tableToken.delete({ where: { id: tableId } });
  await emitRealtime(RT.TABLES_CHANGED, { tableId, action: "removed" });
  return ok({ deleted: tableId });
}
