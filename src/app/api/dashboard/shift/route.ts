import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

// GET — shared shift view: who's on now, their active assignments + tables
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "staff" && payload.role !== "kitchen")
    return fail("Forbidden", 403);

  // active staff (staff + kitchen + owner) — for a real shift system we'd join StaffShift,
  // but for the demo we treat all non-customer accounts as potentially on shift.
  const staff = await db.user.findMany({
    where: { role: { in: ["staff", "kitchen", "owner"] } },
    select: { id: true, name: true, role: true, email: true },
    orderBy: { role: "asc" },
  });

  const assignments = await db.tableAssignment.findMany({
    where: { active: true },
    include: { table: { select: { id: true, code: true, label: true, section: true, status: true } } },
  });

  // group: per staff member, their tables
  const byStaff = staff.map((s) => ({
    ...s,
    tables: assignments.filter((a) => a.userId === s.id).map((a) => a.table),
    load: assignments.filter((a) => a.userId === s.id).length,
  }));

  // unassigned tables
  const assignedTableIds = new Set(assignments.map((a) => a.tableId));
  const allTables = await db.tableToken.findMany({ orderBy: { code: "asc" } });
  const unassigned = allTables.filter((t) => !assignedTableIds.has(t.id));

  return ok({ staff: byStaff, unassigned });
}
