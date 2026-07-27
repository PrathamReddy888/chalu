"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket, on, identify } from "@/lib/realtime-client";

export function useRealtimeConnected() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = getSocket();
    const sync = () => setConnected(s.connected);
    sync();
    s.on("connect", sync);
    s.on("disconnect", sync);
    return () => {
      s.off("connect", sync);
      s.off("disconnect", sync);
    };
  }, []);
  return connected;
}

/** Subscribe to a Chalu realtime event for the component's lifetime. */
export function useRealtimeEvent<T = unknown>(event: string, cb: (payload: T) => void) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => {
    const off = on<T>(event, (p) => cbRef.current(p));
    return off;
  }, [event]);
}

export function useIdentify(role: string) {
  useEffect(() => {
    identify(role);
  }, [role]);
}
