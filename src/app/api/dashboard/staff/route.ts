import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";

export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);
  const staff = await db.user.findMany({
    where: { role: { in: ["staff", "kitchen", "owner"] } },
    orderBy: { role: "asc" },
  });
  const shifts = await db.staffShift.findMany({
    where: { end: null },
    include: { user: true },
    orderBy: { start: "desc" },
  });
  return ok({
    staff: staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, phone: s.phone })),
    onShift: shifts.map((s) => ({ id: s.id, name: s.user.name, role: s.role, station: s.station, start: s.start })),
  });
}

// POST — hire a new staff member (owner-only). Creates an account with a temp password.
export async function POST(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);

  const { name, email, role, phone, tempPassword } = await readBody<{
    name?: string; email?: string; role?: string; phone?: string; tempPassword?: string;
  }>(req);

  if (!name || !email) return fail("Name and email required", 422);
  const finalRole = ["staff", "kitchen"].includes(role ?? "") ? role! : "staff";
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return fail("An account with this email already exists", 409);

  const passwordHash = await hashPassword(tempPassword || "chalu123");
  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      role: finalRole,
      phone: phone || null,
      passwordHash,
    },
  });

  return ok({
    staff: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    tempPassword: tempPassword || "chalu123",
  });
}

// DELETE — fire a staff member (owner-only). Blocks firing owners or self.
export async function DELETE(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);

  const url = new URL(req.url);
  const userId = url.searchParams.get("id");
  if (!userId) return fail("id query param required", 422);
  if (userId === payload.sub) return fail("You can't fire yourself", 422);

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return fail("User not found", 404);
  if (target.role === "owner") return fail("Can't fire an owner", 422);

  // Deactivate their active table assignments first (clean handoff)
  await db.tableAssignment.updateMany({ where: { userId, active: true }, data: { active: false } });

  await db.user.delete({ where: { id: userId } });
  return ok({ fired: userId });
}
