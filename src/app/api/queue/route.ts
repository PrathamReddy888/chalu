import { db } from "@/lib/db";
import { ok, fail, readBody } from "@/lib/api";
import { emitRealtime, RT } from "@/lib/realtime-emit";

// GET — current queue with positions + quoted waits
export async function GET() {
  const entries = await db.queueEntry.findMany({
    where: { status: "WAITING" },
    orderBy: { position: "asc" },
  });
  const seated = await db.queueEntry.count({ where: { status: "SEATED" } });
  return ok({ entries, seatedToday: seated });
}

// POST — join the queue. Computes an honest wait estimate from live table turns.
export async function POST(req: Request) {
  const { name, phone, partySize } = await readBody<{ name?: string; phone?: string; partySize?: number }>(req);
  if (!name) return fail("Name required", 422);

  const waiting = await db.queueEntry.count({ where: { status: "WAITING" } });
  const freeSoon = await db.tableToken.count({ where: { status: { in: ["empty", "cleaning"] } } });
  // rough honest estimate: parties ahead * avg turn (35 min) / available stations, min 8
  const quotedWait = Math.max(8, Math.round(((waiting + 1) * 35) / Math.max(1, freeSoon + 1)));

  const entry = await db.queueEntry.create({
    data: {
      name, phone, partySize: partySize ?? 1, status: "WAITING",
      position: waiting + 1, quotedWait,
    },
  });
  await emitRealtime(RT.QUEUE_UPDATE, { joined: entry.id });
  return ok({ entry, quotedWait });
}
