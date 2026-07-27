import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// GET — list all active assignments (with staff + table info)
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "staff" && payload.role !== "kitchen")
    return fail("Forbidden", 403);

  const assignments = await db.tableAssignment.findMany({
    where: { active: true },
    include: { table: true, user: { select: { id: true, name: true, role: true } } },
    orderBy: { assignedAt: "desc" },
  });
  return ok({ assignments });
}

// POST — assign a staff member to a table (replaces any existing active assignment for that table)
export async function POST(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "staff")
    return fail("Forbidden", 403);

  const { tableId, userId } = await readBody<{ tableId?: string; userId?: string }>(req);
  if (!tableId || !userId) return fail("tableId and userId required", 422);

  // deactivate any existing active assignment for this table
  await db.tableAssignment.updateMany({ where: { tableId, active: true }, data: { active: false } });

  const table = await db.tableToken.findUnique({ where: { id: tableId } });
  const assignment = await db.tableAssignment.create({
    data: { tableId, userId, section: table?.section ?? null, active: true },
    include: { user: { select: { id: true, name: true, role: true } }, table: true },
  });

  await emitRealtime(RT.STAFF_ASSIGNMENT, {
    tableId, userId, userName: assignment.user.name, tableCode: table?.code,
  });
  return ok({ assignment });
}

// DELETE — unassign (deactivate) the active assignment for a table
export async function DELETE(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "staff")
    return fail("Forbidden", 403);

  const url = new URL(req.url);
  const tableId = url.searchParams.get("tableId");
  if (!tableId) return fail("tableId query param required", 422);

  await db.tableAssignment.updateMany({ where: { tableId, active: true }, data: { active: false } });
  await emitRealtime(RT.STAFF_ASSIGNMENT, { tableId, userId: null, userName: null });
  return ok({ unassigned: tableId });
}
