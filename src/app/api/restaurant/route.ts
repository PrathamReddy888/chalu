import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";

// GET — public restaurant profile (incl. reservationsEnabled flag for the walk-up scan flow)
export async function GET() {
  const restaurant = await db.restaurant.findFirst({
    select: {
      id: true, name: true, nameHi: true, tagline: true,
      address: true, phone: true, gstRate: true, reservationsEnabled: true,
    },
  });
  if (!restaurant) return fail("Restaurant not configured", 404);
  return ok({ restaurant });
}

// PATCH — owner-only: toggle restaurant settings (e.g. reservationsEnabled)
export async function PATCH(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner") return fail("Forbidden", 403);

  const { reservationsEnabled } = await readBody<{ reservationsEnabled?: boolean }>(req);
  const data: Record<string, unknown> = {};
  if (typeof reservationsEnabled === "boolean") data.reservationsEnabled = reservationsEnabled;

  const restaurant = await db.restaurant.findFirst();
  if (!restaurant) return fail("Restaurant not configured", 404);

  const updated = await db.restaurant.update({ where: { id: restaurant.id }, data });
  return ok({
    restaurant: {
      id: updated.id, name: updated.name, nameHi: updated.nameHi, tagline: updated.tagline,
      address: updated.address, phone: updated.phone, gstRate: updated.gstRate,
      reservationsEnabled: updated.reservationsEnabled,
    },
  });
}
