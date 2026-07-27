"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import type { MenuContextItem } from "@/lib/ai";

export interface MenuItemView extends MenuContextItem {
  ingredients?: { ingredient: { id: string; name: string; nameHi: string; available: boolean; stockLevel: number } }[];
}

/** Fetches the menu and merges realtime availability overrides as they arrive. */
export function useMenu() {
  const [items, setItems] = useState<MenuItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // overrides: menuItemId -> available
  const overrides = useRef<Map<string, boolean>>(new Map());
  const [ovrTick, setOvrTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<{ items: MenuItemView[] }>("/api/menu");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // realtime: when a dish is 86'd/restocked, override local availability
  useRealtimeEvent<{ menuItemId: string; available: boolean; name: string }>(
    "menu:availability",
    (p) => {
      overrides.current.set(p.menuItemId, p.available);
      setItems((prev) => prev.map((m) => (m.id === p.menuItemId ? { ...m, available: p.available } : m)));
      setOvrTick((t) => t + 1);
    },
  );

  const refetch = load;
  return { items, loading, error, refetch, overridesVersion: ovrTick };
}
