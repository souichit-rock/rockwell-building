// Feature-only derived values for the asset registry and passport. Every rule that already lives in selectors.ts is called, never copied.
import type { TimelineItem } from "@/components/ui";
import { PLAN_TEMPLATES } from "@/data/seed/plans";
import {
  complianceFor, docsFor, dueStatus, governingSheet, openWorkOrders, pinsForFloor, readingsSeries, serviceHistory, warrantyBand, warrantyFor,
} from "@/data/selectors";
import type {
  Asset, AssetStatus, BadgeTone, Brand, Compliance, ComplianceStatus, Condition, Criticality, Db, DisciplineCode, Document, DueStatus, EquipmentType,
  Floor, HistoryItem, Id, ISODate, LinkRelation, Model, PlanPin, PlanTemplate, PMPlan, Space, Standard, Tower, Vendor, Waiver, Warranty,
  WarrantyBand, WorkOrder,
} from "@/data/types";
import { daysUntil, fmtDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { resultTone, woStatusTone } from "@/lib/status";

/** Badge text is the enum value with hyphens replaced by spaces (design-system section 4.6); the CSS upper-cases it. */
export const words = (s: string): string => s.replace(/-/g, " ");
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Inline link inside a card or KV value. */
export const LINK = "focus-ring rounded text-ink underline decoration-line-strong underline-offset-[3px] transition-colors hover:decoration-gold";

export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** "01" from EDS-B3-FP-01. */
export const sequenceOf = (tag: string): string => tag.split("-").pop() ?? "";

// --- Registry rows ---------------------------------------------------------------------------------------------------------------

export interface AssetRow {
  asset: Asset;
  type: EquipmentType;
  disciplineId: DisciplineCode;
  model: Model | undefined;
  brand: Brand | undefined;
  tower: Tower;
  floor: Floor;
  space: Space;
  warranty: Warranty | undefined;
  band: WarrantyBand;
  nextPm: PMPlan | undefined;
  pmStatus: DueStatus | undefined;
  sheet: { doc: Document; stale: boolean } | null;
  compliance: Compliance;
  haystack: string;
}

/** One row per asset, sorted by tag. Pure over the snapshot, so callers memoise on `db`. */
export function buildRows(db: Db): AssetRow[] {
  const nextPlan = new Map<Id, PMPlan>();
  for (const p of Object.values(db.pmPlans)) {
    const cur = nextPlan.get(p.assetId);
    if (!cur || p.nextDue < cur.nextDue) nextPlan.set(p.assetId, p);
  }
  const rows: AssetRow[] = [];
  for (const asset of Object.values(db.assets)) {
    const type = db.equipmentTypes[asset.equipmentTypeId];
    const tower = db.towers[asset.towerId];
    const floor = db.floors[asset.floorId];
    const space = db.spaces[asset.spaceId];
    if (!type || !tower || !floor || !space) continue;
    const model = db.models[asset.modelId];
    const brand = model && db.brands[model.brandId];
    const warranty = warrantyFor(db, asset.id);
    const nextPm = nextPlan.get(asset.id);
    rows.push({
      asset, type, disciplineId: type.disciplineId, model, brand, tower, floor, space, warranty,
      band: warrantyBand(warranty?.end),
      nextPm, pmStatus: nextPm && dueStatus(nextPm.nextDue),
      sheet: governingSheet(db, asset.id),
      compliance: complianceFor(db, asset),
      haystack: [asset.tag, asset.serial, model?.modelNo, space.name, space.code, type.name, brand?.name].filter(Boolean).join(" ").toLowerCase(),
    });
  }
  return rows.sort((a, b) => (a.asset.tag < b.asset.tag ? -1 : a.asset.tag > b.asset.tag ? 1 : 0));
}

// --- Registry filters (all of them live in the route query) ---------------------------------------------------------------------

export const FILTER_KEYS = ["q", "tower", "discipline", "type", "status", "band", "crit", "compliance", "pm", "brand", "model", "vendor"] as const;

export const STATUSES: AssetStatus[] = ["in-service", "standby", "under-repair", "decommissioned"];
export const CONDITIONS: Condition[] = ["good", "fair", "poor", "unknown"];
export const COMPLIANCE_STATUSES: ComplianceStatus[] = ["compliant", "phase-out", "deviation", "waived", "no-standard"];
export const CRITICALITIES: Criticality[] = ["A", "B", "C"];
const BANDS: WarrantyBand[] = ["expired", "30d", "90d", "365d", "active", "none"];

/** Select options; the combined `30d,90d` entry is the one the "Warranty <= 90 d" quick chip writes. */
export const BAND_OPTIONS: { value: string; label: string }[] = [
  { value: "30d,90d", label: "Expiring within 90 days" },
  { value: "expired", label: "Expired" },
  { value: "30d", label: "Within 30 days" },
  { value: "90d", label: "31 to 90 days" },
  { value: "365d", label: "91 to 365 days" },
  { value: "active", label: "More than a year" },
  { value: "none", label: "No warranty" },
];

export interface Filters {
  q: string;
  tower: Id | null;
  discipline: DisciplineCode | null;
  type: Id | null;
  status: AssetStatus | null;
  bands: WarrantyBand[];
  crit: Criticality | null;
  compliance: ComplianceStatus | null;
  pm: boolean;
  brand: Id | null;
  model: Id | null;
  vendor: Id | null;
}

const isOneOf = <T extends string>(list: readonly T[], v: string | null): v is T => v !== null && (list as readonly string[]).includes(v);

/** Reads and validates the query. An unknown enum value is ignored rather than emptying the list. The `tower` query wins over the scope. */
export function readFilters(sp: URLSearchParams, db: Db, scopeTower: Id | null): Filters {
  const one = (k: string) => sp.get(k)?.trim() || null;
  const tower = one("tower");
  const discipline = one("discipline");
  const type = one("type");
  const status = one("status");
  const crit = one("crit");
  const compliance = one("compliance");
  return {
    q: sp.get("q") ?? "",
    tower: tower && tower in db.towers ? tower : scopeTower,
    discipline: discipline && discipline in db.disciplines ? (discipline as DisciplineCode) : null,
    type: type && type in db.equipmentTypes ? type : null,
    status: isOneOf(STATUSES, status) ? status : null,
    bands: (sp.get("band") ?? "").split(",").filter((b): b is WarrantyBand => isOneOf(BANDS, b)),
    crit: isOneOf(CRITICALITIES, crit) ? crit : null,
    compliance: isOneOf(COMPLIANCE_STATUSES, compliance) ? compliance : null,
    pm: sp.get("pm") === "overdue",
    brand: one("brand"),
    model: one("model"),
    vendor: one("vendor"),
  };
}

/** `skip` leaves one facet out, so a chip row can count what each of its options would return. */
export function matches(r: AssetRow, f: Filters, skip?: keyof Filters): boolean {
  const a = r.asset;
  const on = (k: keyof Filters) => k !== skip;
  return (
    (!on("tower") || !f.tower || a.towerId === f.tower) &&
    (!on("discipline") || !f.discipline || r.disciplineId === f.discipline) &&
    (!on("type") || !f.type || a.equipmentTypeId === f.type) &&
    (!on("status") || !f.status || a.status === f.status) &&
    (!on("bands") || f.bands.length === 0 || f.bands.includes(r.band)) &&
    (!on("crit") || !f.crit || a.criticality === f.crit) &&
    (!on("compliance") || !f.compliance || r.compliance.status === f.compliance) &&
    (!on("pm") || !f.pm || r.pmStatus === "overdue") &&
    (!on("brand") || !f.brand || r.brand?.id === f.brand) &&
    (!on("model") || !f.model || a.modelId === f.model) &&
    (!on("vendor") || !f.vendor || [a.installerVendorId, a.serviceVendorId, r.warranty?.vendorId].includes(f.vendor)) &&
    (!on("q") || f.q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => r.haystack.includes(t)))
  );
}

