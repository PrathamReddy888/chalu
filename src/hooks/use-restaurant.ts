"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface RestaurantInfo {
  id: string;
  name: string;
  nameHi: string;
  tagline: string;
  address: string;
  phone: string;
  gstRate: number;
  reservationsEnabled: boolean;
}

/** Fetches the restaurant profile (incl. the reservationsEnabled feature flag). */
export function useRestaurant() {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<{ restaurant: RestaurantInfo }>("/api/restaurant")
      .then((d) => { if (!cancelled) setInfo(d.restaurant); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { info, loading };
}
