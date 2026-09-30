# Rockwell Building — Design Spec

Date 2026-09-29 · Lead architect spec for Souichi Takahama (Innovation Engineer, Rockwell Land)
Status: final for Phase 1 (Vercel sample). Visual rules live in [`docs/design-system.md`](../../design-system.md) and are not repeated here; feature agents read §0–§6 of that file before writing JSX.

Stack (fixed): Vite 7 · React 19 · TypeScript 5.9 · Tailwind CSS v4 · react-router v7 (library mode, `useRoutes`) · `lucide-react`. No other runtime dependency. No backend, no auth. Demo edits persist to `localStorage`. `@/*` → `src/*`. Already scaffolded in the project folder: `package.json` with exactly these four deps, `tsconfig.app.json` with the `@/*` path, `vercel.json` SPA rewrite, `index.html` with the Montserrat link and `<meta name="description">`, an empty `src/`. Not yet there (F0 adds them): the Vite `resolve.alias` for `@`, the gate build mode, the theme boot script and `theme-color` meta, `public/favicon.svg`.

Repo: `C:/Users/souichit/Desktop/Projects/rockwell-building` → GitHub `souichit-rock/rockwell-building` → Vercel `rockwell-building.vercel.app`.

---

## 1. Purpose & personas

Rockwell Building is a multi-tower Building Information System: one typed record of what was built (as-built drawings by discipline and revision, O&M manuals, permits, warranties), what is installed (every piece of MEPF / ELV / vertical-transport / architectural equipment with brand, model, serial, rating and its room on a floor plan) and what the house standard is (approved brands per system with tiers, finish schedule per space type, brand and model catalogue with where-used). The FM half (PM plans, work orders, inspections, warranties, vendors) reads and writes the same store, so "where is it, what does the drawing say, who do I call, when is it due" is answered from one screen in under two clicks. Phase 1 is a stakeholder-grade sample over four towers with clearly labelled fictional data.

Personas, in priority order: **Property Manager** (per tower: open work orders, PM due, expiring permits, contacts) · **Chief / Building Engineer** (asset register, PM close-out, as-built lookup during a fault) · **Design & Technical Standards team** (approved brands, finishes, which towers deviate) · **FM Technician** (find by tag or QR, read brand/model/serial, open O&M, log the visit) · **Document Controller / Turnover team** (file as-builts, T&C, warranties, permits by revision and discipline) · **Innovation / Engineering head** (portfolio KPIs, proof the model scales). Vendor read-only access is a later phase.

---

## 2. What Souichi said vs. what we assume

Said, verbatim: *"a Building information system of several tower that will act as a design repository like brands, where are the equipment and etc also this can be used for facilities management. it must also include the as built and etc in a digital platform. Using rockwell design lets build and push to github under my account then also create a vercel sample rockwell-building.vercel.app to view how it will look."*

Directly covered: several towers → 4 seeded towers and a tower-agnostic model; design repository like brands → standards with approval tiers, brand/model catalogue, finish schedule; where the equipment is → tower → floor → space + pin on a generated SVG plan; facilities management → PM, work orders, inspections, warranties, vendors, permits; as-built in a digital platform → document register with revisions, supersession and links to floors/assets; Rockwell design → tokens lifted from rockwell-grove; GitHub + Vercel → repo and project names above.

### Assumptions to confirm (he is not available now; each is reversible)

1. **Tower set and facts.** Edades Suites, Proscenium Lincoln, The Grove Tower B, 8 Rockwell with illustrative floor counts, GFA, turnover year and addresses. Facts are not authoritative; the "Sample data" banner says so.
2. **Fictional brands, vendors, people, serials.** Brand names such as "Norvik Power", "Halcyon Fire Systems" are invented so the demo cannot be read as Rockwell's real approved-vendor list. Real names are a one-file swap (`src/data/seed/brands.ts`).
3. **No login.** Anyone with the URL can view and make demo edits (kept only in their own browser). Auth is Phase 2.
4. **Floor plans are schematic**, generated from seven room templates, labelled "Schematic — not to scale". Real DWG/PDF plans are Phase 2.
5. **Documents are metadata only** (number, revision, links, size); no file upload or PDF preview. A styled title-block placeholder stands in for the sheet.
6. **English UI, Asia/Manila dates, `en-PH` number formatting.** No money fields (so no currency formatter) and no Filipino localisation this phase.
7. **Asset tag convention** `TOWER-FLOOR-TYPE-SEQ` (e.g. `EDS-B3-GEN-01`), QR target `/a/<tag>`. If Rockwell already has a tag standard, the generator takes it.
8. **Windows**: work-order priorities P1–P4 with due targets 2 h / 8 h / 3 d / 14 d (so `WorkOrder.dueAt` is a date-time); permit "due" ≤ 60 days; warranty "expiring" ≤ 90 days (bands are disjoint: `30d` = 0–30 d left, `90d` = 31–90 d, `365d` = 91–365 d; "≤ 90 d" always means bands `30d` + `90d`); PM "due" ≤ 14 days. "Today" is the Asia/Manila calendar date from `todayISO()`, whatever the viewer's timezone. Thresholds live in `src/data/selectors.ts`, date helpers in `src/lib/dates.ts`.
9. **Teams** are Property Management, Engineering, Design & Technical, Security, Housekeeping. Never "department".
10. **Compliance** = installed brand is `preferred` or `acceptable` under the governing standard; `phase-out` is a soft deviation; `prohibited` or unlisted is a deviation unless a waiver exists.
11. **Repo and deploy**: no `gh` CLI on this machine, so the repo `souichit-rock/rockwell-building` is created through the GitHub REST API with the token in Git Credential Manager and pushed over HTTPS; the Vercel project `rockwell-building` (team `souichi`) is created with the Vercel CLI (`vercel link` + `vercel deploy --prod`) and then git-connected so every push to `main` redeploys. Framework preset Vite, build `vite build`, output `dist`, SPA rewrite in `vercel.json`.

---

## 3. Information architecture — route table

Router: `src/app/router.tsx` exports one `RouteObject[]` — a single layout route `{ element: <Shell />, children: [...dashboardRoutes, ...towersRoutes, …, { path: "*", element: <NotFound /> }] }` — and `App.tsx` renders it with `useRoutes`. Each feature's `src/features/<key>/routes.tsx` is **statically** imported by `router.tsx` and default-exports its `RouteObject[]` with the absolute paths from this table, exactly as written; the page components inside it are `React.lazy(() => import("./pages/X"))`, so `routes.tsx` stays a few lines, the entry chunk holds only route tables, and every page is its own chunk. (`React.lazy` on the routes module itself does not work — it needs a component, not an array.) `Shell` wraps `<Outlet />` in `<Suspense fallback={<Loading />}>`. Nav grouping follows the design brief §3.1; sub-views that have their own path are route tabs (`Tabs` with `to`), sub-views that only change a query param are local tabs (`Tabs` with `key`, synced to the query string).

| Path | Name | Feature | Nav / entry |
|---|---|---|---|
| `/` | Dashboard | `dashboard` | OVERVIEW · Dashboard |
| `/towers` | Towers | `towers` | OVERVIEW · Towers |
| `/towers/:towerId` | Tower overview | `towers` | from Towers, dashboard cards |
| `/towers/:towerId/floors/:floorId` | Floor plan | `floorplans` | from tower floor stack, "Show on plan"; query `?highlight=asset:ID\|space:ID\|doc:ID&layer=ELEC,FIRE` |
| `/spaces/:spaceId` | Space detail | `floorplans` | from plan room click, asset location |
| `/assets` | Asset registry | `assets` | REGISTRY · Assets; query `?tower=&discipline=&type=&status=&band=&crit=&compliance=&pm=overdue&q=` plus link-only filters `brand=&model=&vendor=` (no control on the page; shown as a removable chip when present) |
| `/assets/:assetId` | Asset passport | `assets` | from everywhere; local tabs synced to `?tab=overview\|documents\|maintenance\|history` (default overview) |
| `/a/:tag` | QR short link | `assets` | printed QR; redirects to passport or renders 404 card |
| `/standards` | Design standards | `standards` | REGISTRY · Design standards (tab Standards) |
| `/standards/:standardId` | Standard detail | `standards` | from list, compliance cells |
| `/finishes` | Finish schedule | `standards` | tab Finishes; query `?tower=` |
| `/compliance` | Compliance matrix | `standards` | tab Compliance |
| `/catalogue` | Brands & models | `catalogue` | REGISTRY · Brands & models; query `?discipline=&type=&q=` |
| `/catalogue/brands/:brandId` | Brand | `catalogue` | from catalogue, passport, standards |
| `/catalogue/models/:modelId` | Model spec sheet | `catalogue` | from brand, passport |
| `/documents` | Document register | `documents` | REGISTRY · Documents (tab Register); query `?tower=&discipline=&type=&status=&current=0\|1&q=` (`current` defaults to 1) |
| `/documents/:docId` | Document detail | `documents` | from register, passport, tower |
| `/permits` | Permits & compliance | `documents` | tab Permits; query `?tower=&type=` |
| `/work-orders` | Work orders | `work-orders` | FACILITIES · Work orders; query `?view=board\|list&tower=&status=&priority=&kind=&assignee=&vendor=&assetId=` |
| `/work-orders/new` | New work order | `work-orders` | "Raise work order" buttons; query `?assetId=&spaceId=&towerId=&title=` |
| `/work-orders/:woId` | Work order | `work-orders` | from board/list, passport |
| `/maintenance` | PM schedule | `maintenance` | FACILITIES · Maintenance (tab Schedule); query `?view=list\|calendar&month=YYYY-MM&tower=&discipline=&team=&regulatory=1` |
| `/maintenance/:planId` | PM plan | `maintenance` | from schedule, passport |
| `/inspections` | Inspection log | `maintenance` | tab Inspections; query `?tower=&type=&result=&assetId=` |
| `/inspections/new` | New inspection | `maintenance` | passport "Log visit", plan "Mark done"; query `?assetId=&planId=` |
| `/inspections/:inspectionId` | Inspection | `maintenance` | from log, passport |
| `/warranties` | Warranty register | `vendors` | FACILITIES · Warranties; query `?band=&tower=` (band tabs are local tabs, not routes) |
| `/vendors` | Vendors & contacts | `vendors` | FACILITIES · Vendors; query `?kind=&discipline=&tower=` |
| `/vendors/:vendorId` | Vendor | `vendors` | from directory, passport, warranties |
| `*` | Not found | foundation (`src/app/NotFound.tsx`) | `EmptyState` + link home; features reuse it for bad ids (`<NotFound what="asset" id={id} />`) |

Nav (10 items): OVERVIEW Dashboard · Towers — REGISTRY Assets · Design standards · Brands & models · Documents — FACILITIES Work orders · Maintenance · Warranties · Vendors. Items stay active on their sub-paths through `NavItem`'s `also` prefixes: Towers also `/spaces`; Assets also `/a`; Design standards also `/finishes`, `/compliance`; Documents also `/permits`; Maintenance also `/inspections`. Count pills only on Work orders (open + assigned + in-progress) and Maintenance (overdue plans); no other item shows one.

Global: Ctrl/Cmd-K command palette (foundation) searches towers, floors, spaces, assets, brands, models, standards, documents, permits, vendors, work orders and navigates via `paths`. **Tower scope**: a `<select>` under the brand in the rail (desktop) and at the top of the nav drawer (phone) writes `ui.towerScope` in the store; every list route pre-filters by it when set and shows a "Scoped to <tower>" chip that clears it; detail routes ignore it; the two `/new` forms prefill `towerId` from it only when the query string carries none.

---

## 4. Data model

