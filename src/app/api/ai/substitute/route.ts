import { suggestSubstitute } from "@/lib/ai";
import { ok, fail, readBody } from "@/lib/api";

// POST /api/ai/substitute — { dishName } → substitutes[]
export async function POST(req: Request) {
  const { dishName, reason } = await readBody<{ dishName?: string; reason?: string }>(req);
  if (!dishName) return fail("dishName required", 422);
  const substitutes = await suggestSubstitute(dishName, reason);
  return ok({ dishName, substitutes });
}
