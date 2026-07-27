"use client";
import { useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type DashTab } from "@/stores/view";
import { StatusPill } from "@/components/kot";
import { t } from "@/lib/i18n";
import { OwnerHome, LiveOrdersTab, TablesTab, InventoryTab, StaffTab, CustomersTab, SalesTab, AnalyticsTab, ForecastTab } from "./admin-tabs";

export function AdminDashboard() {
  const { locale } = useLocaleStore();
  const { dashTab, setDashTab } = useViewStore();
  const [version, setVersion] = useState(0);

  // Overview is the home; the rest are deeper dashboards one click away.
  const tabs: { key: DashTab; label: string }[] = [
    { key: "overview", label: locale === "en" ? "Overview" : "ओवरव्यू" },
    { key: "live", label: locale === "en" ? "Live orders" : "लाइव ऑर्डर" },
    { key: "tables", label: t("nav_tables", locale) },
    { key: "inventory", label: t("nav_inventory", locale) },
    { key: "sales", label: t("nav_sales", locale) },
    { key: "analytics", label: t("nav_analytics", locale) },
    { key: "forecast", label: locale === "en" ? "AI forecast" : "AI पूर्वानुमान" },
    { key: "staff", label: t("nav_staff", locale) },
    { key: "customers", label: t("nav_customers", locale) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{locale === "en" ? "Owner" : "मालिक"}</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-clay">
            {dashTab === "overview"
              ? (locale === "en" ? "today, at a glance" : "आज, एक नज़र में")
              : (locale === "en" ? "deeper view — back to overview any time" : "विस्तृत दृश्य — कभी भी ओवरव्यू पर") }
          </p>
        </div>
        <StatusPill tone="ready" size="sm">{locale === "en" ? "live" : "लाइव"}</StatusPill>
      </div>

      {/* Tab nav — refined pill strip, scrollable on mobile */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto border-b border-ink/10 pb-2 no-scrollbar">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setDashTab(tb.key); setVersion((v) => v + 1); }}
            className={`press shrink-0 rounded-full px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition ${
              dashTab === tb.key ? "bg-ink text-paper" : "text-ink hover:bg-paper-deep"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div key={`${dashTab}-${version}`}>
        {dashTab === "overview" && <OwnerHome />}
        {dashTab === "live" && <LiveOrdersTab />}
        {dashTab === "tables" && <TablesTab />}
        {dashTab === "inventory" && <InventoryTab />}
        {dashTab === "sales" && <SalesTab />}
        {dashTab === "analytics" && <AnalyticsTab />}
        {dashTab === "forecast" && <ForecastTab />}
        {dashTab === "staff" && <StaffTab />}
        {dashTab === "customers" && <CustomersTab />}
      </div>
    </div>
  );
}
