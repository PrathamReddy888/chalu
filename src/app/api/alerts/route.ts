import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// GET — list alerts relevant to the current user (their direct alerts + their role's broadcasts)
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);

  const where = {
    resolved: false,
    OR: [
      { toUserId: payload.sub },
      { toRole: payload.role },
    ],
  };
  const alerts = await db.staffAlert.findMany({
    where,
    include: { table: { select: { code: true, label: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ alerts });
}

// POST — send a new alert
export async function POST(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);

  const { toUserId, toRole, tableId, type, message } = await readBody<{
    toUserId?: string | null; toRole?: string; tableId?: string | null; type?: string; message?: string;
  }>(req);

  if (!type) return fail("type required", 422);
  if (!toRole && !toUserId) return fail("toRole or toUserId required", 422);

  const alert = await db.staffAlert.create({
    data: {
      fromUserId: payload.sub,
      fromName: payload.name,
      toUserId: toUserId ?? null,
      toRole: toRole ?? "staff",
      tableId: tableId ?? null,
      type,
      message: message ?? "",
    },
    include: { table: { select: { code: true, label: true } } },
  });

  await emitRealtime(RT.STAFF_ALERT, { alert });
  await emitRealtime(RT.NOTIFICATION, {
    target: toUserId ?? toRole,
    title: alertLabel(type),
    body: message || (alert.table ? `Table ${alert.table.code}` : ""),
  });
  return ok({ alert });
}

function alertLabel(type: string): string {
  const map: Record<string, string> = {
    ready: "Order ready",
    water: "Table needs water",
    bill: "Table wants the bill",
    help: "Table needs help",
    breach: "Wait-time breach",
  };
  return map[type] ?? type;
}
