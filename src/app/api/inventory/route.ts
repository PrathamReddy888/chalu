import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// GET — list inventory with low-stock flags (kitchen/owner)
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "kitchen" && payload.role !== "owner") return fail("Forbidden", 403);
  const items = await db.ingredient.findMany({ include: { dishes: { include: { menuItem: true } } }, orderBy: { name: "asc" } });
  return ok({ items });
}

// PATCH — update stock level / availability; 86'ing an ingredient cascades to its dishes.
export async function PATCH(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "kitchen" && payload.role !== "owner") return fail("Forbidden", 403);

  const { ingredientId, stockLevel, available } = await readBody<{
    ingredientId: string; stockLevel?: number; available?: boolean;
  }>(req);
  if (!ingredientId) return fail("ingredientId required", 422);

  const data: Record<string, unknown> = {};
  if (typeof stockLevel === "number") data.stockLevel = Math.max(0, stockLevel);
  if (typeof available === "boolean") data.available = available;

  const ingredient = await db.ingredient.update({ where: { id: ingredientId }, data });

  // Cascade: if an ingredient goes unavailable, 86 every dish that uses it.
  if (available === false) {
    const links = await db.menuItemIngredient.findMany({
      where: { ingredientId },
      include: { menuItem: true },
    });
    for (const link of links) {
      if (link.menuItem.available) {
        const updated = await db.menuItem.update({
          where: { id: link.menuItemId },
          data: { available: false, eightySixAt: new Date() },
        });
        await emitRealtime(RT.MENU_AVAILABILITY, { menuItemId: updated.id, available: false, name: updated.name });
        await emitRealtime(RT.KOT_86, { menuItemId: updated.id, name: updated.name, available: false });
      }
    }
  }

  return ok({ ingredient });
}
