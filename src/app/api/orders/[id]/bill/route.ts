import { db } from "@/lib/db";
import { ok, fail, readBody } from "@/lib/api";

// GET — fetch a single bill (itemized with GST split). Public by table QR token.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, table: true },
  });
  if (!order) return fail("Order not found", 404);
  return ok({ order });
}

// PATCH — mark paid / set payment mode.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { paid, paymentMode } = await readBody<{ paid?: boolean; paymentMode?: string }>(req);
  const order = await db.order.update({
    where: { id },
    data: {
      ...(typeof paid === "boolean" ? { paid, status: paid ? "CLOSED" : undefined, closedAt: paid ? new Date() : undefined } : {}),
      ...(paymentMode ? { paymentMode } : {}),
    },
    include: { items: true, table: true },
  });
  if (paid && order.tableId) {
    await db.tableToken.update({ where: { id: order.tableId }, data: { status: "cleaning" } });
  }
  return ok({ order });
}
