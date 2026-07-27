import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET() {
  const items = await db.menuItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { ingredients: { include: { ingredient: true } } },
  });
  return ok({ items });
}
