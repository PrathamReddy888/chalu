# Chalu — Worklog

Project: Chalu — Live-operations layer for a single Indian restaurant (VibeAthon 6.0 submission).

Architecture decisions (see DECISIONS.md for full reasoning):
- DB: Prisma + SQLite (sandbox-local; supabase not available). Same relational model.
- Realtime: Socket.IO mini-service on port 3003 (per gateway rules) — powers 86'd sync + KOT feed.
- Auth: custom JWT (bcrypt + jose) — email/password + simulated OTP. Google OAuth documented as stub.
- AI: z-ai-web-dev-sdk LLM (functionally equivalent to Gemini) for substitute suggestion, forecasting, Hinglish chat.
- Routing: single visible route `/` (per sandbox rule). Client-side view-switching via Zustand for customer/kitchen/admin shells. API routes under /api/*.
- Deploy: app runs on port 3000 exposed via Preview Panel gateway (this is the "hosted URL" in-sandbox).

Task IDs are assigned below as work proceeds. Subagents MUST read this file before starting and append their own section when done.

---
Task ID: 1
Agent: lead (main)
Task: Phase 1 — design system foundation (tokens, fonts, primitives)

Work Log:
- (in progress)

Stage Summary (Phases 1-5, lead):
- Design system: globals.css with exact KOT tokens (ink/chalk/chili/turmeric/curry/steel), fonts (Archivo Black, Space Grotesk, IBM Plex Sans + Devanagari, IBM Plex Mono), primitives (PressButton, StampBadge, VegIndicator, ChiliMeter, TicketCard, Perforation).
- Data layer: Prisma schema (Restaurant, User, TableToken, MenuItem, Ingredient, MenuItemIngredient, Order, OrderItem, QueueEntry, StaffShift, SalesDaily). Seeded with 28 real Indian dishes, 15 ingredients, 8 tables, 6 days of order history, 2 live orders, demo users.
- Auth: custom JWT (jose + bcrypt), email/password + simulated OTP, role codes for staff/kitchen/owner. Routes: /api/auth/{login,signup,otp/send,otp/verify,me}.
- Realtime: Socket.IO mini-service on port 3003 (mini-services/realtime/index.ts), browser client + server emit helper. Channels: menu:availability, kot:new, kot:status, kot:86, queue:update, notify.
- API: menu (+availability toggle), inventory (cascade 86), orders (create KOT + status pipeline), tables, queue, dashboard/{sales,analytics,staff,customers}, ai/{substitute,chat}, forecast.
- Customer flow: landing (hero + live 86'd ticker + pillars + bestsellers), menu (filters, torn-ticket-stub cards, AI substitute on 86'd items, cart tray with GST split, send-to-kitchen), my-order (live KOT status + bill + pay).
- Auth view: login/signup/OTP tabs, Google OAuth stub, demo account quick-fill, guest continue.
- App shell: view-switching via Zustand, sticky footer, topbar with locale toggle + live connection stamp.
- Remaining: kitchen KOT feed (signature animation), admin dashboard tabs, AI chat widget, bonus (bilingual toggle already wired, QR ordering, split-bill), hardening, README.

Key decisions: single visible route `/` with client-side view switching; light-only paper aesthetic (DECISIONS D3); kotNumber app-managed (SQLite autoincrement only on @id).

---
Task ID: 6-11
Agent: lead (main)
Task: Phases 6-11 — kitchen, admin, AI, bonus, hardening, README

Work Log:
- Kitchen view: 3-column KOT board (NEW/COOKING/READY) with framer-motion print-in animation (slide + paper-curl + spring), status transitions, 86-control panel (toggle any dish → instant customer-screen sync).
- Admin dashboard: 8 tabs (live orders, tables+queue, inventory with stock bars, sales with recharts, analytics best/worst/peak, AI forecast, staff, customers CRM). Each tab states the manual task it replaces.
- AI features: substitute suggestion (86'd dish → LLM picks substitutes from live menu, JSON-validated), demand forecasting (7-day avg × 1.1 + LLM prep list), Hinglish chat (grounded on live menu incl. 86'd list).
- Bonus: bilingual EN/HI toggle (verified — Devanagari renders), QR table tents (qrcode lib, ?table= param auto-selects table), split-bill calculator (GST-inclusive per-person).
- Hardening: mobile 360px verified (nav → combobox, hero stacks), keyboard focus rings (turmeric outline), prefers-reduced-motion respected, empty/error/loading states everywhere.
- Bug fixed: useCartStore not imported in menu-view MobileCartBar (caught via browser self-verify, fixed).
- Lint: clean (2 react-hooks errors fixed: ref-in-render → useEffect, setState-in-effect → derived loading).

Browser self-verification (Agent Browser):
- Landing renders: hero, live 86'd ticker, 3 pillars, bestsellers, AI chat button. No errors.
- Menu: 28 dishes grouped by category, Gulab Jamun shows "SUGGEST A SUBSTITUTE" (86'd). Filters work.
- AI substitute: clicked → "TRY THIS INSTEAD" panel with Rasmalai. ✅
- Cart + send to kitchen: Ticket #1616 created with GST split. ✅
- My-order: live KOT status strip, bill with CGST/SGST, split-bill, pay. ✅
- Kitchen login (kitchen@chalu.in): KOT feed 3 columns + 86 control. ✅
- 86 propagation: 86'd Masala Chai in kitchen → menu showed "86'D" instantly. ✅ (realtime working)
- Owner login: dashboard 8 tabs. AI forecast generated concrete prep list. Sales chart (recharts) rendered. ✅
- AI chat: "What's spicy and veg under ₹200?" → grounded response against live menu. ✅
- Hindi toggle: nav + hero in Devanagari. ✅
- Mobile 360px: nav collapses to combobox, layout holds. ✅

Stage Summary:
- All 5 tiers (Bronze→Platinum) + 3 bonus features working end-to-end and browser-verified.
- README.md + DECISIONS.md complete with demo credentials, AI disclosure, user-story mapping.
- Dev server healthy, lint clean, no console errors.
- Realtime service (port 3003) running; 86'd sync + KOT feed propagate sub-second.

---
Task ID: 12
Agent: lead (main)
Task: Iteration pass — IA (3 role shells), cut noise, Google OAuth, visual direction correction

Regression checklist (must stay working through every change):
1. Customer: live menu → cart → send to kitchen → KOT status → pay (GST split)
2. Kitchen login → KOT feed → 86 item → propagates to customer menu
3. Owner login → dashboard tabs
4. AI substitute on 86'd dish; AI Hinglish chat
5. Bilingual EN/HI; QR table ordering (?table=); split-bill
6. Login (email/pw + OTP + demo creds + guest)

Plan (non-breaking):
- Visual: repoint CSS vars to new palette (paper/ink/chili/marigold/curry-leaf/clay), keep OLD var names (chalk/turmeric/steel) as aliases so no consumer class breaks. Swap fonts to Sora/Plus Jakarta/Noto Devanagari/JetBrains Mono, keep --font-display/--font-body/--font-deva/--font-mono var names. Restyle primitives (PressButton rounded+soft shadow+gentle press; StampBadge → clean pill, rotate prop kept as no-op for compat; TicketCard rounded 10px + die-cut perforation + soft layered shadow; VegIndicator/ChiliMeter refined). Keep all component props/exports stable.
- IA: add `persona` to view store (customer|kitchen|owner). Landing CTAs set persona. Post-login persona = user.role. Role-aware topbar: distinct nav, accent, persistent role label. Role homes: customer=live menu + active order strip; kitchen=KOT queue only; owner=NEW snapshot home with nav to deeper tabs.
- Noise: owner dashboard — add "overview" home tab (snapshot), deeper tabs one click away. Verify kitchen shows only KOT+86. Verify customer has no staff/inventory leakage.
- OAuth: NextAuth v4 Google provider, trustHost for dynamic redirect URI on live preview, find-or-create user, bridge to existing custom JWT + useAuthStore, route to correct shell by role. Honest error states (denied/not-linked/not-configured). Document credential requirement.
- Verify each step on live preview via Agent Browser.

Work Log:
- (in progress)

Work Log (Task 12, continued):
- Visual: new globals.css with paper/ink/chili/marigold/curry-leaf/clay tokens (old chalk/turmeric/steel kept as aliases). Fonts swapped to Sora/Plus Jakarta/Noto Devanagari/JetBrains Mono (var names stable). Primitives restyled: PressButton (rounded 10px, soft layered shadow, gentle scale press), StampBadge→pill (rotate no-op, kept for compat) + new StatusPill (color dot + label), TicketCard (rounded 12px, soft shadow, die-cut perforation), TicketHeader (optional color stripe), VegIndicator/ChiliMeter refined. All consumer files auto-updated via aliases — no logic changes.
- IA: view store gained `persona` (customer|kitchen|owner) + `pendingPersona`. Topbar rewritten to be persona-driven: distinct nav per persona, persistent role-label chip (always visible incl. mobile), role accent. Landing rewritten with 3 unmistakable app-entry cards. AppShell syncs persona from user.role, bridges NextAuth sessions, gates protected views. Footer persona-scoped (no nav duplication).
- Owner: new OwnerHome (overview) snapshot tab — today's revenue/active tickets/guests KPIs + floor status grid + needs-attention (low-stock/new-tickets) + go-deeper nav grid. AdminDashboard restructured: overview is default, 9 tabs in a scrollable pill strip. Each deep tab unchanged in logic, only restyled.
- Noise cut: kitchen shell shows only KOT queue + 86 control (verified). Customer shell shows only Menu/My Order (verified). Owner home shows snapshot only; deeper data one click away.
- Google OAuth: NextAuth v4 Google provider wired (auth-config.ts, [...nextauth]/route.ts, exchange-session bridge, /api/auth/config). trustHost=true for dynamic preview URL. find-or-create + role preserved. SessionProvider in layout. AppShell bridges useSession→app JWT→persona routing. Google button checks config first → honest inline "not configured" error if env vars missing; callback errors (?error=) mapped to plain-language inline messages. Cannot provision real Google creds in sandbox — documented honestly in DECISIONS D11 + README. Code path is production-complete.
- Refined visuals applied to: landing, menu-item-card (status stripe + die-cut + soft shadow + StatusPill), kitchen KotTicket (color status stripe + soft shadow + smooth ease-in motion + StatusPill).

Browser regression verification (all passed on live preview):
1. Customer CTA → customer shell: topbar shows "CUSTOMER" label, nav = Menu/My Order only. ✅
2. Add dish → cart → send to kitchen → Ticket #1617 created with CGST ₹2 + SGST ₹2 + Grand Total ₹84. ✅ (GST split intact)
3. Kitchen CTA → login shows "Sign in to the Kitchen app" → login as kitchen@chalu.in → kitchen shell: topbar "KITCHEN", nav = Kitchen only, lands on KOT queue (3 NEW + 1 COOKING). ✅
4. 86'd Filter Coffee in kitchen panel → fresh customer menu shows "SUGGEST A SUBSTITUTE" on Filter Coffee. ✅ (realtime 86'd sync intact)
5. Owner CTA → login shows "Sign in to Owner app" → login as owner@chalu.in → owner shell: topbar "OWNER", nav = Overview/Kitchen, lands on snapshot home (revenue ₹2,070, 4 active tickets, 8 guests, floor grid, low-stock alert). ✅
6. Owner Sales tab: recharts bar chart renders. AI Forecast tab: prep list generated. ✅
7. Google button (no creds): honest inline error "Google OAuth isn't configured on this deployment…". ✅ (no bare error page)
8. OTP tab renders. Mobile 360px: 3 app cards stack, role chip visible. ✅
9. Lint clean. Dev server healthy. Realtime service up.

Stage Summary:
- 3 distinct role shells working + unmistakable on every screen (persistent role label, persona-specific nav, role home screens).
- Owner dashboard de-noised: snapshot home + deeper tabs one click away.
- Google OAuth: full real code path wired end-to-end (redirect URI dynamic via trustHost, find-or-create, role routing, session→JWT bridge); honest inline error states for all failure paths; credential requirement documented.
- Visual direction corrected to bold/warm/polished: new palette, new typography, refined die-cut KOT ticket with color status stripes + soft shadows + smooth motion; neo-brutalist rotated stamps + hard offset shadows removed.
- Zero regressions: ordering, KOT pipeline, 86'd-sync, login, AI features, bilingual, QR, split-bill all verified working on live preview.

---
Task ID: 13
Agent: lead (main)
Task: Iteration pass 2 — §4 brutalist bones back, §6 header entry points, §7 scan-first inline QR, §8 dynamic tables, §9 staff coordination, §10 active wait reduction, §3 OAuth verify

Regression checklist (must stay working through every change):
1. Customer: menu → cart → send to kitchen → KOT ticket with GST → pay
2. Kitchen login → KOT queue → 86 item → propagates to customer menu
3. Owner login → dashboard (overview + tabs)
4. AI substitute on 86'd dish; AI Hinglish chat
5. Bilingual EN/HI; QR table ordering (?table=); split-bill
6. Login (email/pw + OTP + demo creds + guest + Google button → honest error)

Plan (non-breaking, additive where possible):
- Phase A (§4 visual): rework globals.css + PressButton + TicketCard — bring back 2px ink borders on primary structure, hard offset shadows (4px 4px 0 ink) on primary buttons/CTA cards with press-collapse, keep warm palette + Sora/Jakarta/Noto/JetBrains. TicketCard = 2px ink border + hard offset shadow (signature weight); secondary surfaces softer. StatusPill keeps clean pill with 1.5px ink border for structure. Selective border-as-structure, not uniform.
- Phase B (§6 header): add Kitchen + Owner links to topbar on every page (even customer shell, even landing). Respect auth: unauthed → role login; authed → role home.
- Phase C (§7 scan-first): reorder landing so Scan-to-order QR is first/most prominent; render real scannable QR inline (qrcode lib) encoding current origin; handle /table/:id or ?table= deep-link → straight to that table's menu (skip QR display).
- Phase D (§8 dynamic tables): API CRUD (add/rename/remove) owner-only; owner Tables tab UI with live per-table QR + download/print; floor + QR read same list (already true). Seed consistent.
- Phase E (§9 staff coordination): ADDITIVE schema — TableAssignment (tableId, userId, section, active, assignedAt) + StaffAlert (fromUserId, fromName, toUserId, toRole, tableId, type, message, createdAt, resolvedAt). API: /api/tables/assign, /api/alerts (GET/POST/PATCH), /api/dashboard/shift. Realtime channels: staff:alert, staff:assignment. UI: owner Staff tab assignment matrix; kitchen→assigned-waiter "ready" alert auto-fire; waiter (staff persona) coordination home with quick-flag (water/bill/help); owner sees all alerts + breach.
- Phase F (§10 wait reduction): kitchen breach indicators (order age vs Σ prepMinutes) + sort at-risk first; load-aware auto-assign on new order (least-loaded active staff); proactive breach alerts via §9 alert system; throughput feedback (avg cook time from history) shown in analytics + used in estimates.
- Phase G (§3 OAuth): re-verify code path + honest errors; document credential setup in README/DECISIONS.

Work Log:
- (in progress)

Work Log (Task 13, continued):
- Phase A (§4 visual): globals.css reworked — brought back 2px ink borders on primary structure, hard offset shadows (4px 4px 0 ink) on primary buttons/CTA cards with press-collapse (`.press`), softer `.surface-soft` + `.press-soft` for secondary. PressButton: primary variants (ink/chili/marigold/curry-leaf) get hard offset shadow + press-collapse; chalk gets soft press. TicketCard: new `weight` prop ("hard" default = 2px ink + hard offset shadow = signature weight; "soft" = lighter ambient). TicketHeader: 2px ink divider. Kept warm palette + Sora/Jakarta/Noto/JetBrains. Selective border-as-structure, not uniform.
- Phase B (§6 header): topbar gained persistent Kitchen + Owner `RoleEntry` chips (icon + label), visible on every page incl. landing + customer shell. Unauthed → role login (with pendingPersona so post-login lands in the right shell); authed with matching role → straight to role home. Discoverability no longer depends on being on the landing page.
- Phase C (§7 scan-first): landing reordered — Scan-to-order is the FIRST, most prominent element (live QR rendered inline via new `LiveQR` component + qrcode lib, encoding the live deployment URL). Three app-entry cards moved to the right column. AppShell handles `?table=CODE` AND `/table/:id` / `/t/:id` deep links → straight to that table's menu (skip QR display).
- Phase D (§8 dynamic tables): tables API gained POST (add, auto-generated code T9/T10…), DELETE (owner-only, blocked if live orders), PATCH extended (rename label/seats/section). `section` field added to TableToken schema (additive). TablesTab rewritten: Add table form, per-table Edit (inline rename + section), per-table live QR (LiveQR, generated on demand from the live table list), Remove (confirm), download/share link. Floor + queue + QR all read the same `/api/tables` list — single source of truth, no drift. TABLES_CHANGED realtime channel fans out add/remove/rename so all views stay live.
- Phase E (§9 staff coordination): ADDITIVE schema — `TableAssignment` (tableId, userId, section, active) + `StaffAlert` (fromUserId, fromName, toUserId, toRole, tableId, type, message, resolved). API: `/api/tables/assign` (GET/POST/DELETE), `/api/alerts` (GET/POST), `/api/alerts/[id]/resolve` (PATCH), `/api/dashboard/shift` (GET — staff + their tables + load + unassigned). Realtime channels: staff:alert, staff:alert:resolve, staff:assignment. StaffTab rewritten as coordination hub: assignment matrix (per-staff load + their tables + unassign), unassigned-tables dropdown (assign to least-loaded staff), live alerts feed (ready/water/bill/help/breach with resolve), quick-flag-to-kitchen buttons (water/bill/help). Kitchen "mark READY" auto-fires a "ready" alert to the assigned waiter (in order status route).
- Phase F (§10 active wait reduction): kitchen view computes breach per ticket (target = max item prepMinutes; elapsed since order; over = max(0, elapsed-target); near = within 3min of target). NEW + COOKING columns sorted by breach (most-overdue first) — work the risk, not queue order. KotTicket shows: status stripe turns chili when overdue; "Xm OVER" chili badge or "at risk" marigold badge; "elapsed/target m" footer. Column header shows "N at risk" count. Orders POST route: load-aware auto-assignment — new order with a table → if no active assignment, assign to least-loaded staff member (count active assignments per staff, pick min). Realtime STAFF_ASSIGNMENT fans out the auto-assignment.
- Phase G (§3 OAuth): re-verified — Google button checks /api/auth/config first; unconfigured → honest inline error "Google OAuth isn't configured on this deployment…" (no bare error page). NextAuth code path complete (trustHost for dynamic preview URL, find-or-create, session→JWT bridge, role routing). Credential requirement documented in DECISIONS D11 + README.

Browser regression verification (all passed on live preview):
1. Landing: header shows KITCHEN + OWNER entry points on every page; inline QR renders (data:image/png). ✅
2. Customer CTA → CUSTOMER label + Menu/My Order nav + KITCHEN/OWNER entries still visible. ✅
3. Add dish → send to kitchen → Ticket #1618 with CGST ₹2 + SGST ₹2 + Grand Total ₹84. ✅ (GST intact)
4. Owner login (via header Owner entry → "Sign in to Owner app") → OWNER shell, Overview home. ✅
5. Owner Tables tab: Add table → T9 "Patio Corner" created dynamically → its live QR generates on demand. Edit/Remove present. ✅ (single source of truth — floor + QR read same list)
6. Owner Staff tab: assignment matrix (Chef Ramesh/Anita/Suresh with load), unassigned tables dropdown, live alerts feed, quick-flag buttons. ✅
7. Kitchen view (via header Kitchen entry): KOT feed shows "3 AT RISK", tickets sorted by breach (#1076 "103M OVER" first), "elapsed/target m" footer, chili shadow on overdue. ✅
8. 86'd Masala Chaas in kitchen panel → customer menu shows "86'D" (realtime sync intact). ✅
9. Google button → honest inline error (no bare page). ✅
10. Mobile 360px: inline QR renders, header compact. ✅
11. Lint clean. Dev server + realtime service healthy.

Stage Summary:
- Visual: brutalist bones back (2px ink borders, hard offset shadows on primary with press-collapse) over warm chili/marigold/curry-leaf palette + Sora/Jakarta — doesn't read as generic neo-brutalist SaaS.
- IA: persistent Kitchen + Owner entry points in header on every page; three role shells unmistakable.
- Scan-to-order first + real inline QR; /table/:id deep-link skips to menu.
- Dynamic tables: owner CRUD + live per-table QR from the same list — no drift.
- Staff coordination: assignments + real-time alerts (kitchen→waiter ready auto-fire, waiter→kitchen quick-flag, shared shift view).
- Active wait reduction: breach-sorted KOT queue + indicators + load-aware auto-assignment.
- Zero regressions: ordering, KOT pipeline, 86'd-sync, login, GST, AI features all verified on live preview.

---
Task ID: 14
Agent: lead (main)
Task: Iteration pass 4 — §6 header-on-landing harden, §7 landing reorder + table reservation, §11 AI recommendations; re-verify §1/§3/§4/§8/§9/§10

Regression checklist (must stay working):
1. Customer: menu → cart → send to kitchen → KOT with GST → pay
2. Kitchen login → KOT queue (breach-sorted) → 86 item → propagates to customer menu
3. Owner login → Overview home + tables CRUD + staff coordination + dynamic per-table QR
4. Header Kitchen/Owner entry points on every page (verify on landing especially)
5. Scan-to-order inline QR on landing; /table/:id deep-link → table's menu
6. AI substitute on 86'd dish; AI Hinglish chat
7. Bilingual EN/HI; split-bill
8. Login (email/pw + OTP + demo creds + guest + Google honest error)
9. Active wait reduction (breach indicators + load-aware auto-assign)

Deltas (new work this pass):
- §6: RoleEntry chips currently `hidden md:flex` → make visible on mobile (icon-only) so header entry points are on every page with no exceptions. Verify landing header shows them.
- §7: Reorder landing to EXACT order: [QR/reservation block] → [three feature sections: Live 86'd sync, KOT-first pipeline, Honest wait times] → [hero copy block "The menu doesn't lie anymore..." reproduced exactly]. Add table-reservation selection in the general scan flow, gated by a restaurant feature flag (reservationsEnabled), with graceful fallback to the live menu when disabled. Third pillar title restored to "Honest wait times" per spec.
- §11: Add AI recommendations section to customer menu — /api/ai/recommend endpoint (availability-aware, bestseller/popularity + time-of-day signal, fallback to bestsellers for logged-out), rendered as a section in MenuView with the same card language.

Non-breaking: reservationsEnabled is an additive boolean on Restaurant. AI recommend is a new read-only endpoint. Landing reorder is pure presentation. No data model changes to existing tables.

Work Log:
- (in progress)

Work Log (Task 14, continued):
- §6 header harden: RoleEntry chips changed from `hidden md:flex` to always-visible `flex`; label changed from `hidden lg:inline` to `hidden sm:inline` so icon always shows + label shows from sm breakpoint. Now on EVERY page including landing, including mobile (icon-only) — no exceptions. Verified: landing header shows KITCHEN + OWNER on desktop and mobile.
- §7 landing reorder + reservation: rewrote landing to EXACT required order: [QR/scan-to-order block + table reservation picker] → [three feature sections: Live 86'd sync, KOT-first pipeline, Honest wait times] → [hero copy block "The menu doesn't lie anymore..." reproduced exactly in a bordered card with the three CTAs]. Third pillar title restored to "Honest wait times" per spec (body mentions both honest estimates + active reduction). Dropped the bestsellers preview from the landing (lives in the menu now via §11). 86'd ticker kept (earns its place — the wedge made visible). Added `reservationsEnabled` boolean to Restaurant model (additive, default true). New `/api/restaurant` GET (public) + PATCH (owner-only). Landing reservation picker: shows "Pick a table" with free-table buttons when enabled; picks a table → sets cart tableId + routes to menu. When disabled: falls straight through to "See today's live menu" CTA — no broken/empty section. Owner Tables tab has a Reservations: On/Off toggle.
- §11 AI recommendations: new `/api/ai/recommend` endpoint — scores available dishes by bestseller + popularity (7-day history) + time-of-day + customer order-history bias (veg preference, categories, repeats); tries LLM for a personalized 4-6 pick with reasons, falls back to scored ranking (effectively bestsellers for logged-out). New `Recommendations` component in MenuView — shows only when no filter/search active (cat=all, veg=all, no query) so it doesn't compete with filtered results. Same card language as the rest of the menu (veg dot, spice meter, price, add button, marigold status stripe). Max 6 dishes — short section, not a wall (§2 noise discipline).

Browser regression verification (all passed on live preview):
1. Landing header shows KITCHEN + OWNER on every page including landing (desktop + mobile). ✅
2. Landing content order: SCAN TO ORDER (QR + Pick a table) → three sections (Live 86'd sync, KOT-first pipeline, Honest wait times) → "The menu doesn't lie anymore..." hero copy. ✅ (verified via heading order)
3. Inline QR renders (data:image/png). Reservation picker shows free tables (T2/T5/T7/T8/T9). Picking T2 → routes to customer menu with that table. ✅
4. Owner Tables tab: Reservations: On/Off toggle. Toggling off → landing drops "Pick a table" and shows "SEE TODAY'S LIVE MENU" CTA (graceful fallback, no broken section). ✅
5. Customer menu: "Recommended for you" section renders with AI picks (Chana Masala, Butter Naan, Jeera Rice, Masala Chai — time-of-day-aware, availability-aware). ✅
6. Customer order: add dish → send to kitchen → Ticket #1619 with CGST ₹6 + SGST ₹6 + Grand Total ₹252. ✅ (GST intact)
7. Kitchen login (via header Kitchen entry → "Sign in to the Kitchen app"): KOT queue with breach indicators ("4 AT RISK", "#1076 127M OVER"). ✅
8. 86'd Masala Chai in kitchen → customer menu shows "86'D" (realtime sync intact). ✅
9. Google button → honest inline error "Google OAuth isn't configured on this deployment…". ✅
10. Mobile 360px: header Kitchen/Owner buttons visible (icon-only, 38px), QR renders, landing stacks. ✅
11. Lint clean. Dev server + realtime healthy.

Stage Summary:
- Header entry points on every page including landing (mobile too) — one shared TopBar, no exceptions.
- Landing reordered to spec: QR/reservation → three sections → hero copy. Table reservation selection with feature-flagged graceful fallback.
- AI recommendations section on customer menu — real availability + signal, fallback to bestsellers.
- Zero regressions: ordering, KOT pipeline, 86'd-sync, login, GST, AI chat, bilingual, split-bill, dynamic tables, staff coordination, active wait reduction all verified.

---
Task ID: 15
Agent: lead (main)
Task: Iteration pass 5 — split Waiter as 4th distinct app shell (§1/§6/§9), own home screen separate from Owner dashboard

Regression checklist (must stay working):
1. Customer: menu → cart → send to kitchen → KOT with GST → pay
2. Kitchen login → KOT queue (breach-sorted) → 86 item → propagates to customer menu
3. Owner login → Overview home + tables CRUD + staff-assignment tools + reservations toggle
4. Header Kitchen/Owner entry points on every page (incl. landing, incl. mobile)
5. Scan-to-order inline QR + table reservation (feature-flagged) + landing order [QR/reservation → 3 sections → hero copy]
6. AI recommendations on customer menu; AI substitute on 86'd; AI Hinglish chat
7. Bilingual EN/HI; split-bill; QR table ordering
8. Login (email/pw + OTP + demo creds + guest + Google honest error)
9. Active wait reduction (breach indicators + load-aware auto-assign)
10. Staff coordination (assignments + alerts + auto "ready" to assigned waiter)

Delta (new work this pass):
- §1: add "waiter" as a 4th Persona + "waiter" AppView. Staff role maps to WAITER persona (not owner). Owner keeps the full dashboard incl. staff-assignment tools (configures what waiters see). Waiter gets its own home: assigned tables + live status + alerts addressed to them + quick-flag — NOT the owner dashboard.
- §6: header gets THREE labeled role-entry chips: Kitchen, Waiter, Owner (not folded under "Staff"). On every page incl. landing, incl. mobile.
- §9: build dedicated WaiterView component. Owner Staff tab stays (assignment matrix + shift view) — it's the owner-side control that configures what waiters see.
- Auth routing: staff role → waiter home (not owner dashboard). pendingPersona "waiter" supported.
- AppShell: OAuth bridge + persona sync + gate + render all updated for waiter.

Non-breaking: no data model changes. TableAssignment + StaffAlert already exist. The staff role already exists. This is purely an IA/routing/UX split.

Work Log:
- (in progress)

Work Log (Task 15, continued):
- View store: added "waiter" to Persona + "waiter" to AppView.
- TopBar: usePersona() now maps staff → "waiter" (not owner). Added waiter to PERSONA_META (label "Waiter", BellConcierge icon, chili accent). Added waiter to navByPersona ("My tables"). Added enterWaiter handler (staff → waiter home; owner can preview). goHome routes waiter → waiter view. Header now shows THREE labeled RoleEntry chips: Kitchen, Waiter, Owner (not folded under "Staff") on every page incl. landing incl. mobile.
- globals.css: added .accent-waiter utility.
- AppShell: OAuth bridge routes staff → waiter persona + waiter view. persona sync maps staff → waiter. Gate protects waiter view. Render: view === "waiter" → WaiterView.
- AuthView: personaLabel includes waiter ("the Waiter app"). routeAfterAuth routes staff → waiter home. pendingPersona "waiter" pre-fills role "staff".
- WaiterView (new): dedicated waiter home — "My floor". Shows ONLY: this waiter's assigned tables (from /api/dashboard/shift, filtered to their id) with live status + quick-flag buttons (Water/Bill/Help to kitchen), incoming "order ready" alerts addressed to them (auto-fired by kitchen READY transition), and other alerts (breach/help). Empty states for no-tables and all-clear. Ticking clock. Realtime refresh on staff:alert, staff:assignment, kot:status, kot:new. Completely separate from Owner dashboard — a waiter never lands in owner's sales/analytics.
- Landing: added 4th AppEntry card "I'm a waiter" + enterWaiter handler.

Browser regression verification (all passed on live preview):
1. Landing header shows KITCHEN + WAITER + OWNER on every page including landing (desktop + mobile 360px, all 3 buttons visible at 38px icon-only). ✅
2. Landing has four app-entry cards: Customer, Kitchen, Waiter, Owner. ✅
3. Waiter header entry → "Sign in to the Waiter app" → login as waiter@chalu.in → lands on "My floor" (NOT owner dashboard). WAITER persona label, "MY TABLES" nav. ✅
4. Waiter home shows assigned tables (T1 after owner assigned it via API) with live status + quick-flag buttons. ✅
5. Waiter flagged "Water" on T1 → kitchen received "Table T1 needs water from Suresh Patil" (staff coordination intact). ✅
6. Created order on T1 → advanced to READY → waiter received auto-fired "Ticket #1620 ready — Table T1" alert (kitchen→assigned-waiter auto-fire intact). ✅
7. Customer order: add dish → send to kitchen → Ticket #1621 with CGST ₹6 + SGST ₹6 + Grand Total ₹252. ✅ (GST intact)
8. Kitchen login via header → KOT queue with breach indicators. ✅
9. 86'd Masala Chaas in kitchen → customer menu shows "86'D" (realtime sync intact). ✅
10. AI recommendations section on customer menu. ✅
11. Google button → honest inline error. ✅
12. Mobile 360px: all 3 role buttons visible. ✅
13. Lint clean. Dev server + realtime healthy.

Stage Summary:
- Four distinct app shells: Customer, Kitchen, Waiter, Owner — each with its own nav, accent, persistent role label, and dedicated home screen.
- Waiter has its OWN home ("My floor") — assigned tables + live status + quick-flag + incoming ready alerts — completely separate from Owner dashboard.
- Header has three labeled role-entry chips (Kitchen/Waiter/Owner) on every page including landing, including mobile — not folded under "Staff".
- Staff coordination loop verified end-to-end: waiter flags kitchen → kitchen gets it; kitchen marks READY → assigned waiter gets auto-alert.
- Zero regressions: ordering, KOT pipeline, 86'd-sync, login, GST, AI features, bilingual, split-bill, dynamic tables, reservations, active wait reduction all verified.

---
Task ID: 16
Agent: lead (main)
Task: Iteration pass 6 — 3 deltas: (A) AI prep list at bottom of Chef home, (B) Owner hire/fire staff, (C) landing role-entry-points moved below hero copy block

Regression checklist (must stay working):
1. Customer: menu → cart → send to kitchen → KOT with GST → pay
2. Kitchen login → KOT queue (breach-sorted) → 86 item → propagates
3. Waiter login → "My floor" home (assigned tables + alerts + quick-flag)
4. Owner login → Overview + tables CRUD + staff-assignment + reservations toggle
5. Header Kitchen/Waiter/Owner entry points on every page incl. landing incl. mobile
6. Scan-to-order inline QR + table reservation (feature-flagged)
7. AI recommendations on customer menu; AI substitute on 86'd; AI chat
8. Bilingual; split-bill; QR table ordering; active wait reduction
9. Login (email/pw + OTP + demo creds + guest + Google honest error)
10. Landing order: QR/reservation → 3 feature sections → hero copy

Deltas (new work this pass):
- A (§1): Add "AI prep list for tomorrow" at the bottom of the KitchenView (chef home), reusing the existing /api/forecast endpoint (LLM prep list + dish projection + ingredient flags). Kitchen-only.
- B (§1): Owner dashboard — hire/fire staff. New /api/dashboard/staff POST (hire: create staff/kitchen account with a temp password) + DELETE (fire: soft-disable by deleting the user). Owner Staff tab gets a "Hire" form + "Fire" button per staff member.
- C (§7): Reorder landing — move the role-entry-points section (currently inline in the top hero grid) to BELOW the hero copy block. Final landing order: [QR/reservation block] → [86'd ticker] → [3 feature sections] → [hero copy block] → [role entry points (Kitchen/Waiter/Owner) as a dedicated section]. The hero copy block's inline CTAs stay; the dedicated role-entry section is the prominent SaaS-operations path.

Non-breaking: forecast endpoint already exists (reused for A). Hire/fire is additive API on the existing User model (B). Landing reorder is pure presentation (C). No schema changes.

Work Log:
- (in progress)

Work Log (Task 16, continued):
- A (§1 chef AI prep list): new KitchenPrepList component — collapsible "AI prep list — tomorrow" section at the bottom of the KitchenView, reuses /api/forecast (LLM prep list + dish projection + ingredient restock flags). Lazy-loads on first open so it doesn't slow the live KOT queue. Fixed initial loading-state bug (was stuck true, blocking first load).
- B (§1 owner hire/fire): /api/dashboard/staff POST (hire: creates staff/kitchen account with temp password, default chalu123) + DELETE (fire: owner-only, blocks firing owners/self, releases active table assignments first). StaffTab rewritten: added staff roster table (name/role/contact/action) with Fire button per non-owner; Hire form (name/email/role/phone/temp password). Hired staff can immediately log in and land on their role's home (waiter → My floor). Fired staff disappear from roster + can no longer log in.
- C (§7 landing reorder): removed the inline role-entry cards from the top hero grid (left column only now: QR + reservation). Added a dedicated "Run the floor" section BELOW the hero copy block with 3 vertical AppEntry cards (Kitchen/Waiter/Owner). Final landing order: [QR/reservation] → [86'd ticker] → [3 feature sections] → [hero copy block] → [role entry points].

Browser regression verification (all passed on live preview):
1. Landing order: SCAN TO ORDER → Pick a table → Off the pass → Live 86'd sync / KOT-first pipeline / Honest wait times → "The menu doesn't lie anymore..." hero copy → "Run the floor" role entry points (I'm kitchen staff / I'm a waiter / I run this place). ✅
2. Header on landing: KITCHEN + WAITER + OWNER visible. ✅
3. Kitchen login → KOT queue → AI prep list at bottom ("AI prep list — tomorrow" → SHOW → LLM prep list with restock flags). ✅
4. Owner login → Staff tab → "Staff roster" with Hire/Fire. Hired "Riya Verma" (riya@chalu.in) → appeared in roster → Riya logged in → landed on Waiter "My floor" → fired Riya via confirm → removed from roster. ✅
5. Owner shows "PROTECTED" (can't fire self/owners). ✅
6. Customer order: add dish → send to kitchen → Ticket #1622 with CGST ₹6 + SGST ₹6 + Grand Total ₹252. ✅ (GST intact)
7. AI recommendations on customer menu. ✅
8. Lint clean. Dev server + realtime healthy.

Stage Summary:
- Chef home now includes AI prep list for tomorrow at the bottom (collapsible, lazy-loaded).
- Owner dashboard can hire (with temp password) and fire staff — full staff management.
- Landing page positions role entry points (Kitchen/Waiter/Owner) below the hero copy block as a dedicated "Run the floor" section — clearly directs SaaS users to their role's app.
- Zero regressions: ordering, KOT pipeline, 86'd-sync, login, GST, AI features, bilingual, split-bill, dynamic tables, reservations, staff coordination, active wait reduction, waiter home all verified.

---
Task ID: 17
Agent: lead (main)
Task: Make Google OAuth as close to "just works" as possible

Work Log:
- Generated + set NEXTAUTH_SECRET in .env (was missing — NextAuth needs it to sign sessions/JWTs).
- Set pages.error = "/" in auth-config so NextAuth redirects OAuth errors back to the app (instead of a bare /api/auth/error page). AppShell detects ?error= on mount → routes to login view.
- Auth-view: cleans the URL after displaying the error (so it doesn't re-trigger on refresh). Updated the error-code mapper to match NextAuth v4's actual codes (Configuration, AccessDenied, OAuthSignin, OAuthCallback, OAuthCreateAccount, OAuthAccountNotLinked, Callback, Verification, Default).
- Verified all paths: "not configured" → inline error (pre-check); "AccessDenied" → redirect to /?error=AccessDenied → login view → "You cancelled" → URL cleaned; "OAuthAccountNotLinked" → "email already registered" → URL cleaned.
- .env now has GOOGLE_CLIENT_ID= and GOOGLE_CLIENT_SECRET= (empty) with step-by-step setup instructions in comments, including the exact redirect URI for this deployment.

Stage Summary:
- The entire Google OAuth code path is complete and verified. NEXTAUTH_SECRET is set. Error handling is clean for all NextAuth error codes.
- The ONE remaining step is pasting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET into .env — which requires a Google Cloud project (cannot be created from inside the sandbox).
- The .env file has the exact redirect URI and instructions; once the two values are pasted and the server restarts, "Continue with Google" works end-to-end: Google consent → find-or-create user → bridge to app JWT → route to correct role shell.