export const TAB_KEYS = ["overview", "documents", "maintenance", "history"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

// --- Passport --------------------------------------------------------------------------------------------------------------------

export interface DocGroup { relation: LinkRelation; docs: Document[] }

export interface Passport {
  asset: Asset;
  type: EquipmentType;
  model: Model | undefined;
  brand: Brand | undefined;
  tower: Tower;
  floor: Floor;
  space: Space;
  parent: Asset | undefined;
  installer: Vendor | undefined;
  serviceVendor: Vendor | undefined;
  template: PlanTemplate | undefined;
  floorSpaces: Space[];
  pins: PlanPin[];
  warranty: Warranty | undefined;
  warrantyVendor: Vendor | undefined;
  warrantyDoc: Document | undefined;
  band: WarrantyBand;
  compliance: Compliance;
  standard: Standard | undefined;
  waiver: Waiver | undefined;
  sheet: { doc: Document; stale: boolean } | null;
  successor: Document | undefined;
  groups: DocGroup[];
  docCount: number;
  plans: PMPlan[];
  openWos: WorkOrder[];
  history: HistoryItem[];
  readings: ReturnType<typeof readingsSeries>;
}

const RELATIONS: LinkRelation[] = ["governs", "certifies", "references"];
const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;

/** Everything the passport tabs read, in one pass over the snapshot. `null` when the asset's location rows are missing. */
export function passportOf(db: Db, asset: Asset): Passport | null {
  const type = db.equipmentTypes[asset.equipmentTypeId];
  const tower = db.towers[asset.towerId];
  const floor = db.floors[asset.floorId];
  const space = db.spaces[asset.spaceId];
  if (!type || !tower || !floor || !space) return null;
  const model = db.models[asset.modelId];
  const warranty = warrantyFor(db, asset.id);
  const compliance = complianceFor(db, asset);
  const sheet = governingSheet(db, asset.id);
  const linked = docsFor(db, "asset", asset.id).filter((d) => d.id !== sheet?.doc.id);
  const groups = RELATIONS.map((relation) => ({
    relation,
    docs: linked.filter((d) => d.links.some((l) => l.kind === "asset" && l.id === asset.id && l.relation === relation)),
  })).filter((g) => g.docs.length > 0);
  const history = serviceHistory(db, asset.id);
  return {
    asset, type, model, brand: model && db.brands[model.brandId], tower, floor, space,
    parent: asset.parentAssetId ? db.assets[asset.parentAssetId] : undefined,
    installer: db.vendors[asset.installerVendorId],
    serviceVendor: asset.serviceVendorId ? db.vendors[asset.serviceVendorId] : undefined,
    template: PLAN_TEMPLATES[floor.templateId],
    floorSpaces: Object.values(db.spaces).filter((s) => s.floorId === floor.id),
    pins: pinsForFloor(db, floor.id),
    warranty, warrantyVendor: warranty && db.vendors[warranty.vendorId], warrantyDoc: warranty?.docId ? db.documents[warranty.docId] : undefined,
    band: warrantyBand(warranty?.end),
    compliance, standard: compliance.standardId ? db.standards[compliance.standardId] : undefined,
    waiver: compliance.waiverId ? db.waivers[compliance.waiverId] : undefined,
    sheet, successor: sheet?.doc.supersededById ? db.documents[sheet.doc.supersededById] : undefined,
    groups, docCount: linked.length + (sheet ? 1 : 0),
    plans: Object.values(db.pmPlans).filter((p) => p.assetId === asset.id).sort((a, b) => (a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0)),
    openWos: openWorkOrders(db, { assetId: asset.id }).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.dueAt < b.dueAt ? -1 : 1)),
    history, readings: readingsSeries(db, asset.id),
  };
}

