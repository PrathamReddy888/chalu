import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

const FLOW: Record<string, string | null> = {
  NEW: "COOKING",
  COOKING: "READY",
  READY: "SERVED",
  SERVED: "CLOSED",
  CLOSED: null,
};

// PATCH — advance KOT status (NEW→COOKING→READY→SERVED→CLOSED) or set explicit status.
// Kitchen/staff/owner. Emits kot:status + customer notification on transitions.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "kitchen" && payload.role !== "staff" && payload.role !== "owner")
    return fail("Only staff can advance ticket status", 403);

  const { id } = await ctx.params;
  const { status: explicit, itemId, itemStatus } = await readBody<{
    status?: string; itemId?: string; itemStatus?: string;
  }>(req);

  const order = await db.order.findUnique({ where: { id }, include: { items: true, table: true } });
  if (!order) return fail("Order not found", 404);

  // Optional: per-item status (e.g. one dish READY before others)
  if (itemId && itemStatus) {
    await db.orderItem.update({ where: { id: itemId }, data: { status: itemStatus } });
  }

  let nextStatus = explicit ?? FLOW[order.status] ?? null;
  if (!nextStatus) return fail("No next status available", 422);

  const now = new Date();
  const data: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "COOKING" && !order.cookingAt) data.cookingAt = now;
  if (nextStatus === "READY" && !order.readyAt) data.readyAt = now;
  if (nextStatus === "SERVED" && !order.servedAt) data.servedAt = now;
  if (nextStatus === "CLOSED") data.closedAt = now;

  // When served/closed, bump all items to match
  if (nextStatus === "SERVED" || nextStatus === "CLOSED") {
    await db.orderItem.updateMany({ where: { orderId: id }, data: { status: nextStatus === "CLOSED" ? "SERVED" : "SERVED" } });
  } else if (nextStatus === "COOKING") {
    await db.orderItem.updateMany({ where: { orderId: id, status: "NEW" }, data: { status: "COOKING" } });
  } else if (nextStatus === "READY") {
    await db.orderItem.updateMany({ where: { orderId: id, status: "COOKING" }, data: { status: "READY" } });
  }

  const updated = await db.order.update({ where: { id }, data, include: { items: true, table: true } });

  // Free the table when closed
  if (nextStatus === "CLOSED" && order.tableId) {
    await db.tableToken.update({ where: { id: order.tableId }, data: { status: "cleaning" } });
  }

  await emitRealtime(RT.KOT_STATUS, {
    orderId: updated.id,
    kotNumber: updated.kotNumber,
    status: updated.status,
    cookingAt: updated.cookingAt,
    readyAt: updated.readyAt,
    servedAt: updated.servedAt,
    tableCode: updated.table?.code,
  });

  // Notify the customer on the meaningful beats
  const tableLabel = updated.table?.code ? `Table ${updated.table.code}` : updated.customerName;
  const notifs: Record<string, { title: string; body: string }> = {
    COOKING: { title: `Ticket #${updated.kotNumber} is cooking`, body: `${tableLabel}'s order is on the flame.` },
    READY: { title: `Ticket #${updated.kotNumber} ready!`, body: `${tableLabel} — your food is on the pass.` },
    SERVED: { title: `Ticket #${updated.kotNumber} served`, body: `${tableLabel}, enjoy your meal.` },
  };
  if (notifs[nextStatus]) {
    await emitRealtime(RT.NOTIFICATION, { target: tableLabel, ...notifs[nextStatus] });
  }

  // Staff coordination: when kitchen marks READY, auto-fire a "ready" alert to the
  // waiter assigned to that table (if any), so they know to run the food.
  if (nextStatus === "READY" && order.tableId) {
    const assignment = await db.tableAssignment.findFirst({
      where: { tableId: order.tableId, active: true },
      include: { user: { select: { id: true, name: true } } },
    });
    if (assignment) {
      const alert = await db.staffAlert.create({
        data: {
          fromUserId: payload.sub,
          fromName: payload.name,
          toUserId: assignment.userId,
          toRole: "staff",
          tableId: order.tableId,
          type: "ready",
          message: `Ticket #${updated.kotNumber} ready — Table ${updated.table?.code ?? "?"}`,
        },
      });
      await emitRealtime(RT.STAFF_ALERT, {
        alert: { ...alert, table: { code: updated.table?.code ?? null, label: null } },
      });
    }
  }

  return ok({ order: updated });
}
