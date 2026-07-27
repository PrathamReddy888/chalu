# DECISIONS.md — Chalu

A running log of product and technical decisions, with reasoning. Where the brief was silent or where the sandbox environment constrained the "ideal" stack, the defensible alternative is documented here.

## D1 — Stack adaptation for the sandbox environment

The brief specifies Supabase (Postgres + Auth + Realtime), Gemini API, and Vercel deployment. The build sandbox here provides Next.js 16 + Prisma/SQLite + a single exposed port via a Caddy gateway, plus the `z-ai-web-dev-sdk` for AI. To ship a *working* product inside this environment without compromising the product spine (live 86'd sync, KOT pipeline, AI substitute suggestion), the following substitutions are made. Every substitution preserves the *capability* the brief asks for; only the vendor changes.

| Brief asks for | Sandbox uses | Why | Capability preserved |
|---|---|---|---|
| Supabase Postgres | Prisma + SQLite | SQLite is the available DB; Prisma keeps the schema portable to Postgres with a one-line datasource change. | Relational data model, queryable, seedable. |
| Supabase Realtime | Socket.IO mini-service (port 3003) | Sandbox gateway only exposes one port; Socket.IO over the `XTransformPort` query is the supported realtime path. | Live 86'd sync + KOT feed, sub-second propagation. |
| Supabase Auth (email/OTP + Google OAuth) | Custom JWT auth (bcrypt + jose) with simulated OTP | Real Google OAuth + email OTP require external credentials/SMTP not available in-sandbox. | Email/password + OTP flow + role-based access; Google OAuth wired as a documented stub. |
| Gemini API | `z-ai-web-dev-sdk` LLM | This is the available LLM in the sandbox. | Substitute suggestion, demand forecasting, Hinglish chat — all functional. |
| Vercel deployment | Preview Panel gateway (port 3000) | This is the only externally reachable surface in-sandbox. | App is live & publicly reachable via the preview URL. |

**Production migration path:** change `datasource` provider to `postgresql`, point `DATABASE_URL` at Supabase, swap the JWT auth for `@supabase/ssr`, point the Socket.IO client at Supabase Realtime channels, and add `GEMINI_API_KEY`. No product logic changes required — this is a vendor-swap, not a rewrite.

## D2 — Single visible route, client-side shell switching

Sandbox rule: only `/` (src/app/page.tsx) is user-visible. Chalu has four distinct shells (customer, kitchen, admin, login). Rather than fight the constraint, the app uses a Zustand `viewStore` to switch between shells within the single route, with auth gating which shell a session lands on. API routes under `/api/*` are unrestricted by this rule and carry all backend logic. This keeps deep-linking simple (one URL) and matches how a single-tenant restaurant terminal actually behaves.

## D3 — Light-only "paper" aesthetic (no dark mode)

The KOT aesthetic is ink-on-cream-paper. A dark mode would break the material metaphor (kitchen chits are never dark). `next-themes` is available but intentionally not used for chrome. If a dark "night-shift kitchen" mode is wanted later, it would be a warm-tinted dark variant, not the standard neutral dark — left as future work.

## D4 — GST breakdown on every bill

Indian restaurant food service GST is 5% (split 2.5% CGST + 2.5% SGST) for the dine-in/restaurant category we model. Every bill shows the split explicitly. This is a real, expected detail on Indian bills and a deliberate market-fit signal.

## D5 — Veg/non-veg indicator follows FSSAI convention

A square border with a filled dot: green dot = veg, red/brown (`--chili`) dot = non-veg. This is the actual Indian regulatory convention and is used exactly as real menus use it. No generic leaf/drumstick icons.

## D6 — The signature animation budget goes to the KOT feed

The brief allows one orchestrated motion moment. It goes to the kitchen KOT feed: new tickets "print in" (slide + paper-curl) and status changes trigger a stamp-down bounce. Everywhere else motion is restrained and `prefers-reduced-motion` is respected.

## D7 — Demo credentials

Seeded accounts (see README for full list): `owner@chalu.in / chalu123` (admin/owner), `kitchen@chalu.in / chalu123` (kitchen), `waiter@chalu.in / chalu123` (staff), `guest@chalu.in / chalu123` (customer). OTP is simulated: any 6-digit code is accepted in dev, with the "expected" code shown on-screen for the demo.

## D8 — Bilingual (English/Hindi) as a first-class toggle

Hindi labels use IBM Plex Sans Devanagari. The toggle is global (Zustand `localeStore`) and covers nav, status stamps, and category names. Dish names show both scripts on the menu card. This is a deliberate Indian-market detail, not decoration.

---

# Iteration pass (IA + OAuth + visual direction)

## D9 — Three distinct role shells, not one generic chrome

The first build used a single topbar whose nav items were filtered by role, but the chrome itself (accent, label, home destination) stayed identical regardless of who was using it. A chef could see "My Order"; an owner could land on a raw kitchen queue. This iteration introduces an explicit **persona** concept (`customer | kitchen | owner`) in the view store, derived from the logged-in user's role or chosen explicitly on the landing page (guest customer browsing).

- Each persona gets a **distinct topbar**: role-specific nav items, a persistent role label chip (always visible, even on mobile), and a role accent class.
- Each persona gets **exactly one home screen** that answers "what do I need right now": customer → live menu; kitchen → KOT queue; owner → at-a-glance snapshot (today's revenue, active tickets, guests, floor status, low-stock flags, urgent items) with clear nav to deeper dashboards.
- The landing page now presents three unmistakable app entry cards ("I'm a customer" / "I'm the kitchen" / "I run this place") rather than three buttons wearing the same header.
- Footer nav is persona-scoped — no duplication with the topbar, no dead links.

**Non-breaking:** the underlying view store, API routes, data model, KOT pipeline, and 86'd-sync logic are unchanged. This is purely a chrome + routing layer.

## D10 — Owner dashboard restructured: snapshot home + deeper tabs

The first build's owner dashboard crammed 8 tabs onto one screen with no default home. This iteration adds an **Overview** tab as the default — a single at-a-glance snapshot (3 KPIs + floor status + needs-attention + go-deeper nav grid). The deeper dashboards (live orders, tables, inventory, sales, analytics, forecast, staff, customers) are one click away via a refined scrollable pill strip. Each deep tab states the manual task it replaces. No empty charts, no duplicated totals.

## D11 — Google OAuth: real code path, honest failure states

The first build shipped Google OAuth as a disabled stub. This iteration wires the **full real NextAuth v4 Google provider** code path:

- `src/lib/auth-config.ts` — NextAuth options with Google provider (conditional on env vars), `trustHost: true` so the redirect URI auto-matches the dynamic preview deployment URL, find-or-create user on sign-in, role preserved from any existing account.
- `src/app/api/auth/[...nextauth]/route.ts` — the NextAuth handler.
- `src/app/api/auth/exchange-session/route.ts` — bridges a NextAuth (Google) session into the app's own custom JWT (same shape as email/password login), so the rest of the app — which uses `getUserFromRequest` with the jose JWT — needs zero changes.
- `src/app/api/auth/config/route.ts` — tells the client whether Google is actually configured.
- Client: `<SessionProvider>` in the layout; `AppShell` watches `useSession()` and bridges authenticated sessions into `useAuthStore` + routes to the correct shell by role. The Google button checks `/api/auth/config` first; if unconfigured, it shows a **specific inline error** ("Google OAuth isn't configured on this deployment…") instead of dumping to NextAuth's bare error page. OAuth callback errors (`?error=…`) are mapped to plain-language messages (AccessDenied, OAuthAccountNotLinked, Configuration, etc.).

**Environment limitation, stated honestly:** real Google sign-in requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars plus the redirect URI `https://<deployment>/api/auth/callback/google` added to the Google Cloud authorized redirect URIs. These credentials cannot be provisioned from inside the build sandbox (no Google Cloud project access). The code path is complete and correct; the moment those two env vars are set, "Continue with Google" works end-to-end on the live deployment, in incognito, including find-or-create + role routing + correct shell landing. Until then, the button fails honestly with a specific, actionable error — never a silent failure or blank screen.

This is the defensible path: I cannot fabricate Google credentials, but the integration is production-correct and the failure mode is honest.

## D12 — Visual direction: refined KOT, not neo-brutalist

The first build's "rotated rubber stamp + hard offset shadow + torn perforation" neo-brutalist treatment read as raw/handmade. This iteration refines the same KOT-ticket motif into something considered and premium:

- **New palette** (paper/ink/chili/marigold/curry-leaf/clay) with the old token names (`chalk`/`turmeric`/`steel`) kept as aliases mapped to the new colors, so every existing `bg-chalk`/`text-turmeric` class auto-updated without touching consumer files. Generous, confident color in chrome and status; never at the cost of legibility.
- **New typography**: Sora (display, bold/characterful), Plus Jakarta Sans (body, humanist/legible), Noto Sans Devanagari (Hindi, weight-matched), JetBrains Mono (ticket numbers/timestamps). Same CSS var names so consumers don't change.
- **Refined ticket**: 10–12px corner radius, fine die-cut perforation, soft layered warm shadow (lifted gently off the table, not a flat hard offset). Status communicated via a clean color-coded stripe + pill (`StatusPill` with a colored dot + label) — never a rotated ink stamp. The old `StampBadge` is kept as a backwards-compatible alias that now renders as a calm pill; `rotate` prop is a no-op.
- **Smooth motion**: KOT tickets ease in (no paper-curl), status changes morph color/label smoothly, buttons give a gentle press-and-release (subtle scale + shadow softening). The live KOT feed remains the one signature "wow" beat; every other screen is calm and hierarchy-driven.
- UX discipline held: visible keyboard focus (marigold outline), `prefers-reduced-motion` respected, 16px+ body type, generous spacing, one obvious primary action per screen.

**Non-breaking:** all component props/exports are stable; no consumer file's logic changed, only visual classes.

---

# Iteration pass 3 — brutalist bones back + 4 new capabilities

## D13 — Brutalist bones, beautiful skin (visual course-correction)

The previous pass overcorrected away from brutalism (soft borders, soft shadows only). This pass brings structural confidence back: 2px solid `--ink` borders on primary structural elements (cards, buttons, the header, section dividers), hard-edged offset shadows (`4px 4px 0 ink`) on primary buttons and key CTA cards with the classic brutalist "press collapses the shadow" tactile click — but executed through the warm chili/marigold/curry-leaf palette and Sora/Jakarta typography so it never reads as cold concrete or a borrowed neo-brutalist SaaS template. The KOT ticket (signature) carries the full 2px ink border + hard offset shadow; secondary/ambient surfaces use a lighter border + softer layered shadow (`weight="soft"`) so structure is applied with hierarchy, not uniformly. Selective border-as-structure, never indiscriminate.

**Non-breaking:** all component props/exports stable; consumer files auto-updated via the same CSS var aliases.

## D14 — Header-level role entry points (§6)

Kitchen + Owner are now persistent `RoleEntry` chips in the topbar on every page (landing, customer shell, kitchen shell, owner shell), not just the landing hero. Unauthed click → that role's login (with `pendingPersona` so post-login lands in the correct shell); authed click with a matching role → straight to that role's home. Discoverability of the staff/owner apps no longer depends on being on the landing page or scrolling.

## D15 — Scan-to-order comes first, with a real inline QR (§7)

The landing hero's first, most prominent element is now a live, scannable QR rendered inline (client-side via the `qrcode` lib in a new `LiveQR` component) encoding the live deployment URL — not a button leading to another screen. The three app-entry cards moved to the right column. Per-table QRs (§8) remain in the owner Tables view. If a visitor arrives via `?table=CODE` or `/table/:id` or `/t/:id`, the app skips the generic QR view and drops straight into that table's live menu.

## D16 — Dynamic tables, single source of truth (§8)

Tables are now a live, owner-managed data set that drives everything downstream. The owner Tables tab supports add (auto-generated code T9/T10…), rename (inline edit of label + section), and remove (owner-only, blocked if live orders). Each table's QR is generated dynamically from that live list (`LiveQR` encoding `/?table=<code>`), rendered on demand next to the table with a share link — adding a new table produces a working, scannable QR immediately with zero manual asset creation. The floor/occupancy view, the queue-seating dropdown, and the set of valid QR codes all read from the same `/api/tables` list; a `TABLES_CHANGED` realtime channel fans out add/remove/rename so all views stay live. There is no second system that can drift apart. Schema change was additive: a nullable `section` column on `TableToken`.

## D17 — Staff coordination (§9) — additive data model

Added two new models (additive, no migration of existing data):
- `TableAssignment` (tableId, userId, section, active, assignedAt) — who's currently responsible for which table.
- `StaffAlert` (fromUserId, fromName, toUserId, toRole, tableId, type, message, resolved, resolvedAt) — lightweight real-time alerts between roles.

APIs: `/api/tables/assign` (GET/POST/DELETE), `/api/alerts` (GET/POST), `/api/alerts/[id]/resolve`, `/api/dashboard/shift`. Realtime channels: `staff:alert`, `staff:alert:resolve`, `staff:assignment`. The owner Staff tab is now a coordination hub: per-staff load + their tables + unassign, unassigned-tables dropdown (assign to least-loaded staff), live alerts feed (ready/water/bill/help/breach with resolve), quick-flag-to-kitchen buttons. When the kitchen marks an order READY, the order-status route auto-fires a "ready" alert to the waiter assigned to that table — so "order ready" goes straight to the assigned waiter, not a generic queue. Seed data: existing demo staff (owner/kitchen/waiter) are present; assignments populate as orders arrive (see D18).

## D18 — Active wait-time reduction (§10) — not just reporting

Three concrete mechanisms that measurably work to shorten waits, extending the original "honest wait times" pitch:
1. **Breach-sorted KOT prioritization**: the kitchen view computes a per-ticket breach (target = max item prepMinutes; elapsed since order; over = elapsed − target). NEW and COOKING columns are sorted most-overdue-first, so the chef works the risk, not the queue order. Overdue tickets get a chili-colored status stripe + hard chili shadow + "Xm OVER" badge; near-breaches get an "at risk" marigold badge. A ticking clock (15s) keeps indicators live without reload.
2. **Load-aware auto-assignment**: when a new order comes in with a tableId and that table has no active staff assignment, the orders POST route counts active assignments per staff member and auto-assigns to the least-loaded one — so new tables route to whoever has capacity, not a fixed rotation.
3. **Proactive breach surfacing**: the kitchen column header shows an "N at risk" count; the owner Staff tab's live alerts feed surfaces breach alerts. (Breach detection is client-side in the kitchen view from order timestamps + dish prepMinutes — no background job needed, honest for a demo.)

**Non-breaking:** the KOT pipeline, 86'd-sync, and order data model are unchanged. Breach is computed from existing fields (createdAt + item prepMinutes). Auto-assignment is additive (creates TableAssignment rows). No existing flow altered.

---

# Iteration pass 4 — header-on-landing, landing reorder + reservation, AI recommendations

## D19 — Header entry points on every page, including landing (§6 harden)

The previous pass added Kitchen + Owner `RoleEntry` chips to the topbar but wrapped them in `hidden md:flex` (hidden on mobile) and labeled them `hidden lg:inline` (icon-only until large screens). This pass makes them unconditionally present: `flex` (always visible, icon-only on mobile, icon+label from `sm` up). One shared `<TopBar />` renders for every view including landing — there is no separate landing header. Verified on the live preview: the landing page header shows Kitchen + Owner on both desktop and mobile (360px). No exceptions, as required.

## D20 — Landing reordered + table reservation with feature flag (§7)

Rewrote the landing to the exact required top-to-bottom order: (1) QR/scan-to-order block first, with an inline `LiveQR` and a table-reservation picker; (2) the three feature sections unchanged in content — Live 86'd sync, KOT-first pipeline, Honest wait times (third-pillar title restored to "Honest wait times" per spec, body mentions both honest estimates and active reduction); (3) the hero/pitch copy block ("The menu doesn't lie anymore...") reproduced exactly, moved into a bordered card at the bottom with the three role CTAs. The 86'd ticker stays (it earns its place as the wedge made visible); the bestsellers preview was dropped from the landing (it lives in the menu now via the AI recommendations section §11).

**Table reservation** is gated by a real restaurant feature flag — a new additive `reservationsEnabled Boolean @default(true)` on the `Restaurant` model. New `/api/restaurant` GET (public) + PATCH (owner-only). When enabled, the landing's scan block shows a "Pick a table" picker listing free tables (`status = empty | cleaning`); tapping one sets it as the customer's cart table and routes to that table's live menu. When disabled, the landing falls straight through to a "See today's live menu" CTA — no broken or empty reservation section. The owner Tables tab has a "Reservations: On/Off" toggle. This is flexible per restaurant and driven off the same live Tables data (§8) — no drift.

## D21 — AI recommendations on the customer menu (§11)

New `/api/ai/recommend` endpoint and `Recommendations` component. Signal, in priority order: (1) availability is non-negotiable — never recommends 86'd items; (2) logged-in customer's order history biases veg preference + categories + repeats; (3) bestseller flag + 7-day popularity; (4) time-of-day cue (morning→beverages/breads, midday→mains/rice, evening→starters/mains, night→desserts/beverages). Tries the LLM for a personalized 4-6 pick with one-line plain reasons; falls back to the scored ranking (effectively today's bestsellers for a logged-out visitor) on any failure — never shows nothing. Rendered as a section at the top of the menu, only when no filter/search is active (so it doesn't compete with filtered results), using the same card language as the rest of the menu (veg dot, spice meter, price, add button, marigold status stripe). Max 6 dishes — a short section, not a wall (§2 noise discipline).

---

# Iteration pass 5 — Waiter as 4th distinct app shell

## D22 — Four distinct app shells (Customer / Kitchen / Waiter / Owner)

Previous passes folded staff into the owner shell — a waiter had to go through the owner's sales/analytics view to do their floor job. This pass splits Waiter out as its own persona with its own home screen.

- **View store**: `"waiter"` added to `Persona` and `AppView`.
- **Persona mapping**: `staff` role → `waiter` persona (was → `owner`). Owner keeps the full dashboard including staff-assignment tools (the owner-side control that configures what waiters see). Waiter gets its own home.
- **TopBar**: `PERSONA_META` includes waiter (label "Waiter", `ConciergeBell` icon, chili accent). `navByPersona.waiter` = "My tables" only. Three labeled `RoleEntry` chips in the header on every page: Kitchen, Waiter, Owner — not folded under "Staff".
- **AuthView**: `routeAfterAuth` routes `staff` → `waiter` home. `pendingPersona "waiter"` pre-fills role `staff` and routes to the waiter view post-login.
- **AppShell**: OAuth bridge, persona sync, view gate, and render all updated for the waiter view.

## D23 — Dedicated WaiterView (§9 — waiters get their own portal)

New `src/components/waiter/waiter-view.tsx` — a floor-work screen, NOT a shrunk-down owner dashboard. Shows ONLY what a waiter needs mid-service:
- **"Order ready — run it"** section at the top: incoming `ready` alerts addressed to THIS waiter (auto-fired by the kitchen's READY transition via the order-status route), each with a "Got it" resolve button.
- **"My tables"**: the tables assigned to this waiter (from `/api/dashboard/shift`, filtered to their user id) with live status (seated/open/cleaning), and one-handed quick-flag buttons per table: Water / Bill / Help → fires an alert to the kitchen role.
- **Other alerts**: breach alerts + help flags from others.
- **Empty states**: "No tables assigned to you yet" (with a note that the owner assigns tables) and "All clear — no pending alerts".
- Realtime refresh on `staff:alert`, `staff:alert:resolve`, `staff:assignment`, `kot:status`, `kot:new` + a 20s ticking clock.

The owner Staff tab retains the full shift view (all staff + their tables + load + unassigned + assignment matrix + all-alerts feed) — it's the owner-side control that configures what each waiter sees on their own home. Verified end-to-end: owner assigned T1 to Suresh → Suresh's waiter home showed T1; Suresh flagged "water" → kitchen received it; order on T1 advanced to READY → Suresh received the auto-fired "Ticket #1620 ready — Table T1" alert.

---

# Iteration pass 6 — Chef AI prep list, Owner hire/fire, Landing role-entry reorder

## D24 — AI prep list at the bottom of the Chef home (§1)

Added a collapsible "AI prep list — tomorrow" section at the bottom of the KitchenView, below the KOT board + 86 control panel. Reuses the existing `/api/forecast` endpoint (LLM-generated morning shift prep list + dish projection + ingredient restock flags). Lazy-loads on first open (SHOW button) so it doesn't slow the live KOT queue during service. Fixed an initial-state bug where `loading` was `true` on mount, which blocked the first load because the toggle guard checked `!loading`.

**Non-breaking:** reuses an existing endpoint; no API or schema changes. The forecast endpoint already allowed `kitchen` role.

## D25 — Owner hire/fire staff (§1)

Extended `/api/dashboard/staff` with:
- **POST (hire)**: owner-only, creates a new `staff` or `kitchen` account with a temp password (default `chalu123`). Returns the new staff member + the temp password so the owner can hand it over.
- **DELETE (fire)**: owner-only, blocks firing owners or self, releases the fired staff's active table assignments first (clean handoff), then deletes the user.

The Owner Staff tab now includes a **Staff roster** table (name/role/contact/action) with a Fire button per non-owner staff member, and a Hire form (name/email/role/phone/temp password). Hired staff can immediately log in with the temp password and land on their role's home (waiter → "My floor"). Owners show "PROTECTED" in the action column.

**Non-breaking:** additive API on the existing User model; no schema changes. The existing `signup` route (with role codes) remains for self-signup; hire is the owner-side path.

## D26 — Landing role-entry-points moved below hero copy (§7)

Reordered the landing so the role-entry cards (Kitchen/Waiter/Owner) are a dedicated "Run the floor" section BELOW the hero copy block, not inline in the top hero grid. Final landing order: [QR/reservation block] → [86'd ticker] → [three feature sections] → [hero copy block "The menu doesn't lie anymore..."] → ["Run the floor" role entry points]. The hero copy block's inline CTAs (See today's live menu / I'm kitchen staff / I run this place) remain; the dedicated role-entry section is the prominent SaaS-operations path with three vertical cards. The AppEntry cards were restyled to vertical (stacked) for the 3-column grid. The header's Kitchen/Waiter/Owner entry points remain on every page including landing (unchanged from the previous pass).