/** "43 days left", "Ends today", "Expired 12 days ago". */
export function warrantyLeft(end: ISODate): string {
  const d = daysUntil(end);
  return d < 0 ? `Expired ${plural(-d, "day")} ago` : d === 0 ? "Ends today" : `${plural(d, "day")} left`;
}

/** "in 12 days", "today", "5 days overdue". */
export function dueIn(due: ISODate): string {
  const d = daysUntil(due);
  return d < 0 ? `${plural(-d, "day")} overdue` : d === 0 ? "today" : `in ${plural(d, "day")}`;
}

const dotTone = (t: BadgeTone): TimelineItem["tone"] => (t === "ok" || t === "warn" || t === "danger" || t === "info" ? t : undefined);

/** History rows for the Timeline; the dot colour comes from the shared tone maps. */
export function timelineOf(items: HistoryItem[]): TimelineItem[] {
  return items.map((h) => ({
    when: `${fmtDate(h.at)} · ${h.kind}`,
    what: h.title,
    note: h.result ? `Result: ${words(h.result)}` : h.status ? `Work order ${words(h.status)}` : undefined,
    tone: dotTone(h.result ? resultTone(h.result) : h.status ? woStatusTone(h.status) : "neutral"),
    href: h.href,
  }));
}

/** Last 12 points of a reading series, as x / y pairs inside a `w` x `h` box with `pad` on every side. A flat series draws mid-height. */
export function sparkPoints(values: number[], w: number, h: number, pad: number): { x: number; y: number }[] {
  const v = values.slice(-12);
  const lo = Math.min(...v);
  const span = Math.max(...v) - lo;
  return v.map((n, i) => ({
    x: v.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (v.length - 1),
    y: span === 0 ? h / 2 : h - pad - ((n - lo) / span) * (h - 2 * pad),
  }));
}
