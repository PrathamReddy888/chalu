"use client";
import { create } from "zustand";

export type AppView =
  | "landing"
  | "menu"
  | "myorder"
  | "kitchen"
  | "waiter"
  | "dashboard"
  | "login";

export type DashTab =
  | "overview"
  | "live"
  | "tables"
  | "inventory"
  | "staff"
  | "customers"
  | "sales"
  | "analytics"
  | "forecast";

/** Which of the four apps the person is in. Derived from user.role when logged in,
 *  or explicitly chosen on the landing page (guest customer browsing). */
export type Persona = "customer" | "kitchen" | "waiter" | "owner";

interface ViewState {
  view: AppView;
  dashTab: DashTab;
  /** set after a successful login or when a guest picks the customer CTA */
  persona: Persona | null;
  /** when a role-gated CTA is clicked pre-login, we remember where to land */
  pendingPersona: Persona | null;
  setView: (v: AppView) => void;
  setDashTab: (t: DashTab) => void;
  setPersona: (p: Persona | null) => void;
  setPendingPersona: (p: Persona | null) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  view: "landing",
  dashTab: "overview",
  persona: null,
  pendingPersona: null,
  setView: (v) => set({ view: v }),
  setDashTab: (t) => set({ dashTab: t }),
  setPersona: (p) => set({ persona: p }),
  setPendingPersona: (p) => set({ pendingPersona: p }),
}));
