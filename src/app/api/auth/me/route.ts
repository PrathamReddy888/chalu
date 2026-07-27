import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user) return fail("User not found", 404);
  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
}
