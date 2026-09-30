# Rockwell Building

A multi-tower Building Information System for Rockwell: one typed record of what was built (as-built drawings, O&M manuals, permits, warranties), what is installed (every piece of equipment with brand, model, serial, rating and its room on a floor plan) and what the house standard is (approved brands, finish schedule, brand and model catalogue). The facilities half (PM plans, work orders, inspections, warranties, vendors) reads and writes the same store.

> **Everything in this app is sample data.** Tower names are real Rockwell developments, but every floor count, area, brand, model, vendor, person, serial number, permit and work order is invented for demonstration. The footer and the dashboard hero say so on every screen. Nothing here is Rockwell's approved-vendor list or asset register.

Live sample: <https://rockwell-building.vercel.app> · Repo: `souichit-rock/rockwell-building` · Built by Souichi Takahama, Innovation Engineer.

## Quick start

```
npm install
npm run dev           # http://localhost:5173
npm run preview       # serve the production build
npm run gate          # everything below in one command
node scripts/gate.mjs --static   # only the source rules, no builds (about a second)
```

Node 20 or newer. The only runtime dependencies are React 19, react-router 7 and lucide-react; styling is Tailwind CSS v4 on the Rockwell token palette in `docs/design-system.md`.

`npm run gate` runs `tsc -b`, `vite build`, and `vite build --mode gate` (which bundles `src/data/seed/check.entry.ts` and runs it with Node: `verifySeed` throws on any integrity failure and prints row counts). Then it checks the source: no banned vocabulary under `src/` and this file, tokens-only styling in `src/features/` (no hex, `rgb(`, `dark:`, `bg-white`, `text-black`), no feature importing another feature, browser storage touched only by `store.ts` and `useTheme.ts`, the footer text in `Shell.tsx`, the entry chunk within 350 kB, the SPA rewrite in `vercel.json`, and that `src/app/smoke.ts` covers every route. It always runs every step and prints the full list of problems before exiting non-zero.

## Architecture

```
src/
  main.tsx, index.css, styles/tokens.css     entry, Tailwind theme mapping, colour tokens (light + dark)
  app/
    App.tsx, router.tsx                      useRoutes over one layout route: Shell > ten feature route tables + NotFound
    Shell.tsx, shell/*                       navy rail, phone top bar and drawer, tower scope, theme, reset
    CommandPalette.tsx                       Ctrl/Cmd-K search over everything
    useTheme.ts, useTowerScope.ts, smoke.ts
  data/
    types.ts                                 the whole data model (frozen)
    seed/*                                   fictional catalogues + generator (mulberry32, dates relative to today) + verifySeed
    store.ts                                 seed + overlay of demo edits
    selectors.ts                             every derived number (compliance, warranty band, health score, ...)
  components/ui/*, components/plan/*         design-system components, the SVG floor plan
  features/<key>/routes.tsx + pages/*        ten independent feature folders
  lib/                                       paths, status (enum -> badge tone), dates (Asia/Manila), format, csv, qr, search
scripts/gate.mjs                             the gate
```

- **Routing.** Each feature folder default-exports a `RouteObject[]` with absolute paths, statically imported by `router.tsx`; its pages are `React.lazy` chunks. The entry chunk therefore holds only route tables, and every page loads on demand.
- **Data flow.** Pages read through `useDb(select)` and pure selectors from `@/data/selectors`; they write through `upsert` / `remove`. Links between features are always built with `paths.*`, never hand-typed, so a route can move without breaking a screen.
- **Store.** The seed is read-only. Demo edits live in an overlay (`localStorage["rb:v1"]`, `{ v: 1, upserts, removed, ui }`) applied on top of it; the merged snapshot is rebuilt per write and cached. Storage failures (private window, blocked storage) are ignored and an overlay with the wrong version is discarded. "Reset demo data" in the rail clears the overlay. Other tabs adopt changes through the `storage` event.
- **Tower scope.** The select under the brand writes `ui.towerScope`; list pages pre-filter by it and show a chip that clears it; detail pages ignore it.
- **Styling.** Colour comes only from the token utilities (`bg-surface`, `text-ink`, `bg-gold`, ...). Dark mode swaps the tokens under `html[data-theme="dark"]`, so components never write `dark:`. Print rules in `index.css` hide the rail, top bar and footer and keep every sheet light.
- **Accessibility.** Skip link, `<dialog>` for the drawer, palette, modals and quick-view drawers, `aria-current` on the rail, visible focus rings, 40 px tap targets, no horizontal page scroll at 390 px.

