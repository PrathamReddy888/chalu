import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// Toggle availability of a menu item (86 it / restock it).
// Kitchen + owner only. Cascades from ingredient 86 → dependent dishes.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "kitchen" && payload.role !== "owner") return fail("Only kitchen or owner can 86 items", 403);

  const { id } = await ctx.params;
  const { available } = await readBody<{ available: boolean }>(req);

  const item = await db.menuItem.update({
    where: { id },
    data: {
      available,
      eightySixAt: available ? null : new Date(),
    },
  });

  // Fan out to every customer + kitchen screen
  await emitRealtime(RT.MENU_AVAILABILITY, {
    menuItemId: item.id,
    available: item.available,
    name: item.name,
  });
  await emitRealtime(RT.KOT_86, { menuItemId: item.id, name: item.name, available: item.available });

  return ok({ item });
}
