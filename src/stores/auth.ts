"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "customer" | "staff" | "kitchen" | "owner";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tableId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      hydrate: () => set({}),
    }),
    { name: "chalu-auth" },
  ),
);
