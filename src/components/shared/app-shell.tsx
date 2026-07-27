"use client";
import { useViewStore } from "@/stores/view";
import { useAuthStore } from "@/stores/auth";
import { TopBar } from "./topbar";
import { Landing } from "@/components/customer/landing";
import { MenuView } from "@/components/customer/menu-view";
import { MyOrder } from "@/components/customer/my-order";
import { AuthView } from "@/components/auth/auth-view";
import { KitchenView } from "@/components/kitchen/kitchen-view";
import { WaiterView } from "@/components/waiter/waiter-view";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AiChatWidget } from "@/components/customer/ai-chat-widget";
import { Footer } from "./footer";
import { Suspense, useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { api } from "@/lib/api-client";
import { useSession } from "next-auth/react";

export function AppShell() {
  const { view, setView, persona, setPersona } = useViewStore();
  const { user, setAuth } = useAuthStore();
  const setTable = useCartStore((s) => s.setTable);
  const { data: session, status } = useSession();

  // ---- Google OAuth bridge: when a NextAuth session appears, exchange it for
  //      the app's own JWT (same shape as email/password login) and route by role.
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    // Only bridge once per session — if we already have an app user, skip.
    if (user) return;
    (async () => {
      try {
        const res = await api<{ user: any; token: string }>("/api/auth/exchange-session");
        setAuth(res.user, res.token);
        const role = res.user.role;
        if (role === "kitchen") { setPersona("kitchen"); setView("kitchen"); }
        else if (role === "staff") { setPersona("waiter"); setView("waiter"); }
        else if (role === "owner") { setPersona("owner"); setView("dashboard"); }
        else { setPersona("customer"); setView("menu"); }
      } catch {
        /* exchange will fail if session isn't a real google-backed one; ignore */
      }
    })();
  }, [status, session, user, setAuth, setPersona, setView]);

  // ---- QR table ordering: ?table=CODE or /table/:id or /t/:id → pre-select that table + jump to menu
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let tableCode = params.get("table");
    // also support path-based deep links: /table/T5 or /t/T5
    if (!tableCode) {
      const m = window.location.pathname.match(/^\/(?:table|t)\/([^/]+)/i);
      if (m) tableCode = decodeURIComponent(m[1]);
    }
    if (tableCode) {
      api<{ tables: { id: string; code: string; label: string; seats: number; status: string }[] }>("/api/tables")
        .then((d) => {
          const match = d.tables.find((t) => t.code.toLowerCase() === tableCode!.toLowerCase());
          if (match) {
            setTable(match.id);
            setPersona("customer");
            setView("menu");
          }
        })
        .catch(() => {});
    }
  }, [setTable, setView, setPersona]);

  // ---- Sync persona from logged-in user on mount + when user changes
  useEffect(() => {
    if (user?.role === "kitchen") setPersona("kitchen");
    else if (user?.role === "staff") setPersona("waiter");
    else if (user?.role === "owner") setPersona("owner");
    else if (user?.role === "customer") setPersona("customer");
  }, [user, setPersona]);

  // ---- NextAuth error redirect: if ?error= is in the URL (from a failed OAuth callback),
  //      route to the login view so the auth-view can display the error message.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error && view === "landing") {
      setView("login");
    }
  }, []); // run once on mount

  // ---- Gate protected views: if a non-customer view is requested without auth, go to login
  useEffect(() => {
    const protectedView = view === "kitchen" || view === "waiter" || view === "dashboard";
    if (protectedView && !user) {
      useViewStore.getState().setView("login");
    }
  }, [view, user]);

  // AI chat only on customer-facing surfaces
  const showChat = persona === "customer" && (view === "menu" || view === "myorder");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1">
        {view === "landing" && <Landing />}
        {view === "menu" && <MenuView />}
        {view === "myorder" && <MyOrder />}
        {view === "login" && (
          <Suspense fallback={<div className="py-16 text-center font-mono text-xs uppercase tracking-wider text-clay">Loading…</div>}>
            <AuthView />
          </Suspense>
        )}
        {view === "kitchen" && (user ? <KitchenView /> : <AuthView />)}
        {view === "waiter" && (user ? <WaiterView /> : <AuthView />)}
        {view === "dashboard" && (user ? <AdminDashboard /> : <AuthView />)}
      </main>
      {showChat && <AiChatWidget />}
      <Footer persona={persona} />
    </div>
  );
}
