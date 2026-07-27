"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
  }
  return socket;
}

/** Subscribe to a Chalu realtime event. Returns an unsubscribe fn. */
export function on<T = unknown>(event: string, cb: (payload: T) => void): () => void {
  const s = getSocket();
  const handler = (p: T) => cb(p);
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}

export function identify(role: string) {
  const s = getSocket();
  if (s.connected) s.emit("identify", { role });
  else s.on("connect", () => s.emit("identify", { role }));
}
