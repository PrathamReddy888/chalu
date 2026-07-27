import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// PATCH — resolve an alert
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);

  const { id } = await ctx.params;
  const alert = await db.staffAlert.update({
    where: { id },
    data: { resolved: true, resolvedAt: new Date(), resolvedBy: payload.sub },
  });
  await emitRealtime(RT.STAFF_ALERT_RESOLVE, { id });
  return ok({ alert });
}