## Data model

Flat rows keyed by `id`, foreign keys as `Id` strings, dates as ISO strings. The definitions are in `src/data/types.ts`.

| Area | Entities |
|---|---|
| Place | `Tower` > `Floor` > `Space`, with a schematic `PlanTemplate` per floor kind (plans are generated, never stored) |
| Catalogue | `Discipline`, `EquipmentType`, `Brand`, `Model` |
| Installed | `Asset` (located by tower, floor and space, plus an optional plan pin), `Warranty` (one per asset) |
| Records | `Document` (revisions, supersession, `links[]` to anything), `Permit` |
| Standards | `Standard` (approved brands by tier), `Finish`, `FinishScheduleEntry`, `Waiver` |
| People | `Vendor`, `TeamMember` |
| Operations | `PMPlan`, `WorkOrder`, `InspectionLog` |

Ids are deterministic and readable (tower `eds`, floor `eds-b3`, space `eds-b3-fpr`, asset `eds-b3-fp-01`, document `doc-eds-fp-ab`), so deep links, the demo tour and the smoke URLs never change. Asset tags follow `TOWER-FLOOR-TYPE-SEQ` and the QR short link is `/a/<tag>`.

Derived values are never stored. They come from `src/data/selectors.ts`:

- **Compliance** of an asset: an unexpired waiver gives `waived`; no governing standard gives `no-standard`; brand tier `preferred` or `acceptable` gives `compliant`; `phase-out` is a soft deviation; `prohibited` or unlisted is a `deviation`. Compliance % is (compliant + waived) over assets that have a standard.
- **Warranty band**: `expired`, `30d` (0-30 days left), `90d` (31-90), `365d` (91-365), `active`; "expiring within 90 days" means `30d` plus `90d`.
- **Due status**: PM overdue before today, due within 14 days; permit due within 60 days. "Today" is the Asia/Manila date from `todayISO()`.
- **Work orders**: priorities P1 to P4 carry due targets of 2 h, 8 h, 3 d and 14 d.
- **Health score**: `100 - 15*min(overduePm,3) - 10*openP1 - 3*openP2 - 5*expiredWarrantyCritA - 5*min(failedInspections,3) - 10*expiredPermits`, clamped 0-100; 85 and up is Good, 70-84 Watch, below 70 Action.

## Demo storyline (ten minutes)

The dashboard's "Ten-minute tour" card links each step. In order:

1. **Portfolio** `/`: KPIs, tower health, what needs attention, record gaps.
2. **Edades Suites** `/towers/eds`: facts, floor stack, systems table, as-built coverage matrix.
3. **Where is it** `/towers/eds/floors/eds-b3?layer=FIRE`: the basement plan with the fire layer on.
4. **Asset passport** `/assets/eds-b3-fp-01`: specs, warranty, compliance, governing as-built, QR (also reachable as `/a/EDS-B3-FP-01`).
5. **Log a visit** `/inspections/new?assetId=eds-b3-fp-01`: readings and findings, optionally raising a work order.
6. **Raise a work order** `/work-orders/new?assetId=eds-b3-fp-01`, then follow it on the **board** `/work-orders`.
7. **Design standards** `/compliance`: the towers-by-standards heatmap, deviating assets and waivers.
8. **Kestrel Pumps** (Brands & models): prohibited under RDS-FP-01 yet fitted to the Grove Tower B fire pumps, so the brand impact panel shows what replacing it would touch.
9. **Permits** `/permits`, then the **as-built revision history** `/documents/doc-eds-e-ab`.

