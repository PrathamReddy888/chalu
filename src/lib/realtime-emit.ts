/**
 * Server-side realtime emit — called from Next.js API routes to fan out
 * a state change to all connected browsers via the realtime mini-service.
 */
export async function emitRealtime(event: string, payload: unknown): Promise<void> {
  try {
    await fetch("http://localhost:3003/emit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  } catch (e) {
    // realtime is best-effort; never fail a write because the fan-out failed
    console.error("[realtime-emit] failed:", e);
  }
}

export const RT = {
  MENU_AVAILABILITY: "menu:availability", // { menuItemId, available, name }
  KOT_NEW: "kot:new", // { order }
  KOT_STATUS: "kot:status", // { orderId, kotNumber, status, itemStatuses? }
  KOT_86: "kot:86", // { menuItemId, name, available }
  QUEUE_UPDATE: "queue:update", // { entries }
  NOTIFICATION: "notify", // { target, title, body }
  STAFF_ALERT: "staff:alert", // { alert } — new alert for a role/user
  STAFF_ALERT_RESOLVE: "staff:alert:resolve", // { id }
  STAFF_ASSIGNMENT: "staff:assignment", // { tableId, userId, userName } — assignment changed
  TABLES_CHANGED: "tables:changed", // { } — a table was added/removed/renamed
  BREACH: "breach", // { orderId, kotNumber, tableCode, minutesOver, severity }
} as const;