Rules: every entity is a flat row keyed by `id`; foreign keys are `Id` strings; M:N relations are `Id[]` on the owning side; all dates are ISO strings; no class instances. **An Asset is located by `towerId → floorId → spaceId` (all three stored, verified equal to the space's chain by `verifySeed`) plus an optional `pin {x, y}` in plan units (viewBox `0 0 100 62.5`, so x is % of plan width and y runs 0–62.5). Without a pin, `assetPin()` places it at the space centroid on a deterministic offset ring.** **A Document links to anything through `links[]` (`kind` + `id` + `relation`): an as-built sheet `governs` floors, spaces and assets; an O&M manual `references` assets or a model; a warranty certificate or T&C report `certifies` an asset; a standards document `references` a standard; a permit certificate `certifies` a permit.** `towerId`, `floorId` and `disciplineId` on Document exist only for register filtering.

Ids are deterministic and human-readable so deep links, the demo tour and smoke URLs never change: tower `eds`; floor `eds-b3` / `eds-gf` / `eds-l12` / `eds-rd`; space `eds-b3-fpr`; asset = tag lower-cased `eds-b3-fp-01`; document `doc-eds-fp-ab` (docNo lower-cased); permit `permit-eds-fsic`; plan `pm-<assetId>-1`; others `<prefix>-<n>`.

### 4.1 `src/data/types.ts` (verbatim; frozen before fan-out)

```ts
// src/data/types.ts — FROZEN at fan-out. Feature agents never edit this file; derive locally instead.
export type Id = string;
export type ISODate = string;      // "2026-09-29"
export type ISODateTime = string;  // "2026-09-29T09:40:00+08:00"

export type TeamName = "Property Management" | "Engineering" | "Design & Technical" | "Security" | "Housekeeping";
export type DisciplineCode = "ELEC" | "HVAC" | "PLUMB" | "FIRE" | "ELV" | "VT" | "ARCH" | "STRUCT";
export type Tone = "navy" | "gold" | "info" | "ok" | "warn" | "danger" | "muted" | "ink-soft";
export type Criticality = "A" | "B" | "C";
export type Frequency = "weekly" | "monthly" | "quarterly" | "semi-annual" | "annual";
export type TowerUse = "residential" | "office";
export type FloorKind = "basement-plant" | "basement-parking" | "ground" | "podium" | "typical" | "roof";
export type PlanTemplateId = "basement-plant" | "basement-parking" | "ground" | "podium" | "typical-res" | "typical-office" | "roof";
// lucide-react export names; the keys of EQUIPMENT_ICONS in src/components/ui/EquipmentIcon.tsx. tsc enforces membership, so no runtime check.
export type EquipmentIconName =
  | "Zap" | "Fuel" | "BatteryCharging" | "PlugZap" | "Cable" | "Wind" | "Fan" | "Snowflake" | "Thermometer" | "Droplets" | "Waves"
  | "Flame" | "Siren" | "ShieldCheck" | "Camera" | "KeyRound" | "Radio" | "Server" | "Cpu" | "ArrowUpDown" | "Building" | "Umbrella" | "Car" | "Gauge" | "Box";
export type SpaceKind =
  | "genset-room" | "transformer-vault" | "lv-room" | "pump-room" | "fire-pump-room" | "stp" | "chiller-plant"
  | "ahu-room" | "elevator-machine-room" | "tank-deck" | "bms-room" | "fcc" | "mdf" | "riser" | "refuse"
  | "lift-lobby" | "stair" | "corridor" | "lobby" | "unit" | "office" | "retail" | "amenity" | "pool" | "toilet"
  | "parking" | "roof-deck";

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

export interface Tower {
  id: Id; code: string; name: string; estate: string; address: string; use: TowerUse;
  floorsAbove: number; floorsBelow: number; gfaSqm: number; turnoverYear: number;
  propertyManagerId: Id; pmoPhone: string; pmoEmail: string;
}
export interface Floor { id: Id; towerId: Id; level: number; label: string; kind: FloorKind; templateId: PlanTemplateId }
export interface PlanRoom { code: string; name: string; kind: SpaceKind; x: number; y: number; w: number; h: number }
export interface PlanTemplate { id: PlanTemplateId; rooms: PlanRoom[] }   // viewBox 0 0 100 62.5
export interface Space { id: Id; towerId: Id; floorId: Id; code: string; name: string; kind: SpaceKind; rect: Rect; areaSqm: number }

export interface Discipline { id: DisciplineCode; name: string; tone: Tone; order: number }
export interface PmTask { task: string; frequency: Frequency; checklist: string[] }
export interface EquipmentType {
  id: Id; disciplineId: DisciplineCode; name: string; tagPrefix: string; icon: EquipmentIconName;
  defaultCriticality: Criticality; expectedLifeYears: number; pmTasks: PmTask[];
}
export interface Brand { id: Id; name: string; country: string; disciplineIds: DisciplineCode[]; note?: string }
export interface Model {
  id: Id; brandId: Id; equipmentTypeId: Id; modelNo: string; specs: Record<string, string>;
  defaultWarrantyMonths: number; discontinued: boolean; successorModelId?: Id;
}

export type AssetStatus = "in-service" | "standby" | "under-repair" | "decommissioned";
export type Condition = "good" | "fair" | "poor" | "unknown";
export interface Asset {
  id: Id; tag: string; towerId: Id; floorId: Id; spaceId: Id; equipmentTypeId: Id; modelId: Id;
  serial: string; rating: string; installDate: ISODate; commissionDate: ISODate;
  status: AssetStatus; condition: Condition; criticality: Criticality;
  pin?: Point; parentAssetId?: Id; installerVendorId: Id; serviceVendorId?: Id; notes: string;
}
export interface Warranty { id: Id; assetId: Id; vendorId: Id; start: ISODate; end: ISODate; coverage: string; docId?: Id }

export type DocType = "as-built" | "shop-drawing" | "om-manual" | "datasheet" | "tc-report" | "permit" | "warranty-cert" | "finish-schedule" | "inspection-report" | "contract";
export type DocStatus = "current" | "superseded" | "for-review";
export type LinkKind = "tower" | "floor" | "space" | "asset" | "model" | "standard" | "permit" | "vendor";
export type LinkRelation = "governs" | "references" | "certifies";
export interface DocRevision { rev: string; date: ISODate; issuedBy: string; reason: string }
export interface DocLink { kind: LinkKind; id: Id; relation: LinkRelation }
export interface Document {
  id: Id; docNo: string; title: string; type: DocType; disciplineId: DisciplineCode;
  towerId?: Id; floorId?: Id; revisions: DocRevision[]; status: DocStatus; supersededById?: Id;
  links: DocLink[]; fileName: string; fileSizeKb: number; pages: number;
}

export type PermitType = "occupancy" | "fsic" | "electrical" | "mechanical" | "elevator" | "genset-ecc" | "water-discharge" | "sanitary";
export interface Permit { id: Id; towerId: Id; type: PermitType; number: string; issuer: string; issuedDate: ISODate; expiryDate: ISODate; docId?: Id }

export type ApprovalTier = "preferred" | "acceptable" | "phase-out" | "prohibited";
export interface BrandApproval { brandId: Id; tier: ApprovalTier; note?: string }
export interface Standard {
  id: Id; code: string; title: string; disciplineId: DisciplineCode; equipmentTypeIds: Id[];
  clauses: string[]; approvals: BrandApproval[]; appliesToTowerIds: Id[];   // [] = whole portfolio
  revision: string; effectiveDate: ISODate; ownerTeam: TeamName;
}
export type FinishCategory = "floor" | "wall" | "ceiling" | "door" | "hardware" | "paint" | "sanitary" | "lighting";
export type Surface = FinishCategory;
export interface Finish { id: Id; code: string; name: string; category: FinishCategory; brandId?: Id; product: string; swatch: string; supplierVendorId?: Id }
export interface FinishScheduleEntry { id: Id; spaceKind: SpaceKind; surface: Surface; finishId: Id; towerId?: Id; note?: string }  // towerId absent = portfolio standard
export interface Waiver { id: Id; towerId: Id; assetId: Id; standardId: Id; reason: string; approvedBy: string; approvedAt: ISODate; expiresAt?: ISODate }

export type VendorKind = "manufacturer-rep" | "contractor" | "service-provider" | "supplier";
export interface Contact { name: string; role: string; phone: string; email: string }
export interface Contract { ref: string; start: ISODate; end: ISODate; slaResponseHours: number; scope: string }
export interface Vendor {
  id: Id; name: string; kind: VendorKind; disciplineIds: DisciplineCode[]; brandIds: Id[];
  contacts: Contact[]; contract?: Contract; accreditationExpiry?: ISODate;
}
export interface TeamMember { id: Id; name: string; role: string; team: TeamName; towerIds: Id[]; phone: string; email: string }

export interface PMPlan {
  id: Id; assetId: Id; task: string; frequency: Frequency; checklist: string[]; assigneeTeam: TeamName; vendorId?: Id;
  regulatory: boolean; permitId?: Id; lastDone: ISODate; nextDue: ISODate; estimatedHours: number;
}
export type WOKind = "corrective" | "preventive" | "inspection" | "project";
export type WOPriority = "P1" | "P2" | "P3" | "P4";
export type WOStatus = "open" | "assigned" | "in-progress" | "on-hold" | "done" | "cancelled";
export interface WOEvent { at: ISODateTime; by: string; note: string; status?: WOStatus }
export interface WorkOrder {
  id: Id; number: string; title: string; towerId: Id; assetId?: Id; spaceId?: Id; kind: WOKind; priority: WOPriority; status: WOStatus;
  reportedById: Id; reportedAt: ISODateTime; assignedToId?: Id; vendorId?: Id; planId?: Id; dueAt: ISODateTime; completedAt?: ISODateTime;
  description: string; timeline: WOEvent[];
}
export type InspectionType = "pm-visit" | "regulatory" | "condition-survey" | "test";
export type InspectionResult = "pass" | "pass-with-findings" | "fail";
export interface Reading { label: string; value: number; unit: string }
export interface InspectionLog {
  id: Id; assetId: Id; planId?: Id; workOrderId?: Id; date: ISODate; type: InspectionType; inspector: string; vendorId?: Id;
  result: InspectionResult; readings: Reading[]; findings: string;
}

export interface Db {
  towers: Record<Id, Tower>; floors: Record<Id, Floor>; spaces: Record<Id, Space>;
  disciplines: Record<Id, Discipline>; equipmentTypes: Record<Id, EquipmentType>; brands: Record<Id, Brand>; models: Record<Id, Model>;
  assets: Record<Id, Asset>; warranties: Record<Id, Warranty>; documents: Record<Id, Document>; permits: Record<Id, Permit>;
  standards: Record<Id, Standard>; finishes: Record<Id, Finish>; finishSchedule: Record<Id, FinishScheduleEntry>; waivers: Record<Id, Waiver>;
  vendors: Record<Id, Vendor>; teamMembers: Record<Id, TeamMember>; pmPlans: Record<Id, PMPlan>; workOrders: Record<Id, WorkOrder>; inspections: Record<Id, InspectionLog>;
}
export type Collection = keyof Db;
export type Row<K extends Collection> = Db[K][Id];

// Derived, never stored
export type WarrantyBand = "expired" | "30d" | "90d" | "365d" | "active" | "none";
export type DueStatus = "overdue" | "due" | "on-track";
export type PermitStatus = "expired" | "due" | "valid";
export type ComplianceStatus = "compliant" | "phase-out" | "deviation" | "waived" | "no-standard";
export interface Compliance { status: ComplianceStatus; standardId?: Id; tier?: ApprovalTier; waiverId?: Id }
export interface HealthScore {
  score: number; band: "Good" | "Watch" | "Action";
  overduePm: number; openP1: number; openP2: number; expiredWarrantyCritA: number; failedInspections: number; expiredPermits: number;
}
export interface HistoryItem { at: ISODate; kind: "PM" | "repair" | "inspection" | "project"; title: string; result?: InspectionResult; status?: WOStatus; href: string }
export interface PlanPin { assetId: Id; x: number; y: number; tone: Tone; label: string; title: string; disciplineId: DisciplineCode }
// label = tag suffix shown on hover/selection ("FP-01"); title = native <title> tooltip ("EDS-B3-FP-01 · Fire pump (electric) · In service")
export interface SearchHit { kind: string; id: Id; title: string; subtitle: string; href: string; haystack: string }

// Return shapes of the selectors in src/data/selectors.ts (§7). Declared here so the seed agent and the ten feature agents cannot drift.
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral" | "gold" | "solid-ok";   // Badge prop; distinct from Tone (discipline fill)
export type AttentionKind = "pm-overdue" | "wo-p1" | "wo-p2" | "permit" | "warranty-30d" | "inspection-fail";
export interface AttentionItem { kind: AttentionKind; towerId: Id; title: string; subtitle: string; href: string; tone: BadgeTone; at: ISODate }
export type RecordGapKind = "missing-asbuilt" | "no-om" | "stale-sheet";
export interface RecordGap { kind: RecordGapKind; towerId: Id; title: string; count: number; href: string }
export interface PortfolioKpis {
  assetsTotal: number; assetsInService: number; openWos: number; openP1: number; openP2: number;
  pmOverdue: number; pmDue14d: number; warranties90d: number; permitsDue: number; permitsExpired: number; asBuiltCoveragePct: number;
}
export interface CoverageCell { floorId: Id; disciplineId: DisciplineCode; status: "current" | "superseded" | "missing"; docId?: Id }
export interface ComplianceCell { towerId: Id; standardId: Id; total: number; compliant: number; waived: number; phaseOut: number; deviations: number }
export interface FinishRow { surface: Surface; portfolio?: Finish; override?: Finish; deviates: boolean }
export interface FinishDeviation { towerId: Id; spaceKind: SpaceKind; surface: Surface; portfolioFinishId: Id; overrideFinishId: Id }
export interface BrandImpact { brandId: Id; assets: number; towerIds: Id[]; warrantyAssetMonths: number; openWos: number; oldestInstall?: ISODate }
export interface Location { tower: Tower; floor: Floor; space: Space }
```

### 4.2 Relations (summary)

| Entity | Belongs to | Has many / referenced by |
|---|---|---|
| Tower | TeamMember (property manager) | Floor, Space, Asset, Document, Permit, WorkOrder, Waiver, FinishScheduleEntry overrides |
| Floor | Tower, PlanTemplate (`templateId`) | Space, Asset, Document (`floorId`, links) |
| Space | Floor, Tower | Asset, WorkOrder (`spaceId`), Document links |
| Discipline | — | EquipmentType, Brand, Document, Standard, Vendor |
| EquipmentType | Discipline | Model, Asset, Standard (`equipmentTypeIds`); seeds PMPlan via `pmTasks` |
| Brand | — | Model, Standard approvals, Vendor (`brandIds`), Finish |
| Model | Brand, EquipmentType, Model (successor) | Asset, Document links (kind model) |
| Asset | Tower/Floor/Space, EquipmentType, Model, Vendor (installer, service), Asset (parent) | Warranty (exactly one), PMPlan, WorkOrder, InspectionLog, Waiver, Document links |
| Warranty | Asset, Vendor, Document? | — |
| Document | Discipline, Tower?, Floor?, Document (`supersededById`) | polymorphic `links[]`; Permit, Warranty point back by `docId` |
| Permit | Tower, Document? | PMPlan (`permitId`) |
| Standard | Discipline, EquipmentType[], Brand[] via approvals, Tower[] | Waiver, Document links; compliance derived from Asset → Model → Brand |
| Finish / FinishScheduleEntry | Brand?, Vendor?; entry → SpaceKind, Finish, Tower? | finish deviation derived (override ≠ portfolio row) |
| Vendor | — | Asset, Warranty, PMPlan, WorkOrder, Brand (`brandIds`) |
| TeamMember | Team (enum) | Tower (manager), WorkOrder (reporter, assignee) |
| PMPlan | Asset, Team, Vendor?, Permit? | WorkOrder (`planId`), InspectionLog (`planId`) |
| WorkOrder | Tower, Asset?, Space?, TeamMember, Vendor?, PMPlan? | InspectionLog (`workOrderId`) |
| InspectionLog | Asset, PMPlan?, WorkOrder?, Vendor? | sparklines, health score, service history |

---

## 5. Seed data plan

Everything is TypeScript under `src/data/seed/`, generated at module load with `mulberry32(20260929)`. Every operational date (PM due, permit / warranty / contract expiry, WO and inspection timestamps) is expressed as `daysFromNow(offset)` so the demo is deterministic yet never stale; historical facts (turnover year, install / commission dates, the occupancy permit's `2099-12-31`) are absolute. No JSON files, no image assets. Target ≈ 2,900 rows, of which ≈ 2,400 are generated spaces (157 floors × 7–17 rooms); the generator is ≈500 lines.

### 5.1 Hand-authored catalogues (`src/data/seed/*.ts`)

**Towers (4)** — `towers.ts`

| id | code | name | estate · address | use | levels | GFA m² | turnover | podium |
|---|---|---|---|---|---|---|---|---|
| `eds` | EDS | Edades Suites | Rockwell Center · Amapola St, Makati City | residential | B3–B1, GF, L1–L39, RD | 62,000 | 2016 | L5 |
| `prl` | PRL | Proscenium Lincoln | Proscenium at Rockwell · Estrella St, Makati City | residential | B4–B1, GF, L1–L49, RD | 88,000 | 2019 | L6 |
| `grb` | GRB | The Grove Tower B | The Grove by Rockwell · E. Rodriguez Jr. Ave, Pasig City | residential | B2–B1, GF, L1–L29, RD | 41,000 | 2014 | L5 |
| `8rw` | 8RW | 8 Rockwell | Rockwell Center · Hidalgo Dr, Makati City | office | B5–B1, GF, L1–L18, RD | 47,000 | 2016 | — |

`floorsAbove` counts GF (EDS = 40); roof deck is `level = floorsAbove`, label `RD`. Labels: `B3…B1`, `GF`, `L1…L39`, `RD`. No skipped numbers (ponytail: add a skip list if anyone asks). Podium level is generator config, not a Tower field.

**Disciplines (8)** `disciplines.ts` — ELEC Electrical (navy, 1) · HVAC Mechanical / HVAC (info, 2) · PLUMB Plumbing / Sanitary (ok, 3) · FIRE Fire protection (danger, 4) · ELV ELV / Auxiliary (gold, 5) · VT Vertical transport (warn, 6) · ARCH Architectural (muted, 7) · STRUCT Structural (ink-soft, 8).

**Equipment types (36)** `equipmentTypes.ts` — each with `tagPrefix`, default criticality, life, `icon` (an `EquipmentIconName`) and 1–2 `pmTasks` (task, frequency, 3–6 checklist lines):
ELEC — Generator set GEN A · Diesel day tank DT B · Transformer TX A · LV main switchboard LVS A · ATS / CTTS ATS A · UPS UPS B · Panelboard DP C · Lightning protection LPS C.
HVAC — Water-cooled chiller CHL A · Cooling tower CT A · Chilled / condenser water pump CWP B · Air handling unit AHU B · Fan coil unit FCU C · VRF outdoor unit VRF B · Stair pressurisation fan SPF B · Exhaust fan EF C.
PLUMB — Transfer pump TP B · Booster pump BP B · Sump pump SP C · STP blower STP B · Cistern tank CST B · Elevated water tank EWT B · Water heater WH C.
FIRE — Fire pump (electric) FP A · Fire pump (diesel) FPD A · Jockey pump JP B · Sprinkler alarm valve SAV B · Clean-agent (FM200) system CA B.
ELV — FDAS panel FDAS A · CCTV NVR NVR B · Access control controller ACS B · PA / voice evacuation PA B · BMS server BMS B.
VT — Passenger elevator EL A · Service elevator ELS A · Gondola / BMU BMU B.
ARCH — Facade & curtain wall FAC B · Roof waterproofing WP B · Pool filtration pump PF C · Parking barrier PB C.
STRUCT has documents only.

**Brands (25, fictional)** `brands.ts` — Norvik Power (SE, gensets) · Halden Diesel (DE, gensets) · Meridian Switchgear (JP) · Orbis Electric (KR) · Voltara (TW, UPS) · Boreal Chillers (US) · Kanto Climate (JP, VRF/AHU) · Tanaka Air (JP, VRF/FCU/fans) · Vega Pumps (ES) · Kestrel Pumps (IT) · Halcyon Fire Systems (US) · Sentinel Detection (UK, FDAS/PA) · Argus Vision (TW, CCTV) · Portis Access (SG) · Cortex Controls (CH, BMS) · Norden Lifts (FI) · Aurum Elevators (JP) · Skyreach BMU (AU) · Terra Stone (IT, finishes) · Lumen Lighting (PH) · Cedar & Co Doors (PH) · Harbor Hardware (DE) · Solis Paints (PH) · Aquila Sanitary (JP) · Marlin Aquatics (AU). One map; a swap to real names is a five-minute edit.

**Models (42)** `models.ts` — 1–2 per equipment type, fictional numbers (`NP-1250S`, `HF-750E`), 4–7 spec keys (`kVA`, `kW`, `Voltage`, `Flow`, `Head`, `Refrigerant`, `Capacity`, `Speed`, `Persons`), `defaultWarrantyMonths` 12–36; 2 models `discontinued` with `successorModelId`.

**Standards (10)** `standards.ts` — RDS-EL-01 Generator sets & transfer switches (GEN, DT, ATS) · RDS-EL-02 Transformers & LV switchgear (TX, LVS, DP) · RDS-EL-03 UPS & critical power (UPS) · RDS-FP-01 Fire pumps & controllers (FP, FPD, JP) · RDS-VT-01 Passenger & service elevators (EL, ELS) · RDS-ME-01 HVAC primary plant (CHL, CT, VRF, AHU) · RDS-PL-01 Domestic water pumps & tanks (TP, BP, CST, EWT) · RDS-ELV-01 Fire detection & alarm (FDAS, PA) · RDS-ELV-02 CCTV & access control (NVR, ACS) · RDS-ELV-03 Building management system (BMS). Each: 3–5 clauses, 2–4 approvals across tiers (every standard has ≥1 preferred; RDS-FP-01 lists Kestrel as prohibited; RDS-ME-01 lists Tanaka as phase-out), `appliesToTowerIds: []`, revision R1–R3, `ownerTeam: "Design & Technical"`.

**Finishes (24)** `finishes.ts` — FL-01 Lobby stone (Terra Stone Crema) · FL-02 Corridor carpet tile · FL-03 Unit porcelain tile · FL-04 Plant-room epoxy · FL-05 Parking floor hardener · FL-06 Lobby stone alternate (Terra Stone Grigio) · WL-01 Lobby wall stone · WL-02 Corridor vinyl wallcovering · WL-03 Unit paint · WL-04 Plant-room block paint · CL-01 Lobby gypsum ceiling · CL-02 Corridor acoustic tile · CL-03 Office open ceiling · DR-01 Unit entrance door (Cedar & Co) · DR-02 Fire door · HW-01 Lever set (Harbor) · HW-02 Door closer · PT-01 Corridor paint (Solis) · PT-02 Plant-room paint · SN-01 Lavatory (Aquila) · SN-02 Water closet · LT-01 Corridor downlight (Lumen) · LT-02 Lobby pendant · LT-03 Plant-room batten. `swatch` is a hex string used only for the swatch tile (`style={{ background: finish.swatch }}` — the single permitted inline colour, data-driven).

**Finish schedule (46 portfolio rows + 6 overrides)** `finishSchedule.ts` — portfolio rows for space kinds lobby, lift-lobby, corridor, unit, office, amenity, toilet, genset-room, lv-room, pump-room, parking × surfaces floor / wall / ceiling / door / hardware / lighting where sensible. Overrides: EDS lobby floor FL-01→FL-06 (deviation), GRB corridor lighting LT-01→LT-02 (deviation), 8RW office ceiling CL-02→CL-03 (deviation), PRL unit door DR-01 (identical), EDS corridor floor FL-02 (identical), GRB unit paint WL-03 (identical).

**Vendors (12)** `vendors.ts` — Norvik Power Philippines (manufacturer-rep, ELEC) · PowerLine Electrical Services (contractor, ELEC) · Halcyon Fire Philippines (manufacturer-rep, FIRE) · SafeGuard Fire Services (service-provider, FIRE) · Norden Lifts Manila (manufacturer-rep, VT) · Kanto Climate PH (manufacturer-rep, HVAC) · ChillTech Mechanical (service-provider, HVAC) · AquaFlow Pumps & Tanks (supplier, PLUMB) · Sentinel Systems Integrators (contractor, ELV) · Cortex BMS Services (service-provider, ELV) · Terra Interiors Supply (supplier, ARCH) · MetroBuild General Contractors (contractor, ARCH/STRUCT). 1–3 contacts each, 7 with contracts (SLA 2–24 h), 2 with `accreditationExpiry` within 60 days.

**Team members (11)** `team.ts` — 4 Property Managers (one per tower), 4 Building Engineers (one per tower), 2 Technicians (Engineering, all towers), 1 Design & Technical lead (all towers). Fictional Filipino names, `+63 917` numbers, `@example.rockwell.test` e-mails.

**Plan templates (7)** `plans.ts` — §5.3.

### 5.2 Generated at load (`src/data/seed/generate.ts`)

- **Floors** — every level of every tower (157 rows). `kind`: lowest basement `basement-plant`, other basements `basement-parking`, 0 `ground`, podium level `podium`, roof `roof`, else `typical`; `templateId` from kind (`typical-res` / `typical-office` by tower use).
- **Spaces** — one per template room per floor (≈2,400 rows; id `${floorId}-${code.toLowerCase()}`), `rect` copied from the template, `areaSqm = round(w*h*0.9)`.
- **Assets (≈190)** — per tower from a placement table `(equipmentTypeId, count, roomCode, floorKey)` where `floorKey` ∈ lowest / b1 / gf / podium / roof / sample. Residential core (37 + elevators): lowest basement — GEN 2 + DT 1 in GEN; TX 1 (PRL 2) in TX; LVS 1 + ATS 1 in LV; FP 1, FPD 1, JP 1, SAV 1 in FPR; TP 2 + CST 1 in CT; BP 2 in PMP; STP 1 in STP; UPS 1, BMS 1, CA 1 in MDF. B1 — SP 1 in SMP; PB 1 in DRV. GF — FDAS, NVR, ACS, PA (1 each) in FCC; FAC 1 in LOB. Podium — AHU 1 in AHU; PF 1 in POOL. Roof — VRF 3 + WP 1 in VRF; SPF 2 in EXH; EWT 1 in TANK; LPS 1 in LPS; BMU 1 in BMU; elevators in EMR: EDS 6 / PRL 8 / GRB 4, the last one `ELS`. Office core (8RW, 39 + 6 elevators): the residential core minus VRF and PF (no podium floor either), plus CHL 2 + CWP 2 in CHP, CT 2 in roof CT, and NVR 2 instead of 1 (one Argus, one Portis — both acceptable, so compliant). One **sample typical floor** per tower (EDS L12, PRL L20, GRB L15, 8RW L10) gets DP 1 in EE, SAV 1 in ST1 and FCU 2 in U01 / U06 (residential) or AHU 2 in AHU1 / AHU2 (office). Tag `TOWER-FLOOR-PREFIX-NN`; serial `${brand initials}-${year}-${6 digits}`; install within 12 months of turnover (≈10 % replaced 2022–2025); `criticality` from type; `condition` 70 / 22 / 8 % good / fair / poor; status 90 % in-service, 5 % standby, 4 % under-repair, 1 % decommissioned; explicit `pin` only where a room holds 3+ assets, others via `assetPin()`. Injected deviations: GRB fire pumps on Kestrel (prohibited), PRL VRF units on Tanaka (phase-out), pool pumps with no governing standard.
- **Warranties** — one per asset: start = commissionDate, end = start + model default months, then re-spread so ≈15 expired, ≈12 expiring ≤ 90 d, ≈10 ≤ 365 d; `coverage` ∈ {"Parts & labour", "Parts only", "Compressor 5 y / parts 1 y"}; `docId` for the 6 newest.
- **Documents (≈94)** — per tower 8 as-built sets, one per discipline (docNo `EDS-A-AB`, `EDS-S-AB`, `EDS-E-AB`, `EDS-M-AB`, `EDS-P-AB`, `EDS-FP-AB`, `EDS-ELV-AB`, `EDS-VT-AB` ↔ ARCH, STRUCT, ELEC, HVAC, PLUMB, FIRE, ELV, VT; 1–3 revisions; `links` govern the plant floors — lowest basement, B1, GF, podium, roof — plus the sample floor, and every asset of that discipline); 4 ELEC as-built predecessors (`EDS-E-AB-R0`, status superseded, `supersededById`; each keeps `governs` links to 2 ELEC assets that the current `EDS-E-AB` deliberately omits, so those assets read "stale"); 4 O&M manuals per tower (gensets, fire pumps, elevators, HVAC plant) referencing their assets and model; 2 T&C reports per tower (genset load bank, fire-pump flow test) certifying assets; 20 permit certificates; 6 warranty certificates; 6 datasheets linked to models; 2 for-review shop drawings. Two more injected record gaps for the dashboard panel: `GRB-ELV-AB` is `for-review` (GRB ELV coverage reads missing) and `8RW-P-AB` does not govern the roof floor. Sizes 180–14,000 KB, pages 2–120, `fileName` `<docNo>-<rev>.pdf`.
- **Permits (20)** — per tower: occupancy (expiry `2099-12-31`, shown as "No expiry"), FSIC (annual, issuer BFP Makati/Pasig), electrical (annual, city building office), elevator (annual), genset-ECC (DENR-EMB, 5-yearly); 8RW swaps genset-ECC for water-discharge (LLDA). Offsets give 2 expired, 4 due ≤ 60 d.
- **Waivers (2)** — `waiver-1`: asset `grb-b2-fp-01` (electric fire pump on Kestrel) under `RDS-FP-01`, expires in 180 d — so `grb-b2-fp-01` reads `waived` while `grb-b2-fpd-01` stays a `deviation`; `waiver-2`: asset `prl-rd-vrf-01` under `RDS-ME-01`, no expiry — the other two PRL VRF units stay `phase-out`.
- **PM plans (≈48)** — one per criticality-A asset, plus B assets of types DT, JP, STP, CST, EWT, VRF, SPF, UPS, BMS: `task`, `frequency`, `checklist` from `EquipmentType.pmTasks[0]`; `regulatory` + `permitId` for FSIC (fire pumps, FDAS), elevator permit (elevators), genset-ECC (gensets); `vendorId` = asset `serviceVendorId` when set, else `assigneeTeam: "Engineering"`; `nextDue` spread so 6 overdue, 10 due ≤ 14 d, rest across 12 months; `lastDone = nextDue − frequency`.
- **Work orders (25)** — numbers `WO-2026-0101…0125`; 10 open (2 P1: "Genset 2 failed to start on monthly test", "Fire pump churn pressure low"; 3 P2), 4 in-progress, 2 on-hold, 8 done, 1 cancelled; 60 % preventive (`planId`), 40 % corrective (leak, breaker trip, elevator entrapment, pump vibration, CCTV offline); timeline 1–4 events; 3 open ones past `dueAt`.
- **Inspections (≈90)** — 12 monthly readings for 6 trend assets (EDS-B3-GEN-01 Hz / V / oil pressure; PRL-B4-FP-01 churn pressure; 8RW-B5-TX-01 winding temp; GRB-RD-EL-01 ride quality; 8RW-RD-CT-01 approach temp; EDS-GF-FDAS-01 battery voltage) + ≈18 misc; 6 `fail` (4 linked to open WOs, 2 within 90 d for the health score).

`verifySeed(db)` (same file; runs once in `import.meta.env.DEV` and in the gate; throws with the full list): every FK resolves; `asset.towerId / floorId` equal the space chain; every explicit pin lies inside its space rect; template rooms never overlap and stay inside the 2…98 × 2…60.5 margin; every asset has exactly one warranty; every permit `docId` is a `permit` document; standards reference existing types and brands; no duplicate ids or tags; no string field contains "department" (case-insensitive).

### 5.3 Programmatic floor plans

Plans are never stored. `PLAN_TEMPLATES` in `src/data/seed/plans.ts` holds axis-aligned rooms on a `0 0 100 62.5` viewBox (16:10, 2-unit margin). The foundation renderer `src/components/plan/FloorPlanSvg.tsx` is a pure function of `(template, spaces, pins, options)` and holds no state:

- `viewBox?: Rect` (default `{x:0, y:0, w:100, h:62.5}`) is the only zoom / pan mechanism: a caller that wants zoom narrows the rect from its own pointer handlers; the renderer never transforms internally.
- outline `rect 1 1 98 60.5` stroke `line-strong` 0.6, fill `surface`; rooms fill by kind (`lift-lobby` / `stair` hatched `surface-2` via `<pattern>`; `corridor` / `parking` / `roof-deck` `surface-2`; plant kinds `surface`; `unit` / `office` / `retail` / `amenity` / `pool` `paper`), stroke `line-strong` 0.35; label at centroid (`fill-muted`, 2.2 units, name truncated at 18 chars, code below at 1.8 units); north arrow top-right; "Schematic — not to scale" bottom-left; pins `<g role="button" tabIndex=0>` circle r 1.6 with discipline tone fill (`fill-navy`, `fill-gold`, `fill-info`, `fill-ok`, `fill-warn`, `fill-danger`, `fill-muted`, `fill-ink-soft`), white 0.35 stroke, selected ring r 2.6 `stroke-gold` at 40 % opacity, label = tag suffix on hover / selection, `<title>{pin.title}</title>` inside the `<g>` as the native tooltip (no custom tooltip component anywhere); `compact` drops labels below 1.6 units and hides the note.
- All fills and strokes are CSS classes so dark mode is automatic; Tailwind v4 generates `fill-*` / `stroke-*` from the `--color-*` theme.

Templates (verbatim; F1-a copies into `plans.ts`; rooms never overlap and stay inside `2 ≤ x, y` / `x+w ≤ 98` / `y+h ≤ 60.5` — `verifySeed` asserts both):

```ts
export const PLAN_TEMPLATES: Record<PlanTemplateId, PlanTemplate> = {
  "basement-plant": { id: "basement-plant", rooms: [
    { code: "GEN", name: "Genset room", kind: "genset-room", x: 2, y: 2, w: 20, h: 16 },
    { code: "TX", name: "Transformer vault", kind: "transformer-vault", x: 22, y: 2, w: 14, h: 16 },
    { code: "LV", name: "LV switchgear room", kind: "lv-room", x: 36, y: 2, w: 16, h: 16 },
    { code: "FPR", name: "Fire pump room", kind: "fire-pump-room", x: 52, y: 2, w: 16, h: 16 },
    { code: "PMP", name: "Domestic pump room", kind: "pump-room", x: 68, y: 2, w: 14, h: 16 },
    { code: "STP", name: "Sewage treatment plant", kind: "stp", x: 82, y: 2, w: 16, h: 16 },
    { code: "PK1", name: "Parking zone A", kind: "parking", x: 2, y: 20, w: 38, h: 22.5 },
    { code: "CORE", name: "Lift core & stairs", kind: "lift-lobby", x: 42, y: 24, w: 16, h: 14 },
    { code: "PK2", name: "Parking zone B", kind: "parking", x: 60, y: 20, w: 20, h: 22.5 },
    { code: "CHP", name: "Chiller plant", kind: "chiller-plant", x: 80, y: 20, w: 18, h: 22.5 },
    { code: "MDF", name: "MDF / BMS room", kind: "bms-room", x: 2, y: 44.5, w: 16, h: 16 },
    { code: "DRV", name: "Driveway", kind: "corridor", x: 20, y: 44.5, w: 60, h: 16 },
    { code: "CT", name: "Cistern & transfer pumps", kind: "pump-room", x: 82, y: 44.5, w: 16, h: 16 },
  ]},
  "basement-parking": { id: "basement-parking", rooms: [
    { code: "EE", name: "Electrical room", kind: "lv-room", x: 2, y: 2, w: 12, h: 10 },
    { code: "DRV", name: "Driveway", kind: "corridor", x: 16, y: 2, w: 68, h: 10 },
    { code: "SMP", name: "Sump pump pit", kind: "pump-room", x: 86, y: 2, w: 12, h: 10 },
    { code: "PK1", name: "Parking zone A", kind: "parking", x: 2, y: 14, w: 38, h: 46.5 },
    { code: "CORE", name: "Lift core & stairs", kind: "lift-lobby", x: 42, y: 14, w: 16, h: 24 },
    { code: "RMP", name: "Ramp", kind: "corridor", x: 42, y: 40, w: 16, h: 20.5 },
    { code: "PK2", name: "Parking zone B", kind: "parking", x: 60, y: 14, w: 38, h: 46.5 },
  ]},
  ground: { id: "ground", rooms: [
    { code: "FCC", name: "Fire command centre", kind: "fcc", x: 2, y: 2, w: 14, h: 12 },
    { code: "SEC", name: "Security office", kind: "office", x: 16, y: 2, w: 12, h: 12 },
    { code: "LOB", name: "Main lobby", kind: "lobby", x: 30, y: 2, w: 40, h: 20 },
    { code: "RT1", name: "Retail unit 1", kind: "retail", x: 72, y: 2, w: 26, h: 14 },
    { code: "MAIL", name: "Mail room", kind: "office", x: 2, y: 16, w: 12, h: 10 },
    { code: "ADM", name: "Property management office", kind: "office", x: 14, y: 16, w: 14, h: 10 },
    { code: "RT2", name: "Retail unit 2", kind: "retail", x: 72, y: 18, w: 26, h: 14 },
    { code: "EE", name: "Electrical room", kind: "lv-room", x: 2, y: 28, w: 12, h: 10 },
    { code: "TEL", name: "Telco room", kind: "mdf", x: 14, y: 28, w: 14, h: 10 },
    { code: "CORE", name: "Lift core & stairs", kind: "lift-lobby", x: 42, y: 24, w: 16, h: 14 },
    { code: "LOAD", name: "Loading dock", kind: "parking", x: 72, y: 34, w: 14, h: 10 },
    { code: "REF", name: "Refuse room", kind: "refuse", x: 86, y: 34, w: 12, h: 10 },
    { code: "COR", name: "Corridor", kind: "corridor", x: 2, y: 44, w: 96, h: 4 },
    { code: "DRP", name: "Drop-off & drive", kind: "corridor", x: 2, y: 48, w: 96, h: 12.5 },
  ]},
  podium: { id: "podium", rooms: [
    { code: "POOL", name: "Swimming pool deck", kind: "pool", x: 2, y: 2, w: 40, h: 30 },
    { code: "GYM", name: "Fitness gym", kind: "amenity", x: 44, y: 2, w: 26, h: 16 },
    { code: "FR1", name: "Function room 1", kind: "amenity", x: 72, y: 2, w: 26, h: 16 },
    { code: "AHU", name: "AHU room", kind: "ahu-room", x: 44, y: 20, w: 12, h: 14 },
    { code: "EE", name: "Electrical room", kind: "lv-room", x: 58, y: 20, w: 12, h: 14 },
    { code: "FR2", name: "Function room 2", kind: "amenity", x: 72, y: 20, w: 26, h: 14 },
    { code: "KIDS", name: "Play area", kind: "amenity", x: 2, y: 34, w: 20, h: 16 },
    { code: "GARD", name: "Garden deck", kind: "roof-deck", x: 22, y: 34, w: 18, h: 16 },
    { code: "CORE", name: "Lift core & stairs", kind: "lift-lobby", x: 42, y: 36, w: 16, h: 14 },
    { code: "CHG", name: "Changing rooms", kind: "toilet", x: 60, y: 36, w: 38, h: 14 },
    { code: "COR", name: "Corridor", kind: "corridor", x: 2, y: 52, w: 96, h: 8.5 },
  ]},
  "typical-res": { id: "typical-res", rooms: [
    { code: "U01", name: "Unit 01", kind: "unit", x: 2, y: 2, w: 24, h: 18 },
    { code: "U02", name: "Unit 02", kind: "unit", x: 26, y: 2, w: 24, h: 18 },
    { code: "U03", name: "Unit 03", kind: "unit", x: 50, y: 2, w: 24, h: 18 },
    { code: "U04", name: "Unit 04", kind: "unit", x: 74, y: 2, w: 24, h: 18 },
    { code: "CORN", name: "Corridor", kind: "corridor", x: 2, y: 20, w: 96, h: 4 },
    { code: "U05", name: "Unit 05", kind: "unit", x: 2, y: 24, w: 34, h: 16 },
    { code: "ST1", name: "Fire exit stair 1", kind: "stair", x: 36, y: 24, w: 6, h: 16 },
    { code: "LL", name: "Lift lobby", kind: "lift-lobby", x: 42, y: 24, w: 16, h: 10 },
    { code: "EE", name: "Electrical closet", kind: "riser", x: 42, y: 34, w: 8, h: 6 },
    { code: "TEL", name: "Telco closet", kind: "riser", x: 50, y: 34, w: 8, h: 6 },
    { code: "ST2", name: "Fire exit stair 2", kind: "stair", x: 58, y: 24, w: 6, h: 16 },
    { code: "U06", name: "Unit 06", kind: "unit", x: 64, y: 24, w: 34, h: 16 },
    { code: "CORS", name: "Corridor", kind: "corridor", x: 2, y: 40, w: 96, h: 4 },
    { code: "U07", name: "Unit 07", kind: "unit", x: 2, y: 44, w: 24, h: 16.5 },
    { code: "U08", name: "Unit 08", kind: "unit", x: 26, y: 44, w: 24, h: 16.5 },
    { code: "U09", name: "Unit 09", kind: "unit", x: 50, y: 44, w: 24, h: 16.5 },
    { code: "U10", name: "Unit 10", kind: "unit", x: 74, y: 44, w: 24, h: 16.5 },
  ]},
  "typical-office": { id: "typical-office", rooms: [
    { code: "OP1", name: "Open plan office west", kind: "office", x: 2, y: 2, w: 34, h: 58.5 },
    { code: "AHU1", name: "AHU room north", kind: "ahu-room", x: 36, y: 2, w: 28, h: 10 },
    { code: "EE", name: "Electrical room", kind: "riser", x: 36, y: 12, w: 14, h: 10 },
    { code: "TEL", name: "Telco room", kind: "riser", x: 50, y: 12, w: 14, h: 10 },
    { code: "ST1", name: "Fire exit stair 1", kind: "stair", x: 36, y: 22, w: 6, h: 12 },
    { code: "LL", name: "Lift lobby", kind: "lift-lobby", x: 42, y: 22, w: 16, h: 12 },
    { code: "ST2", name: "Fire exit stair 2", kind: "stair", x: 58, y: 22, w: 6, h: 12 },
    { code: "TOI", name: "Toilets", kind: "toilet", x: 36, y: 34, w: 28, h: 10 },
    { code: "COR", name: "Corridor", kind: "corridor", x: 36, y: 44, w: 28, h: 6.5 },
    { code: "AHU2", name: "AHU room south", kind: "ahu-room", x: 36, y: 50.5, w: 28, h: 10 },
    { code: "OP2", name: "Open plan office east", kind: "office", x: 64, y: 2, w: 34, h: 58.5 },
  ]},
  roof: { id: "roof", rooms: [
    { code: "CT", name: "Cooling tower deck", kind: "roof-deck", x: 2, y: 2, w: 36, h: 24 },
    { code: "LPS", name: "Lightning mast & antenna", kind: "roof-deck", x: 42, y: 2, w: 16, h: 16 },
    { code: "TANK", name: "Elevated water tanks", kind: "tank-deck", x: 62, y: 2, w: 36, h: 24 },
    { code: "EMR", name: "Elevator machine room", kind: "elevator-machine-room", x: 42, y: 20, w: 16, h: 16 },
    { code: "VRF", name: "Condenser / VRF deck", kind: "roof-deck", x: 2, y: 28, w: 36, h: 32.5 },
    { code: "EXH", name: "Exhaust & pressurisation fans", kind: "ahu-room", x: 62, y: 28, w: 36, h: 14 },
    { code: "ST", name: "Roof stair", kind: "stair", x: 42, y: 38, w: 16, h: 8 },
    { code: "BMU", name: "Gondola / BMU parking", kind: "roof-deck", x: 62, y: 44, w: 36, h: 16.5 },
  ]},
};
```

`assetPin(asset, space, indexInSpace, countInSpace)`: explicit `asset.pin` if present; centroid when the room holds one asset; otherwise points on a ring of radius `min(w, h) * 0.3` at angle `2π·i/n − π/2`, rounded to 0.1. Every mini-plan uses this same function so pins never disagree between screens.

---

## 6. Feature areas

Ten independent folders under `src/features/<key>/`. Each owns exactly its routes, imports only from `@/data/*`, `@/components/*`, `@/lib/*`, `@/app/NotFound`, `@/app/useTheme` and `@/app/useTowerScope`, and links to other features only through `paths.*`. Each folder ships `routes.tsx` (`const routes = [...] satisfies RouteObject[]; export default routes;` — absolute paths exactly as §3, page elements via `React.lazy(() => import("./pages/X"))`) plus `pages/*.tsx` and local components; `router.tsx` already spreads it, so a feature agent never edits anything outside its folder — not `router.tsx`, `smoke.ts`, `selectors.ts`, `paths.ts`, `index.css` or `README.md`. A derived value a feature needs that §7 does not list is computed in `src/features/<key>/lib.ts`, never added to `selectors.ts`; page-specific print hiding uses Tailwind's `print:` variant (`print:hidden`, `hidden print:block`), never a local `<style>`. **Common acceptance for all:** renders from seed with no console errors; `EmptyState` on no data and a 404 card on a bad id; light and dark checked; 390 px wide with no horizontal page scroll; tower scope honoured on list routes; only files under its folder changed; `paths` for every cross-feature link; tone map from `@/lib/status`; no local re-implementation of a foundation selector.

### 6.1 `dashboard` — Portfolio dashboard · `/`
Executive landing. **Key UI:** navy hero (eyebrow "Rockwell Building · Portfolio", H1 "Building Information System", lede, gold "Sample data" pill); KPI row (assets in service, open work orders with "n P1 · n P2" delta, PM overdue [hot], warranties ≤ 90 d, permits due or expired, current as-built coverage %); tower health cards (score numeral, band badge, counts for open WOs / overdue PM / permits due / docs, link); "Needs attention" list grouped by tower — overdue PM, P1/P2 open WOs, permits due or expired, warranties ≤ 30 d, failed inspections — each row a `Link`; "Record gaps" panel (floors missing a current as-built per discipline, assets without O&M reference, assets linked only to superseded sheets) linking to filtered registers; 14-day PM strip (inline SVG bars per day, navy, today gold); "Ten-minute tour" card: ordered steps with caption + deep link (dashboard → EDS tower → B3 plan FIRE layer → `eds-b3-fp-01` passport → log visit → raise WO → board → compliance matrix → Kestrel brand page impact panel (prohibited under RDS-FP-01) → permits → `doc-eds-e-ab` revision timeline). **Acceptance:** every number comes from `portfolioKpis`, `towerHealth`, `attentionItems`, `recordGaps`; tour links resolve to seeded ids; hero and pill text exact. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/dates.

### 6.2 `towers` — Towers & tower overview · `/towers`, `/towers/:towerId`
The per-building anchor. **Key UI:** Towers page = card grid (name, estate, use, floors above / below, GFA, turnover year, asset count, open WOs, health badge); no table view (four towers). Tower overview = `PageHeader` (eyebrow estate, H1 tower, lede address) with actions "Raise work order" (primary, prefilled `towerId`) and "Floor plans" (ghost → lowest basement plan); facts `KV` card (address, levels, GFA, turnover, property manager with `tel:` / `mailto:` buttons, PMO phone / e-mail, team contacts from `teamMembers.towerIds`); floor stack (scrollable list of floor pills RD → GF → B-n with asset counts; selected floor shows a `compact` `FloorPlanSvg` beside it; "Open plan" link); systems summary table per discipline (assets, overdue PM, open WOs, compliance %); discipline coverage matrix (rows = floors that hold assets, columns = disciplines, cell current / superseded / missing from `asBuiltCoverage`); permits strip with status badges and link to `/permits?tower=`; key documents (current as-builts with latest rev); open items (top 8 from `attentionItems(towerId)`). **Acceptance:** tower 404 card; stack lists all levels in order; matrix values only from `asBuiltCoverage`; follows the detail-page template. **dependsOn:** data/store, data/selectors, components/ui, components/plan, lib/paths, lib/status.

### 6.3 `floorplans` — Floor plan & space detail · `/towers/:towerId/floors/:floorId`, `/spaces/:spaceId`
"Where is the equipment." **Key UI:** breadcrumb Towers › tower › floor; header with prev / next floor buttons and a floor `<select>`; discipline layer chips (multi-select with counts, synced to `?layer=`); plan canvas (`FloorPlanSvg` full width in `aspect-[16/10]`; wheel zoom 1–4× and drag pan implemented in the feature by narrowing the `viewBox` prop from pointer events; double-click and a "Fit" button reset it); pin hover tooltip comes free from the pin's `<title>`; pin click → right `Drawer` (tag mono, type, brand · model, status and condition badges, next PM, warranty band, governing sheet with a `warn` badge when stale, vendor phone, buttons "Open passport", "Raise work order"); room click → rect highlight + space panel (assets in room, link to space detail); `?highlight=asset:ID|space:ID|doc:ID` pre-selects and centres (doc highlights every room and pin the document governs); side list of spaces with asset counts. Space detail = facts (tower, floor, kind, area), `compact` plan with the room highlighted, assets table, documents governing the space, finish schedule for the space kind with tower overrides marked (`finishesFor`), "Raise work order" prefilled with `spaceId`. **Acceptance:** every one of the 157 floors renders; all three highlight kinds work; pins only via `pinsForFloor`; pins reachable by keyboard (Tab, Enter opens drawer); phone: tap opens drawer. **dependsOn:** data/store, data/selectors, components/ui, components/plan, lib/paths, lib/status.

### 6.4 `assets` — Asset registry & passport · `/assets`, `/assets/:assetId`, `/a/:tag`
Core CAFM record. **Key UI:** registry = KPI row (total, in service, under repair, warranty ≤ 90 d), toolbar (`SearchInput` over tag / serial / model / room → `q`; discipline chips → `discipline`; selects tower / type / status / warranty band → `tower` / `type` / `status` / `band`; quick chips "Overdue PM" → `pm=overdue`, "Warranty ≤ 90 d" → `band=30d,90d`, "Criticality A" → `crit=A`, "Non-compliant" → `compliance=deviation`; link-only `brand=` / `model=` / `vendor=` render as a removable chip "Brand: Kestrel Pumps ×" in the same row; every control reads and writes the route query, nothing else holds filter state), `DataTable` (tag mono, type, brand · model, tower / floor / room, status, condition, warranty band, next PM, governing sheet with a `warn` badge when superseded or none, compliance badge) — sorting and 50-row pages come from `DataTable` itself — CSV export of the filtered set. Passport = breadcrumb; header (eyebrow tower · floor · room, H1 type + sequence e.g. "Fire pump (electric) 01", sub-line tag · S/N mono); actions "Raise work order" (primary), "Log visit", "Edit", "Print" (`window.print()`); local tabs Overview / Documents / Maintenance / History synced to `?tab=`. Overview: location card (`compact` plan with the pin selected + "Show on plan"), specs `KV` (brand link, model link, model specs, rating, serial, install / commission, criticality, condition, status, parent asset), warranty card (band badge, days left, coverage, vendor tap-to-call, certificate link), compliance card (standard link, tier, waiver), QR card (25×25 placeholder pattern from `qrPlaceholderCells(tag)`, caption "Placeholder — encodes /a/<TAG>", print button). Documents: `DocumentCard` grid from `docsFor("asset", id)` grouped by relation. Maintenance: PM plans (due badge, "Mark done" → `newInspection({assetId, planId})`), open WOs. History: `serviceHistory(id)` `Timeline` + sparklines (inline SVG polyline per reading label, last 12 points, navy line, last point gold). Edit `Modal`: status, condition, serial, notes → `upsert("assets")`. `/a/:tag` resolves case-insensitively and `<Navigate replace>`s to the passport, else a 404 card showing the tag. Print stylesheet: one-page passport. **Acceptance:** CSV opens with headers matching visible columns; filters survive reload; `/a/EDS-B3-FP-01` cold-loads on Vercel; edits persist after reload and clear on reset; no hand-typed dates. **dependsOn:** data/store, data/selectors, components/ui, components/plan, lib/paths, lib/status, lib/csv, lib/dates, lib/qr.

### 6.5 `standards` — Design standards, finishes & compliance · `/standards`, `/standards/:standardId`, `/finishes`, `/compliance`
The design repository's rulebook. **Key UI:** shared `PageHeader` "Design standards" with route tabs Standards / Finishes / Compliance. Standards list grouped by discipline: code mono, title, revision, effective date, owner team, approved-brand chips coloured by tier (`tierTone`), adoption bar (compliant share across towers, inline SVG). Standard detail: clauses list, approvals table (brand link, tier badge, note) with a demo tier `<select>` per row (`upsert("standards")`), installed assets table with compliance badge per asset, "Applies to" tower chips, linked documents, waivers for this standard. Finishes: matrix space kinds × surfaces, cell = swatch tile + finish code (hover shows finish name); tower `<select>` overlays overrides (cell gets a gold ring; deviating cells a danger dot; legend); finish library table below (swatch, code, name, category, brand, supplier); read-only this phase. Compliance: heatmap towers × standards from `complianceMatrix()` (cell = (compliant + waived) / total as % plus deviation count; tone ok ≥ 95, warn ≥ 80, danger < 80, neutral n/a); click → `Drawer` listing deviating assets (tag, brand, model, floor / room link, tier, waiver) with "Raise waiver" (`Modal` → `upsert("waivers")`) and "Raise work order" (prefilled link); finish deviation row per tower from `finishDeviations`. Waivers appear only on the standard detail and in that drawer (no standalone waivers list). **Acceptance:** all compliance numbers via `complianceFor` / `complianceMatrix` / `finishDeviations`; a tier change immediately changes the matrix cell; the swatch is the only inline colour. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/dates.

### 6.6 `catalogue` — Brands & models · `/catalogue`, `/catalogue/brands/:brandId`, `/catalogue/models/:modelId`
The "brands" half of the design repository. **Key UI:** catalogue = brand card grid (`Monogram`, name, country, discipline chips, best approval tier badge, installed count) + models `DataTable` (model no mono, brand, type, key spec, installed count, discontinued badge) with type / discipline filters, search and CSV. Brand page: header with monogram, approval-by-standard table (standard link, tier), models list with spec summary, where-used (per-tower installed counts as inline SVG bars + assets table), vendors representing the brand, **phase-out impact panel** from `brandImpact(brandId)` (assets affected, towers, remaining warranty in asset-months, open WOs on those assets, oldest install). Model spec sheet: `KV` specs, datasheet document link, installed instances grouped by tower, warranty spread (expired / ≤ 90 d / active counts), successor link when discontinued, "Print" (A4, header with model no). **Acceptance:** every seeded brand and model renders; where-used counts equal registry filter counts; printed sheet fits one page. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/csv.

### 6.7 `documents` — Document register & permits · `/documents`, `/documents/:docId`, `/permits`
As-built truth. **Key UI:** header "Documents" with route tabs Register / Permits. Register: KPI row (current, superseded still linked, for review, permits due); toolbar (search title / docNo, type chips, selects tower / discipline / status, "Current only" toggle default on); `DataTable` (docNo mono, title, type badge, discipline, tower · floor, rev, rev date, status badge, links count) with CSV; "Add document" `Modal` (docNo, title, type, discipline, tower, floor, rev, one linked asset by tag) → `upsert("documents")`. Document detail: title-block placeholder (inline SVG sheet with tower, docNo, title, rev, date, "Sample — no file attached"); metadata `KV`; revision `Timeline` (rev, date, issued by, reason); supersession chain (supersedes / superseded-by links; `warn` `Notice` when superseded and still linked); "Where used" local tabs (assets, spaces, floors, other) with "Show on plan" (`paths.floor(..., {highlight: "doc:<id>"})` on the first governed floor); "Add revision" `Modal` (rev, date, issued by, reason → appends to `revisions`). Permits: KPI row (valid, due ≤ 60 d, expired); table (tower, type label, number mono, issuer, issued, expires or "No expiry", status badge, renewal PM plan link, certificate link); tower and type filters; CSV; "Renew" `Modal` (new number, issued, expires → `upsert("permits")`). **Acceptance:** permit status only via `permitStatus`; "Current only" hides superseded and for-review; document 404 card; a doc with no links shows `EmptyState` in Where used. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/csv, lib/dates.

### 6.8 `maintenance` — PM schedule & inspections · `/maintenance`, `/maintenance/:planId`, `/inspections`, `/inspections/new`, `/inspections/:inspectionId`
The FM heartbeat. **Key UI:** header "Maintenance" with route tabs Schedule / Inspections. Schedule: KPI row (overdue [hot], due ≤ 14 d, this month, regulatory due); view toggle List / Calendar (`?view=`); filters tower / discipline / team / regulatory. List `DataTable` (asset tag, task, frequency, team or vendor, last done, next due, status badge, regulatory badge with permit link) + CSV. Calendar = native month grid from `monthGrid()` (Mon–Sun, prev / next, `?month=`), each cell lists up to 3 plan chips coloured by status with "+n"; overdue items also appear in today's cell with a danger badge; chip → plan detail. Plan detail: checklist, asset card, frequency, team / vendor, regulatory permit, next 6 due dates, visit history (inspections with this `planId`), "Mark done" → `newInspection({assetId, planId})`. Inspections log: table (date, tower, asset, type, inspector, result badge, findings excerpt, WO link) with filters and CSV; row expands readings. New inspection: phone-first form (asset picker with search, type, date default today, inspector `<select>` over `teamMembers` whose `towerIds` include the asset's tower — default the tower's Building Engineer — stored as the member's name in `inspector` and as `reportedById` on any work order raised, result, readings rows label / value / unit with add / remove, findings, toggle "Raise work order from findings" enabled when result ≠ pass, priority select) → `upsert("inspections", { id: newId("insp"), … })`; with `planId`: `upsert("pmPlans", { ...plan, lastDone: date, nextDue: addFrequency(date, plan.frequency) })` (`upsert` always takes the full row); with toggle on: `upsert("workOrders")` corrective linked to the asset; then navigate to the new inspection with an `ok` `Notice`. Inspection detail: result, readings table, findings, asset and WO links. **Acceptance:** due status only via `dueStatus`; marking done removes the plan from overdue after reload; calendar and list agree for any month; form usable at 390 px with 40 px targets. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/csv, lib/dates.

### 6.9 `work-orders` — Work orders · `/work-orders`, `/work-orders/new`, `/work-orders/:woId`
Live demo proof. **Key UI:** header with "New work order" (primary) and view toggle Board / List; filters tower / priority / kind / assignee / vendor. Board = five columns Open / Assigned / In progress / On hold / Done (cancelled behind a chip) with cards (number mono, priority badge, title, tower · asset tag, age, assignee or vendor monogram); status changed by a `<select>` on the card (ponytail: no drag-and-drop; add when asked); overdue cards get a danger left border. List = `DataTable` with CSV. New: cascading `<select>`s tower → floor → space → asset prefilled from the query string, kind, priority, title, description, assign to team member or vendor, due (`<input type="datetime-local">` prefilled with now + the priority target — P1 2 h, P2 8 h, P3 3 d, P4 14 d — and re-prefilled when priority changes), reporter (`<select>` over `teamMembers`, default the tower's Building Engineer) → `upsert("workOrders", { id: newId("wo"), number: nextNumber("WO-2026-"), … })` with a first timeline event, then navigate to detail. Detail: header with status badge and transition buttons (open → assigned → in-progress → on-hold / done; cancel from any non-final state; each appends a `WOEvent`, done sets `completedAt`); asset card (link, location, "Show on plan"); plan link when preventive; assignee / vendor contact card with tap-to-call; `Timeline` of events; add-note form; close-out `Modal` on done (result, notes → also `upsert("inspections")` when kind is preventive or inspection, and when `planId` is set roll the plan exactly as §6.8 does: `upsert("pmPlans", { ...plan, lastDone: today, nextDue: addFrequency(today, plan.frequency) })`). **Acceptance:** create, move and note persist across reload and clear on reset; board counts equal list counts; overdue = `isOverdueWo`. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/csv, lib/dates.

### 6.10 `vendors` — Vendors, contacts & warranty register · `/vendors`, `/vendors/:vendorId`, `/warranties`
"Who do I call, and is it still covered." **Key UI:** Vendors = card grid (`Monogram`, name, kind badge, discipline chips, primary contact with `tel:` / `mailto:` buttons, contract end, SLA hours, accreditation badge when ≤ 60 d, assets served, open WOs) with CSV; filters kind / discipline / tower; no table view (12 vendors). Vendor detail: contacts list, contract card (ref, dates, SLA, scope), brands represented (links), assets serviced table, PM plans performed, WO history with median response hours (reportedAt → first `assigned` / `in-progress` event) and open count, warranties held. Warranties = local tabs (`Tabs` key mode) by band All / Expired / ≤ 30 d / ≤ 90 d / ≤ 365 d / Active with counts, synced to `?band=` (absent = All); `DataTable` (asset tag, type, tower, brand · model, vendor, start, end, days left signed, coverage, certificate link, open WOs during coverage); CSV; "Claim sheet" per row → print-only view (asset identity, serial, warranty terms, vendor contact, certificate ref, WO history). **Acceptance:** bands only via `warrantyBand`; claim sheet prints on one page; vendor 404 card. **dependsOn:** data/store, data/selectors, components/ui, lib/paths, lib/status, lib/csv, lib/dates, lib/format.

---

## 7. Shared foundation (must exist before fan-out)

Two steps. **F0** (one agent, sequential, ≈1 h): `vite.config.ts` (add `resolve.alias` `@` → `src`, and `mode === "gate"` → `build: { outDir: "dist-gate", emptyOutDir: true, ssr: "src/data/seed/check.entry.ts", rollupOptions: { output: { entryFileNames: "check.js" } } }`), `index.html` (design-system §2 fonts + `theme-color`, §5 boot script, favicon link; description meta already there), `public/favicon.svg` (gold rounded square, navy "B"), `main.tsx`, `App.tsx`, `types.ts` (§4.1 verbatim), `paths.ts`, `tokens.css` + `index.css` (including the `@media print` block), `lib/status.ts`, `lib/dates.ts` (F1-a's generator and F1-b's components both need it, so it cannot belong to either), `cn.ts`, a stub `src/data/seed/index.ts` exporting an empty `Db` (so F1-c compiles before F1-a lands), a minimal `EmptyState` + `ui/index.tsx` and a minimal `Loading` (F1-b replaces both), `NotFound.tsx`, a stub `Shell.tsx` that renders only `<Outlet />` (F1-c replaces it), folder skeleton with ten `routes.tsx` stubs each registering every §3 path of that feature with an element that renders `EmptyState` "Coming up", `router.tsx` spreading the ten stubs under the `Shell` layout route, `package.json` scripts (`gate`). **F1** (three agents in parallel, disjoint files; the gate runs once after all three land, so F1-c may import F1-b's component names and F1-a's selectors by the contracts in this spec before they exist): **F1-a seed** — `src/data/seed/*` (replaces the stub `index.ts`), `generate.ts`, `verifySeed`, `selectors.ts`, `check.entry.ts`; **F1-b ui** — `src/components/ui/*` (incl. `EquipmentIcon.tsx`, replacing F0's `EmptyState`, `Loading` and `index.tsx`), `src/components/plan/FloorPlanSvg.tsx`, `lib/csv.ts`, `lib/qr.ts`, `lib/format.ts`; **F1-c app** — `store.ts`, `Shell.tsx` (replacing F0's stub; its sub-components `NavItem`, `NavGroup`, `Brand`, `TowerScopeSelect`, `SearchTrigger`, `ThemeToggle`, `ResetDemo` live in `src/app/shell/*.tsx`), `CommandPalette.tsx`, `useTheme.ts`, `useTowerScope.ts`, `lib/search.ts`, `smoke.ts` (complete for every route up front — ids are deterministic, so feature agents never touch it), `scripts/gate.mjs`, `README.md`. Fan-out starts when `npm run gate` is green with the ten stubs and `/` shows the shell with live seed counts in the palette.

```
src/
  main.tsx                      BrowserRouter + <App/>; StrictMode
  index.css                     design-system §1.2 verbatim + @media print block
  styles/tokens.css             design-system §1.1 verbatim
  app/
    App.tsx                     export default () => useRoutes(routes)   (routes from router.tsx)
    router.tsx                  [{ element: <Shell/>, children: [...ten statically imported feature arrays, { path: "*", element: <NotFound/> }] }]
    NotFound.tsx                props { what?: string; id?: string }; EmptyState (SearchX icon) "Not found" + Button to paths.home(); used by "*" and by every feature's bad-id case
    Shell.tsx                   design-system §3.1; <main><Suspense fallback={<Loading/>}><Outlet/></Suspense></main>; footer text exact
    shell/{NavItem,NavGroup,Brand,TowerScopeSelect,SearchTrigger,ThemeToggle,ResetDemo}.tsx   design-system §3.1 / §4.1 / §5; F1-c
    CommandPalette.tsx          <dialog>; global keydown; results grouped by kind; arrows + Enter; lib/search + paths
    useTheme.ts                 design-system §5
    useTowerScope.ts            { towerId, setTowerId } over store ui.towerScope
    smoke.ts                    export const SMOKE_URLS: string[] — one concrete URL per route with seeded ids, plus 404 cases
  data/
    types.ts                    §4.1 verbatim
    seed/{towers,disciplines,equipmentTypes,brands,models,standards,finishes,finishSchedule,vendors,team,plans}.ts
    seed/generate.ts            buildSeed(): Db (mulberry32 + daysFromNow); verifySeed(db): void
    seed/index.ts               export const SEED = buildSeed(); if (import.meta.env.DEV) verifySeed(SEED)
    seed/check.entry.ts         gate entry: runs verifySeed and prints counts (built with `vite build --mode gate`)
    store.ts                    below
    selectors.ts                below
  components/
    ui/{cn,Button,Card,Badge,StatTile,DataTable,SearchInput,Chip,Tabs,EmptyState,Modal,Drawer,Breadcrumb,DocumentCard,Timeline,Field,Notice,KV,PageHeader,Monogram,Loading,EquipmentIcon,index}.tsx   design-system §4
                                DataTable owns sorting + 50-row pagination (design-system §4.5 Column<T>); EquipmentIcon maps EquipmentIconName → lucide component, falls back to Box
    plan/FloorPlanSvg.tsx       §5.3; props { template: PlanTemplate; spaces: Space[]; pins: PlanPin[]; viewBox?: Rect; selectedAssetId?: Id; highlightSpaceIds?: Id[]; highlightAssetIds?: Id[]; onPinClick?: (assetId: Id) => void; onSpaceClick?: (spaceId: Id) => void; compact?: boolean; className?: string }
  lib/
    paths.ts                    typed builders (below)
    status.ts                   design-system §4.6 maps, pure enum → BadgeTone, imports nothing but types from @/data/types: conditionTone, assetStatusTone, woStatusTone(status, overdue?), priorityTone, dueTone, warrantyTone, docStatusTone, permitTone, complianceTone, tierTone, resultTone, healthTone
    dates.ts                    todayISO() (Asia/Manila calendar date via Intl 'en-CA'), daysFromNow(n), addDays(iso,n), addFrequency(iso,f), daysUntil(iso) (calendar days from todayISO, negative when past), fmtDate(iso) → "14 Mar 2025", fmtDateTime(iso) → "14 Mar 2025 · 09:40", monthGrid(yyyyMm): { month: string; weeks: ISODate[][] } (6 rows × 7, Monday first, padded with adjacent-month days)
    format.ts                   fmtNumber, fmtSqm, initials(name), plural(n, word)   (no currency: no money field this phase)
    csv.ts                      downloadCsv<T>(register, columns: { label: string; value: (row: T) => string | number | null | undefined }[], rows: T[]) — builds the §8 filename itself
    qr.ts                       qrPlaceholderCells(text): boolean[][] (25×25; FNV-1a hash; fixed finder squares)
    search.ts                   buildIndex(db): SearchHit[]; search(index, q, limit = 30)
scripts/gate.mjs                §9
vercel.json                     SPA rewrite (exists)
README.md                       architecture, data model, demo storyline, how to add a tower / standard, Phase 2 path
```

**`store.ts`** — `useSyncExternalStore` over `{ seed: Db, overlay }`. Overlay persisted at `localStorage["rb:v1"]` as `{ v: 1, upserts: Partial<{ [K in Collection]: Record<Id, Row<K>> }>, removed: Partial<Record<Collection, Id[]>>, ui: { towerScope: Id | null } }`; snapshot = seed with overlay applied, rebuilt per write and cached. API: `getDb(): Db` · `useDb<T>(select: (db: Db) => T): T` · `upsert<K extends Collection>(c: K, row: Row<K>): void` · `remove(c: Collection, id: Id): void` · `resetDemo(): void` (called from the rail's "Reset demo data" after a native `confirm()`) · `useUi()` / `setUi(patch)` · `nextNumber(prefix): string` (scans `workOrders[*].number` only: prefix + 4-digit zero-padded max-existing + 1, e.g. `WO-2026-0126`) · `newId(prefix): Id` (`${prefix}-${Date.now().toString(36)}`; every row a feature creates uses it — inspections `insp`, work orders `wo`, documents `doc`, waivers `waiver`, permits keep their id on renew). Every `localStorage` access is try/catch; a private window still works. Only `store.ts` and `useTheme.ts` touch `localStorage`.

**`selectors.ts`** — pure `(db, …) => …` functions (data is small, no memo); `today` parameters default to `todayISO()`; return types are the derived interfaces at the end of §4.1: `assetsIn(db, {towerId?, floorId?, spaceId?}): Asset[]` · `locationOf(db, assetId): Location` · `assetPin(asset, space, i, n): Point` · `pinsForFloor(db, floorId, layers?: DisciplineCode[]): PlanPin[]` · `warrantyFor(db, assetId): Warranty | undefined` and `warrantyBand(end, today): WarrantyBand` (`daysUntil(end)` < 0 → `expired`, 0–30 → `30d`, 31–90 → `90d`, 91–365 → `365d`, else `active`; no row → `none`) · `dueStatus(nextDue, today): DueStatus` (overdue < today; due ≤ 14 d) · `permitStatus(expiry, today): PermitStatus` (expired < today; due ≤ 60 d) · `docsFor(db, kind: LinkKind, id): Document[]` · `governingSheet(db, assetId): {doc: Document; stale: boolean} | null` (as-built with a `governs` link to the asset, its space or its floor for the asset's discipline; current preferred; `stale` when only superseded) · `asBuiltCoverage(db, towerId): CoverageCell[]` (one cell per floor that holds ≥ 1 asset × discipline present on that floor; `current` when a current as-built of that discipline governs the floor or any of those assets, `superseded` when only a superseded one does; coverage % = current / cells) · `recordGaps(db, towerId?): RecordGap[]` (one row per kind per tower with a count > 0; `href` = the filtered register) · `standardFor(db, asset): Standard | undefined` (a standard whose `equipmentTypeIds` contains the asset's type and whose `appliesToTowerIds` is empty or contains the tower) · `complianceFor(db, asset, today): Compliance` (precedence: unexpired waiver → `waived`; no standard → `no-standard`; tier `preferred` / `acceptable` → `compliant`; `phase-out` → `phase-out`; `prohibited` or brand not listed → `deviation`) · `complianceMatrix(db): ComplianceCell[]` (one cell per tower × standard; `total` counts only assets governed by that standard) · `finishesFor(db, spaceKind, towerId): FinishRow[]` and `finishDeviations(db, towerId?): FinishDeviation[]` · `brandImpact(db, brandId): BrandImpact` · `serviceHistory(db, assetId): HistoryItem[]` (WO corrective → `repair`, preventive → `PM`, inspection / project as named; inspection logs → `inspection`; newest first) · `readingsSeries(db, assetId): Record<string, {date: ISODate; value: number; unit: string}[]>` · `openWorkOrders(db, {towerId?, assetId?, vendorId?}): WorkOrder[]` (status ∉ done / cancelled) · `isOverdueWo(wo, now): boolean` (non-final status and `dueAt` < now) · `towerHealth(db, towerId, today): HealthScore` · `portfolioKpis(db, today): PortfolioKpis` · `attentionItems(db, towerId?, today): AttentionItem[]` (sorted P1 → P2 → overdue PM → permits → warranties → failed inspections, then by `at`). **Compliance % anywhere** (tower systems table, standards adoption bar, matrix cells) = (compliant + waived) / assets that have a governing standard; `no-standard` assets never enter a denominator. **Health score (fixed):** `100 − 15·min(overduePm,3) − 10·openP1 − 3·openP2 − 5·expiredWarrantyCritA − 5·min(failedInspections,3) − 10·expiredPermits` where `failedInspections` counts `fail` results in the last 90 days, clamped 0–100; bands ≥ 85 Good, 70–84 Watch, < 70 Action.

**`paths.ts`** — `paths.home()`, `towers()`, `tower(id)`, `floor(towerId, floorId, q?: { highlight?: \`asset:${Id}\` | \`space:${Id}\` | \`doc:${Id}\`; layer?: DisciplineCode[] })`, `space(id)`, `assets(q?: { tower?, discipline?, type?, status?, band?: WarrantyBand[], crit?, compliance?, pm?: "overdue", q?, brand?, model?, vendor? })`, `asset(id, q?: { tab?: "overview" | "documents" | "maintenance" | "history" })`, `qr(tag)`, `standards()`, `standard(id)`, `finishes(q?)`, `compliance()`, `catalogue()`, `brand(id)`, `model(id)`, `documents(q?)`, `document(id)`, `permits(q?)`, `workOrders(q?: { view?, tower?, status?, priority?, kind?, assignee?, vendor?, assetId? })`, `newWorkOrder(q?: { assetId?, spaceId?, towerId?, title? })`, `workOrder(id)`, `maintenance(q?)`, `plan(id)`, `inspections(q?)`, `newInspection(q?: { assetId?, planId? })`, `inspection(id)`, `warranties(q?)`, `vendors(q?)`, `vendor(id)`. Query objects serialise with `URLSearchParams`; undefined keys dropped; arrays joined with commas.

**Search index** — built once per snapshot in `lib/search.ts` from towers, floors (label + tower), spaces (code, name), assets (tag, serial, model no, type, room), brands, models, standards (code, title), documents (docNo, title), permits (number, type), vendors (name, contacts), work orders (number, title); case-insensitive substring over `haystack`, exact tag / docNo / number match ranked first. Palette shows `kind` eyebrow + title + subtitle; Enter navigates.

---

## 8. Non-functional requirements

- **Phone width**: every route usable at 390 px with 16 px gutters and no horizontal page scroll; tables and chip rows scroll inside their card; plan fits width; forms single column; 40 px minimum tap targets.
- **Keyboard**: "Skip to content" link first in DOM; rail and drawer nav are `<nav>` with `NavLink` (`aria-current`); `focus-ring` on every interactive element; `<dialog>` for modal / drawer / palette (native focus containment, Escape closes); Ctrl/Cmd-K opens the palette, arrows move, Enter opens; plan pins focusable; tabs `role="tablist"`.
- **Dark mode**: token-driven only; `data-theme` boot script in `index.html`; toggle persisted; every route checked in both.
- **CSV export** on every register (assets, documents, permits, PM schedule, inspections, work-orders list, warranties, vendors, models): UTF-8 with BOM, quoted fields, filename `rockwell-building-<register>-<yyyy-mm-dd>.csv`.
- **Print**: `@media print` in `index.css` hides rail, top bar, footer and `[data-print-hide]` elements; light tokens are guaranteed because the dark block in `tokens.css` is wrapped in `@media not print` (design-system §1.1); features hide or reveal page-specific parts with Tailwind's `print:` variant; passport, model spec sheet and warranty claim sheet each fit one A4 page.
- **Performance**: entry chunk ≤ 350 KB raw (≈ 110 KB gz: React 19 + router + seed generator + shell + ten route tables); every page component a lazy chunk; no images; Montserrat with `display=swap`; first contentful paint < 1 s from Manila on Vercel; route change < 100 ms; lists paginate at 50 rows; no virtualisation.
- **Resilience**: bad ids → 404 card; `localStorage` failures ignored; overlay with `v !== 1` discarded.
- **Honesty**: footer "Sample data for demonstration · Rockwell Building · Souichi Takahama, Innovation Engineer"; dashboard hero pill "Sample data"; README and `<meta name="description">` say the data is fictional. Vocabulary: "team", never "department".

---

## 9. Testing & verification

**Gate** — `npm run gate` → `node scripts/gate.mjs` (Node built-ins only). Runs `tsc -b`, `vite build`, and `vite build --mode gate` (entry `src/data/seed/check.entry.ts`, output executed with `node dist-gate/check.js`; `verifySeed` throws on any integrity failure and prints row counts), then checks: zero case-insensitive hits for `department` and `IT Manager` under `src/` and `README.md`; zero `#[0-9a-fA-F]{3,8}\b`, `rgb(`, `dark:`, `bg-white`, `text-black` under `src/features/` (the finish swatch line matches the literal `finish.swatch` and is excluded; SVG ids must therefore start with a non-hex letter, e.g. `url(#hatch)`, never `#face`); zero imports of `@/features/<other>` or `../../features` from inside a feature folder; zero `localStorage` outside `store.ts` and `useTheme.ts`; footer string and "Innovation Engineer" present in `Shell.tsx`; `dist/assets/index-*.js` ≤ 350 KB; `vercel.json` rewrite present. Non-zero exit with the full list.

**Route smoke** — `SMOKE_URLS` (≈45 URLs incl. `/a/EDS-B3-FP-01`, a `?highlight=doc:` plan URL, every list with `?tower=grb`, one 404 per detail route). The orchestrator runs `npm run preview` and opens each URL with Claude-in-Chrome twice — 1280 px light and 390 px dark — records console errors (must be zero) and saves both screenshots to `docs/screenshots/`. After deploy: cold-load `/a/EDS-B3-FP-01` and one deep plan URL on `rockwell-building.vercel.app`.

**Per-feature "done"**: gate green with the agent's changes; every owned route in `SMOKE_URLS` renders with seed, empty state and 404 verified in the browser; dark-mode and 390 px screenshots; writes (if any) persist across reload and vanish after "Reset demo data"; only `src/features/<key>/` changed (`git status` shows nothing else); all cross-feature links built with `paths`; no duplicated selector logic (grep for `nextDue <`, `expiryDate <`, `score` outside `selectors.ts` returns display code only).

**Whole-product "done"**: gate green on `main`; all `SMOKE_URLS` pass (1280 light, 390 dark) with zero console errors; the ten-minute tour walkable end to end; Lighthouse (Chrome DevTools, mobile preset) on `/` and `/assets/eds-b3-fp-01`: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95; keyboard-only traversal dashboard → tower → plan → passport → new WO; README complete; pushed to `souichit-rock/rockwell-building`; live at `rockwell-building.vercel.app`.

---

## 10. Later phases

- **Phase 2 — persistence & auth**: Vercel functions + Supabase (Postgres tables mirror `types.ts` one-to-one; RLS by tower and role: Property Manager, Building Engineer, Technician, Design & Technical, Vendor read-only); the overlay store becomes an API client with optimistic writes; audit log table for every mutation.
- **Files**: Supabase Storage for PDF / DWG / photos; PDF preview on document detail; photo attachments on work orders and inspections; DWG/DXF → SVG import replacing schematic templates (pins already carry plan-unit coordinates; a per-floor origin / scale field is added to `Floor` then).
- **QR labels**: real QR encoding of `/a/<tag>`, batch label sheets per tower / floor, camera scan flow on phone.
- **Mobile inspection mode**: offline-tolerant technician view (service-worker cache + queued writes), checklists per equipment type (genset weekly, fire pump churn, elevator monthly), signature capture.
- **Notifications**: e-mail / Telegram digests for PM due, permit and warranty expiry, P1 work orders (Rockwell already runs Apps Script and Telegram bots).
- **Integrations**: Rockwell IoT Platform live readings on the passport; Rock Spot incidents linked to asset and work order; RS485 AMR meter data; COBie / Excel import of turnover registers; monthly FM report export (PDF).
- **Model extensions**: Estate above Tower; spare parts and consumables per asset; lifecycle (condition score, replacement cost, capex forecast — the first money fields, which is when `fmtPhp` arrives); SLA and vendor performance scoring; standards approval workflow (draft → active → superseded) with e-sign; tenant fit-out and punch lists.
- **Cut from Phase 1 for scope** (each a small add-on): drag-and-drop on the work-order board; "Add tower override" finish modal and a standalone waivers list; table / card view toggles on Towers, Vendors and Documents; group-by on the warranty register; a `matchMedia` listener for live system-theme changes; screenshot matrix beyond 1280 light + 390 dark; a floor skip-list (no L13 / L14) if a real tower needs it.
