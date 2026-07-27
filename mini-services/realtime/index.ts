/**
 * Chalu realtime service — Socket.IO on port 3003.
 * Powers two live channels:
 *   - "menu:availability"  → 86'd-item sync to every customer screen
 *   - "kot:feed"            → KOT ticket print-in + status changes
 *
 * The Next.js API routes emit into this service via an internal HTTP emit endpoint
 * (POST /emit) so server-side writes can fan out to all connected clients.
 * Caddy forwards browser socket traffic via /?XTransformPort=3003.
 */
import { createServer, type IncomingMessage } from "http";
import { Server, Socket } from "socket.io";

const httpServer = createServer(async (req: IncomingMessage, res) => {
  // Internal emit endpoint (called by Next.js API routes, localhost only)
  if (req.method === "POST" && req.url === "/emit") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { event, payload } = JSON.parse(body);
      if (event && typeof event === "string") {
        io.emit(event, payload);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, delivered: io.engine.clientsCount }));
        return;
      }
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "bad payload" }));
      return;
    }
  }
  res.writeHead(404);
  res.end("not found");
});

const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const clients = new Map<string, { role: string; joinedAt: Date }>();

io.on("connection", (socket: Socket) => {
  clients.set(socket.id, { role: "anon", joinedAt: new Date() });

  socket.on("identify", (data: { role: string }) => {
    if (clients.has(socket.id)) {
      clients.get(socket.id)!.role = data?.role || "anon";
    }
    socket.emit("identified", { id: socket.id });
  });

  // Echo back a heartbeat so clients can show live-connection status
  socket.on("ping:chalu", () => socket.emit("pong:chalu", { t: Date.now() }));

  socket.on("disconnect", () => {
    clients.delete(socket.id);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`Chalu realtime service running on port ${PORT}`);
});

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
