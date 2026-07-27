"use client";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type AppView, type Persona } from "@/stores/view";
import { useAuthStore } from "@/stores/auth";
import { PressButton, StatusPill } from "@/components/kot";
import { t } from "@/lib/i18n";
import { Wifi, Flame, Utensils, ChefHat, Crown, LogOut, ConciergeBell } from "lucide-react";
import { useRealtimeConnected } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

/** Resolve the active persona: logged-in role wins, else the guest-chosen persona.
 *  Staff (waiter) is its OWN persona now — not folded into owner. */
function usePersona(): Persona | null {
  const user = useAuthStore((s) => s.user);
  const persona = useViewStore((s) => s.persona);
  if (user?.role === "kitchen") return "kitchen";
  if (user?.role === "staff") return "waiter";
  if (user?.role === "owner") return "owner";
  if (user?.role === "customer") return "customer";
  return persona;
}

const PERSONA_META: Record<Persona, { label: string; accent: string; chip: string; icon: typeof Flame }> = {
  customer: { label: "Customer", accent: "accent-customer", chip: "text-chili bg-chili/10 border-chili/25", icon: Utensils },
  kitchen: { label: "Kitchen", accent: "accent-kitchen", chip: "text-ink bg-marigold/20 border-marigold/40", icon: ChefHat },
  waiter: { label: "Waiter", accent: "accent-waiter", chip: "text-ink bg-chili/12 border-chili/30", icon: ConciergeBell },
  owner: { label: "Owner", accent: "accent-owner", chip: "text-curry-leaf bg-curry-leaf/12 border-curry-leaf/30", icon: Crown },
};

