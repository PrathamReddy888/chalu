import { forecastDemand } from "@/lib/ai";
import { getUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

// GET /api/forecast — owner/kitchen only
export async function GET(req: Request) {
  const payload = await getUserFromRequest(req);
  if (!payload) return fail("Unauthorized", 401);
  if (payload.role !== "owner" && payload.role !== "kitchen") return fail("Forbidden", 403);
  const forecast = await forecastDemand();
  return ok(forecast);
}