Also try: Ctrl/Cmd-K from anywhere (tags, document numbers, work orders, rooms), the tower scope select, dark mode, and "Reset demo data" to undo every edit.

## How to add a tower

1. Add a row to `src/data/seed/towers.ts`. The id is the lower-case code (`eds`); `floorsAbove` counts the ground floor; the roof deck is level `floorsAbove`.
2. Give it a property manager and team in `src/data/seed/team.ts`.
3. In `src/data/seed/generate.ts` add its generator config: podium level, and whether it uses the residential or office equipment core plus one sample typical floor. Floors, rooms, assets, warranties, documents, permits and PM plans are generated from that.
4. Run `npm run gate`. `verifySeed` checks that every foreign key resolves, that asset location matches its room, that pins sit inside their rooms and that tags and ids are unique.
5. Nothing else changes: the tower scope select, dashboard, registers and palette read the towers from the store. Add a URL to `src/app/smoke.ts` if you want it in the route smoke pass.

## How to add a design standard

1. Add a `Standard` to `src/data/seed/standards.ts`: `code` (`RDS-XX-NN`), `disciplineId`, the `equipmentTypeIds` it governs, three to five `clauses`, and `approvals` as `{ brandId, tier }` with at least one `preferred`. Leave `appliesToTowerIds` empty for the whole portfolio.
2. Any brand and equipment type it names must already exist in `brands.ts` and `equipmentTypes.ts`.
3. That is all. Compliance is derived, so asset badges, the compliance matrix, the standards adoption bars and the brand impact panel pick it up. A waiver is a row in `waivers` (see `generate.ts`).
4. Run `npm run gate`; `verifySeed` rejects unknown types or brands.

To swap the invented brands for real ones, edit `src/data/seed/brands.ts` (one map) and re-run the gate.

## Deploying

Vercel project `rockwell-building`, framework preset Vite, build command `vite build`, output `dist`. `vercel.json` rewrites every path to `/index.html`, so deep links such as `/a/EDS-B3-FP-01` cold-load. Pushes to `main` redeploy.

## Phase 2 path

- **Persistence and auth.** Vercel functions plus Supabase (Postgres tables mirroring `types.ts` one-to-one; row-level security by tower and role: Property Manager, Building Engineer, Technician, Design & Technical, Vendor read-only). The overlay store becomes an API client with optimistic writes, and every mutation gets an audit row.
- **Files.** Storage for PDF, DWG and photos; PDF preview on document detail; photo attachments on work orders and inspections; DWG/DXF to SVG import replacing the schematic templates (pins already carry plan-unit coordinates).
- **QR labels.** Real QR encoding of `/a/<tag>`, batch label sheets per tower and floor, camera scan on phone.
- **Mobile inspection mode.** Offline-tolerant technician view with queued writes, checklists per equipment type, signature capture.
- **Notifications.** E-mail and Telegram digests for PM due, permit and warranty expiry, and P1 work orders.
- **Integrations.** Rockwell IoT Platform live readings on the passport, Rock Spot incidents linked to asset and work order, RS485 AMR meter data, COBie or Excel import of turnover registers, monthly FM report export.
- **Model extensions.** Estate above tower, spare parts, lifecycle cost and capex forecast (the first money fields), SLA and vendor scoring, a standards approval workflow with e-sign.

## Assumptions to confirm

Each is reversible and listed in full in `docs/superpowers/specs/2026-09-29-rockwell-building-design.md`: the four-tower set and its facts, fictional brands and vendors, no login (anyone with the URL can make demo edits, kept in their own browser), schematic floor plans, documents as metadata only, the `TOWER-FLOOR-TYPE-SEQ` tag convention, and the work-order, permit, warranty and PM thresholds above.