export function TopBar() {
  const { locale, toggle } = useLocaleStore();
  const { view, setView } = useViewStore();
  const { user, logout } = useAuthStore();
  const connected = useRealtimeConnected();
  const persona = usePersona();

  // Role-specific nav items — each persona sees ONLY what they need.
  const navByPersona: Record<Persona, { key: AppView; label: string }[]> = {
    customer: [
      { key: "menu", label: t("nav_menu", locale) },
      { key: "myorder", label: t("nav_orders", locale) },
    ],
    kitchen: [
      { key: "kitchen", label: t("nav_kitchen", locale) },
    ],
    waiter: [
      { key: "waiter", label: locale === "en" ? "My tables" : "मेरे टेबल" },
    ],
    owner: [
      { key: "dashboard", label: locale === "en" ? "Overview" : "ओवरव्यू" },
      { key: "kitchen", label: t("nav_kitchen", locale) },
    ],
  };

  const navItems = persona ? navByPersona[persona] : [];
  const meta = persona ? PERSONA_META[persona] : null;
  const PersonaIcon = meta?.icon ?? Flame;

  const goHome = () => {
    if (persona === "customer") setView("menu");
    else if (persona === "kitchen") setView("kitchen");
    else if (persona === "waiter") setView("waiter");
    else if (persona === "owner") setView("dashboard");
    else setView("landing");
  };

  // Persistent role entry points — reachable from every page.
  // Unauthed → that role's login; authed with a matching role → straight to its home.
  const enterKitchen = () => {
    if (user?.role === "kitchen" || user?.role === "owner" || user?.role === "staff") {
      useViewStore.getState().setPersona("kitchen");
      setView("kitchen");
    } else {
      useViewStore.getState().setPendingPersona("kitchen");
      setView("login");
    }
  };
  const enterWaiter = () => {
    if (user?.role === "staff") {
      useViewStore.getState().setPersona("waiter");
      setView("waiter");
    } else if (user?.role === "owner") {
      // owner can preview the waiter floor, but owners default to their own dashboard
      useViewStore.getState().setPersona("waiter");
      setView("waiter");
    } else {
      useViewStore.getState().setPendingPersona("waiter");
      setView("login");
    }
  };
  const enterOwner = () => {
    if (user?.role === "owner") {
      useViewStore.getState().setPersona("owner");
      setView("dashboard");
    } else {
      useViewStore.getState().setPendingPersona("owner");
      setView("login");
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-ink/10 bg-paper/92 backdrop-blur-md",
        meta?.accent,
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:px-5">
        {/* Brand */}
        <button
          onClick={goHome}
          className="flex items-center gap-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-marigold rounded-[6px]"
          aria-label="Chalu home"
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-[8px]"
            style={{ background: "var(--color-chili)", color: "white" }}
          >
            <Flame className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl leading-none tracking-tight">{t("brand", locale)}</span>
        </button>

        {/* Persistent role label — unmistakable which app you're in */}
        {meta && (
          <span
            className={cn(
              "ml-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-wide",
              meta.chip,
            )}
          >
            <PersonaIcon className="h-3 w-3" />
            <span>{meta.label}</span>
          </span>
        )}

        {/* Live connection — quiet, only when relevant */}
        {persona && (
          <span className="hidden items-center md:inline-flex">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                connected ? "text-curry-leaf bg-curry-leaf/10" : "text-chili bg-chili/10",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-curry-leaf" : "bg-chili")} />
              {connected ? "live" : "off"}
            </span>
          </span>
        )}

        <nav className="ml-auto flex items-center gap-1">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={cn(
                "press hidden h-9 rounded-[8px] px-3 font-display text-xs font-semibold uppercase tracking-wide sm:inline-flex sm:items-center",
                view === n.key
                  ? "bg-ink text-paper"
                  : "text-ink hover:bg-paper-deep",
              )}
            >
              {n.label}
            </button>
          ))}

          {/* Mobile compact nav for persona items */}
          {persona && (
            <select
              value={view}
              onChange={(e) => setView(e.target.value as AppView)}
              className="h-9 rounded-[8px] border-2 border-ink bg-paper px-1.5 font-mono text-xs sm:hidden"
              aria-label="Navigate"
            >
              {navItems.map((n) => (
                <option key={n.key} value={n.key}>
                  {n.label}
                </option>
              ))}
            </select>
          )}

          {/* Persistent role entry points — Kitchen + Waiter + Owner, on EVERY page (incl. landing, incl. mobile).
              Three labeled links, not folded under "Staff". Unauthed → role login; authed → straight to its home. */}
          <div className="ml-1 flex items-center gap-1">
            <RoleEntry icon={ChefHat} label={t("nav_kitchen", locale)} active={persona === "kitchen"} onClick={enterKitchen} />
            <RoleEntry icon={ConciergeBell} label={locale === "en" ? "Waiter" : "वेटर"} active={persona === "waiter"} onClick={enterWaiter} />
            <RoleEntry icon={Crown} label={locale === "en" ? "Owner" : "मालिक"} active={persona === "owner"} onClick={enterOwner} />
          </div>

          <PressButton
            variant="ghost"
            size="sm"
            shadow={false}
            className="hidden md:inline-flex"
            onClick={toggle}
            aria-label="Toggle language"
          >
            {locale === "en" ? "EN / हि" : "हि / EN"}
          </PressButton>

          {user ? (
            <div className="ml-1 flex items-center gap-1.5">
              <span className="hidden font-mono text-[11px] text-clay lg:inline">{user.name}</span>
              <PressButton
                variant="chalk"
                size="sm"
                onClick={() => {
                  logout();
                  useViewStore.getState().setPersona(null);
                  setView("landing");
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("nav_logout", locale)}</span>
              </PressButton>
            </div>
          ) : (
            !persona && (
              <PressButton variant="chili" size="sm" className="ml-1" onClick={() => setView("login")}>
                {t("nav_login", locale)}
              </PressButton>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

/** Persistent role-entry chip in the header — always-visible path into Kitchen/Owner apps.
 *  Icon always shows; label shows from the `sm` breakpoint up so it fits on every screen. */
function RoleEntry({
  icon: Icon, label, active, onClick,
}: {
  icon: typeof Flame; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press-soft inline-flex h-9 items-center gap-1.5 rounded-[8px] border-2 px-2.5 font-display text-xs font-semibold uppercase tracking-wide",
        active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper text-ink hover:border-ink/40 hover:bg-paper-deep",
      )}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
