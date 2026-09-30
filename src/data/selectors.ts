// Pure `(db, ...) => ...` selectors over the Db snapshot (spec section 7). No memoisation: the data is small.
// Imports only types, the date helpers and the leaf `paths` builders (needed for the `href` fields of AttentionItem, RecordGap and HistoryItem).
import type {
  Asset, AttentionItem, AttentionKind, BrandImpact, Compliance, ComplianceCell, CoverageCell, Db, DisciplineCode, Document, DueStatus,
  FinishDeviation, FinishRow, HealthScore, HistoryItem, Id, InspectionType, ISODate, LinkKind, Location, PermitStatus, PermitType, PlanPin, Point,
  PortfolioKpis, RecordGap, Space, SpaceKind, Standard, Surface, Warranty, WarrantyBand, WorkOrder, WOPriority,
} from "@/data/types";
import { daysUntil, todayISO } from "@/lib/dates";
import { paths } from "@/lib/paths";

// Thresholds (spec section 2, assumption 8).
export const PM_DUE_DAYS = 14;               // PM "due" = next due within 14 days
export const PERMIT_DUE_DAYS = 60;           // permit "due" = expiry within 60 days
export const WARRANTY_EXPIRING_DAYS = 90;    // warranty "expiring" = bands 30d + 90d
export const WARRANTY_URGENT_DAYS = 30;      // band 30d
export const FAILED_INSPECTION_DAYS = 90;    // failed inspections counted for health and attention
export const HEALTH_GOOD_MIN = 85;
export const HEALTH_WATCH_MIN = 70;
/** Work-order priority targets in hours: P1 2 h, P2 8 h, P3 3 d, P4 14 d. */
export const PRIORITY_TARGET_HOURS: Record<WOPriority, number> = { P1: 2, P2: 8, P3: 72, P4: 336 };

const r1 = (n: number) => Math.round(n * 10) / 10;
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byTag = (a: Asset, b: Asset) => cmp(a.tag, b.tag);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const isFinal = (w: WorkOrder) => w.status === "done" || w.status === "cancelled";
const STATUS_LABEL = { "in-service": "In service", standby: "Standby", "under-repair": "Under repair", decommissioned: "Decommissioned" } as const;
const INSPECTION_LABEL: Record<InspectionType, string> = {
  "pm-visit": "PM visit", regulatory: "Regulatory inspection", "condition-survey": "Condition survey", test: "Test",
};
const PERMIT_LABEL: Record<PermitType, string> = {
  occupancy: "Occupancy", fsic: "FSIC", electrical: "Electrical", mechanical: "Mechanical", elevator: "Elevator", "genset-ecc": "Genset ECC",
  "water-discharge": "Water discharge", sanitary: "Sanitary",
};
const SURFACE_ORDER: Surface[] = ["floor", "wall", "ceiling", "door", "hardware", "paint", "sanitary", "lighting"];

const lastRevDate = (d: Document): ISODate => d.revisions[d.revisions.length - 1]?.date ?? "";
const disciplineOf = (db: Db, a: Asset): DisciplineCode | undefined => db.equipmentTypes[a.equipmentTypeId]?.disciplineId;
const warrantiesByAsset = (db: Db): Map<Id, Warranty> => new Map(Object.values(db.warranties).map((w) => [w.assetId, w]));

// --- Location, pins -------------------------------------------------------------------------------------------------------------

export function assetsIn(db: Db, f: { towerId?: Id; floorId?: Id; spaceId?: Id } = {}): Asset[] {
  return Object.values(db.assets).filter(
    (a) => (!f.towerId || a.towerId === f.towerId) && (!f.floorId || a.floorId === f.floorId) && (!f.spaceId || a.spaceId === f.spaceId),
  );
}

export function locationOf(db: Db, assetId: Id): Location {
  const asset = db.assets[assetId];
  const tower = asset && db.towers[asset.towerId];
  const floor = asset && db.floors[asset.floorId];
  const space = asset && db.spaces[asset.spaceId];
  if (!tower || !floor || !space) throw new Error(`locationOf: unknown asset or location for "${assetId}"`);
  return { tower, floor, space };
}

/** Explicit pin if present; the room centroid when it holds one asset; else a point on a ring of radius min(w, h) * 0.3, rounded to 0.1. */
export function assetPin(asset: Asset, space: Space, i: number, n: number): Point {
  if (asset.pin) return asset.pin;
  const { x, y, w, h } = space.rect;
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (n <= 1) return { x: r1(cx), y: r1(cy) };
  const radius = Math.min(w, h) * 0.3;
  const angle = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: r1(cx + radius * Math.cos(angle)), y: r1(cy + radius * Math.sin(angle)) };
}

export function pinsForFloor(db: Db, floorId: Id, layers?: DisciplineCode[]): PlanPin[] {
  const bySpace = new Map<Id, Asset[]>();
  for (const a of assetsIn(db, { floorId }).sort(byTag)) bySpace.set(a.spaceId, [...(bySpace.get(a.spaceId) ?? []), a]);
  const pins: PlanPin[] = [];
  for (const [spaceId, list] of bySpace) {
    const space = db.spaces[spaceId];
    if (!space) continue;
    list.forEach((a, i) => {
      const type = db.equipmentTypes[a.equipmentTypeId];
      const discipline = type && db.disciplines[type.disciplineId];
      if (!type || !discipline) return;
      if (layers && layers.length > 0 && !layers.includes(discipline.id)) return;
      const p = assetPin(a, space, i, list.length);
      pins.push({
        assetId: a.id, x: p.x, y: p.y, tone: discipline.tone, label: a.tag.split("-").slice(2).join("-"),
        title: `${a.tag} · ${type.name} · ${STATUS_LABEL[a.status]}`, disciplineId: discipline.id,
      });
    });
  }
  return pins;
}

// --- Bands and statuses ---------------------------------------------------------------------------------------------------------

export function warrantyFor(db: Db, assetId: Id): Warranty | undefined {
  return Object.values(db.warranties).find((w) => w.assetId === assetId);
}

/** `undefined` (no warranty row) reads as "none". */
export function warrantyBand(end: ISODate | undefined | null, today: ISODate = todayISO()): WarrantyBand {
  if (!end) return "none";
  const d = daysUntil(end, today);
  if (d < 0) return "expired";
  if (d <= 30) return "30d";
  if (d <= 90) return "90d";
  if (d <= 365) return "365d";
  return "active";
}

export function dueStatus(nextDue: ISODate, today: ISODate = todayISO()): DueStatus {
  const d = daysUntil(nextDue, today);
  return d < 0 ? "overdue" : d <= PM_DUE_DAYS ? "due" : "on-track";
}

export function permitStatus(expiry: ISODate, today: ISODate = todayISO()): PermitStatus {
  const d = daysUntil(expiry, today);
  return d < 0 ? "expired" : d <= PERMIT_DUE_DAYS ? "due" : "valid";
}

export function isOverdueWo(wo: WorkOrder, now: Date | number | string = new Date()): boolean {
  if (isFinal(wo)) return false;
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return new Date(wo.dueAt).getTime() < t;
}

export function openWorkOrders(db: Db, f: { towerId?: Id; assetId?: Id; vendorId?: Id } = {}): WorkOrder[] {
  return Object.values(db.workOrders).filter(
    (w) => !isFinal(w) && (!f.towerId || w.towerId === f.towerId) && (!f.assetId || w.assetId === f.assetId) && (!f.vendorId || w.vendorId === f.vendorId),
  );
}

// --- Documents ------------------------------------------------------------------------------------------------------------------

export function docsFor(db: Db, kind: LinkKind, id: Id): Document[] {
  return Object.values(db.documents).filter((d) => d.links.some((l) => l.kind === kind && l.id === id)).sort((a, b) => cmp(a.docNo, b.docNo));
}

/** As-built of the asset's discipline governing the asset, its space or its floor. Current preferred; `stale` when only a superseded sheet governs. */
export function governingSheet(db: Db, assetId: Id): { doc: Document; stale: boolean } | null {
  const asset = db.assets[assetId];
  const discipline = asset && disciplineOf(db, asset);
  if (!asset || !discipline) return null;
  let best: { doc: Document; score: number } | null = null;
  for (const doc of Object.values(db.documents)) {
    if (doc.type !== "as-built" || doc.disciplineId !== discipline || doc.status === "for-review") continue;
    let rank = 0;
    for (const l of doc.links) {
      if (l.relation !== "governs") continue;
      if (l.kind === "asset" && l.id === asset.id) rank = Math.max(rank, 3);
      else if (l.kind === "space" && l.id === asset.spaceId) rank = Math.max(rank, 2);
      else if (l.kind === "floor" && l.id === asset.floorId) rank = Math.max(rank, 1);
    }
    if (rank === 0) continue;
    const score = (doc.status === "current" ? 100 : 0) + rank * 10;
    if (!best || score > best.score || (score === best.score && lastRevDate(doc) > lastRevDate(best.doc))) best = { doc, score };
  }
  return best ? { doc: best.doc, stale: best.doc.status === "superseded" } : null;
}

/** One cell per floor that holds at least one asset, per discipline present on that floor. Coverage % = current cells / all cells. */
export function asBuiltCoverage(db: Db, towerId: Id): CoverageCell[] {
  const groups = new Map<string, { floorId: Id; disciplineId: DisciplineCode; assetIds: Set<Id> }>();
  for (const a of assetsIn(db, { towerId })) {
    const disciplineId = disciplineOf(db, a);
    if (!disciplineId) continue;
    const key = `${a.floorId}|${disciplineId}`;
    const g = groups.get(key) ?? { floorId: a.floorId, disciplineId, assetIds: new Set<Id>() };
    g.assetIds.add(a.id);
    groups.set(key, g);
  }
  const sheets = Object.values(db.documents).filter((d) => d.type === "as-built" && (d.status === "current" || d.status === "superseded"));
  const cells: CoverageCell[] = [];
  for (const g of groups.values()) {
    let current: Document | undefined;
    let superseded: Document | undefined;
    for (const d of sheets) {
      if (d.disciplineId !== g.disciplineId) continue;
      const governs = d.links.some((l) => l.relation === "governs" && ((l.kind === "floor" && l.id === g.floorId) || (l.kind === "asset" && g.assetIds.has(l.id))));
      if (!governs) continue;
      if (d.status === "current") current ??= d;
      else superseded ??= d;
    }
    const hit = current ?? superseded;
    cells.push({ floorId: g.floorId, disciplineId: g.disciplineId, status: current ? "current" : superseded ? "superseded" : "missing", ...(hit ? { docId: hit.id } : {}) });
  }
  return cells.sort(
    (a, b) => (db.floors[b.floorId]?.level ?? 0) - (db.floors[a.floorId]?.level ?? 0) || (db.disciplines[a.disciplineId]?.order ?? 0) - (db.disciplines[b.disciplineId]?.order ?? 0),
  );
}

/** One row per kind per tower with a count above zero. `href` is the filtered register that lists the offenders. */
export function recordGaps(db: Db, towerId?: Id): RecordGap[] {
  const gaps: RecordGap[] = [];
  const towers = Object.values(db.towers).filter((t) => !towerId || t.id === towerId);
  for (const t of towers) {
    const missing = asBuiltCoverage(db, t.id).filter((c) => c.status === "missing").length;
    if (missing > 0) {
      gaps.push({
        kind: "missing-asbuilt", towerId: t.id, count: missing, title: `${plural(missing, "floor-discipline pair")} without a current as-built`,
        href: paths.documents({ tower: t.id, type: "as-built", current: 1 }),
      });
    }
    const assets = assetsIn(db, { towerId: t.id });
    const noOm = assets.filter((a) => a.criticality === "A" && !docsFor(db, "asset", a.id).some((d) => d.type === "om-manual")).length;
    if (noOm > 0) {
      gaps.push({ kind: "no-om", towerId: t.id, count: noOm, title: `${plural(noOm, "critical asset")} without an O&M manual`, href: paths.assets({ tower: t.id, crit: "A" }) });
    }
    const stale = assets.filter((a) => governingSheet(db, a.id)?.stale).length;
    if (stale > 0) {
      gaps.push({
        kind: "stale-sheet", towerId: t.id, count: stale, title: `${plural(stale, "asset")} documented only on a superseded as-built`,
        href: paths.documents({ tower: t.id, status: "superseded" }),
      });
    }
  }
  return gaps;
}

// --- Standards and compliance ---------------------------------------------------------------------------------------------------

export function standardFor(db: Db, asset: Asset): Standard | undefined {
  const matches = Object.values(db.standards).filter(
    (s) => s.equipmentTypeIds.includes(asset.equipmentTypeId) && (s.appliesToTowerIds.length === 0 || s.appliesToTowerIds.includes(asset.towerId)),
  );
  return matches.find((s) => s.appliesToTowerIds.includes(asset.towerId)) ?? matches[0];
}

/** Precedence: unexpired waiver, no standard, tier preferred/acceptable, phase-out, prohibited or unlisted brand. */
export function complianceFor(db: Db, asset: Asset, today: ISODate = todayISO()): Compliance {
  const brandId = db.models[asset.modelId]?.brandId;
  const tierIn = (s: Standard | undefined) => s?.approvals.find((a) => a.brandId === brandId)?.tier;
  const waiver = Object.values(db.waivers).find((w) => w.assetId === asset.id && (!w.expiresAt || w.expiresAt >= today));
  if (waiver) {
    const tier = tierIn(db.standards[waiver.standardId]);
    return { status: "waived", standardId: waiver.standardId, waiverId: waiver.id, ...(tier ? { tier } : {}) };
  }
  const standard = standardFor(db, asset);
  if (!standard) return { status: "no-standard" };
  const tier = tierIn(standard);
  const base = { standardId: standard.id, ...(tier ? { tier } : {}) };
  if (tier === "preferred" || tier === "acceptable") return { status: "compliant", ...base };
  if (tier === "phase-out") return { status: "phase-out", ...base };
  return { status: "deviation", ...base };
}

/** One cell per tower x standard; `total` counts only assets governed by that standard. */
export function complianceMatrix(db: Db, today: ISODate = todayISO()): ComplianceCell[] {
  const cells: ComplianceCell[] = [];
  const assets = Object.values(db.assets);
  const governing = new Map<Id, Id | undefined>(assets.map((a) => [a.id, standardFor(db, a)?.id]));
  for (const t of Object.values(db.towers)) {
    for (const s of Object.values(db.standards)) {
      const cell: ComplianceCell = { towerId: t.id, standardId: s.id, total: 0, compliant: 0, waived: 0, phaseOut: 0, deviations: 0 };
      for (const a of assets) {
        if (a.towerId !== t.id || governing.get(a.id) !== s.id) continue;
        cell.total++;
        const c = complianceFor(db, a, today).status;
        if (c === "compliant") cell.compliant++;
        else if (c === "waived") cell.waived++;
        else if (c === "phase-out") cell.phaseOut++;
        else if (c === "deviation") cell.deviations++;
      }
      cells.push(cell);
    }
  }
  return cells;
}

// --- Finishes -------------------------------------------------------------------------------------------------------------------

/** One row per surface that has a portfolio row or this tower's override for the space kind. */
export function finishesFor(db: Db, spaceKind: SpaceKind, towerId: Id): FinishRow[] {
  const entries = Object.values(db.finishSchedule).filter((e) => e.spaceKind === spaceKind);
  const rows: FinishRow[] = [];
  for (const surface of SURFACE_ORDER) {
    const p = entries.find((e) => e.surface === surface && !e.towerId);
    const o = entries.find((e) => e.surface === surface && e.towerId === towerId);
    if (!p && !o) continue;
    const portfolio = p && db.finishes[p.finishId];
    const override = o && db.finishes[o.finishId];
    rows.push({ surface, ...(portfolio ? { portfolio } : {}), ...(override ? { override } : {}), deviates: !!(portfolio && override && portfolio.id !== override.id) });
  }
  return rows;
}

/** Tower overrides whose finish differs from the portfolio row for the same space kind and surface. */
export function finishDeviations(db: Db, towerId?: Id): FinishDeviation[] {
  const entries = Object.values(db.finishSchedule);
  const out: FinishDeviation[] = [];
  for (const o of entries) {
    if (!o.towerId || (towerId && o.towerId !== towerId)) continue;
    const p = entries.find((e) => !e.towerId && e.spaceKind === o.spaceKind && e.surface === o.surface);
    if (p && p.finishId !== o.finishId) out.push({ towerId: o.towerId, spaceKind: o.spaceKind, surface: o.surface, portfolioFinishId: p.finishId, overrideFinishId: o.finishId });
  }
  return out;
}

// --- Brand, history, readings ---------------------------------------------------------------------------------------------------

export function brandImpact(db: Db, brandId: Id): BrandImpact {
  const today = todayISO();
  const warranties = warrantiesByAsset(db);
  const assets = Object.values(db.assets).filter((a) => db.models[a.modelId]?.brandId === brandId);
  let months = 0;
  let oldest: ISODate | undefined;
  for (const a of assets) {
    const end = warranties.get(a.id)?.end;
    if (end && daysUntil(end, today) > 0) months += daysUntil(end, today) / 30.4375;
    if (!oldest || a.installDate < oldest) oldest = a.installDate;
  }
  const ids = new Set(assets.map((a) => a.id));
  return {
    brandId, assets: assets.length, towerIds: [...new Set(assets.map((a) => a.towerId))], warrantyAssetMonths: Math.round(months),
    openWos: openWorkOrders(db).filter((w) => w.assetId && ids.has(w.assetId)).length, ...(oldest ? { oldestInstall: oldest } : {}),
  };
}

export function serviceHistory(db: Db, assetId: Id): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const w of Object.values(db.workOrders)) {
    if (w.assetId !== assetId) continue;
    items.push({
      at: (w.completedAt ?? w.reportedAt).slice(0, 10), kind: w.kind === "corrective" ? "repair" : w.kind === "preventive" ? "PM" : w.kind,
      title: `${w.number} · ${w.title}`, status: w.status, href: paths.workOrder(w.id),
    });
  }
  for (const i of Object.values(db.inspections)) {
    if (i.assetId !== assetId) continue;
    items.push({ at: i.date, kind: "inspection", title: `${INSPECTION_LABEL[i.type]} · ${i.inspector}`, result: i.result, href: paths.inspection(i.id) });
  }
  return items.sort((a, b) => cmp(b.at, a.at));
}

export function readingsSeries(db: Db, assetId: Id): Record<string, { date: ISODate; value: number; unit: string }[]> {
  const out: Record<string, { date: ISODate; value: number; unit: string }[]> = {};
  const logs = Object.values(db.inspections).filter((i) => i.assetId === assetId).sort((a, b) => cmp(a.date, b.date));
  for (const log of logs) for (const r of log.readings) (out[r.label] ??= []).push({ date: log.date, value: r.value, unit: r.unit });
  return out;
}

// --- Health, KPIs, attention ----------------------------------------------------------------------------------------------------

/** 100 - 15*min(overduePm,3) - 10*openP1 - 3*openP2 - 5*expiredWarrantyCritA - 5*min(failedInspections,3) - 10*expiredPermits, clamped 0..100. */
export function towerHealth(db: Db, towerId: Id, today: ISODate = todayISO()): HealthScore {
  const assets = assetsIn(db, { towerId });
  const ids = new Set(assets.map((a) => a.id));
  const warranties = warrantiesByAsset(db);
  const overduePm = Object.values(db.pmPlans).filter((p) => ids.has(p.assetId) && dueStatus(p.nextDue, today) === "overdue").length;
  const open = openWorkOrders(db, { towerId });
  const openP1 = open.filter((w) => w.priority === "P1").length;
  const openP2 = open.filter((w) => w.priority === "P2").length;
  const expiredWarrantyCritA = assets.filter((a) => a.criticality === "A" && warrantyBand(warranties.get(a.id)?.end, today) === "expired").length;
  const failedInspections = Object.values(db.inspections).filter((i) => {
    const d = daysUntil(i.date, today);
    return i.result === "fail" && ids.has(i.assetId) && d <= 0 && d >= -FAILED_INSPECTION_DAYS;
  }).length;
  const expiredPermits = Object.values(db.permits).filter((p) => p.towerId === towerId && permitStatus(p.expiryDate, today) === "expired").length;
  const raw = 100 - 15 * Math.min(overduePm, 3) - 10 * openP1 - 3 * openP2 - 5 * expiredWarrantyCritA - 5 * Math.min(failedInspections, 3) - 10 * expiredPermits;
  const score = Math.max(0, Math.min(100, raw));
  const band = score >= HEALTH_GOOD_MIN ? "Good" : score >= HEALTH_WATCH_MIN ? "Watch" : "Action";
  return { score, band, overduePm, openP1, openP2, expiredWarrantyCritA, failedInspections, expiredPermits };
}

export function portfolioKpis(db: Db, today: ISODate = todayISO()): PortfolioKpis {
  const assets = Object.values(db.assets);
  const open = openWorkOrders(db);
  const plans = Object.values(db.pmPlans);
  const bands = Object.values(db.warranties).map((w) => warrantyBand(w.end, today));
  const permits = Object.values(db.permits).map((p) => permitStatus(p.expiryDate, today));
  let cells = 0;
  let current = 0;
  for (const t of Object.values(db.towers)) {
    const cov = asBuiltCoverage(db, t.id);
    cells += cov.length;
    current += cov.filter((c) => c.status === "current").length;
  }
  return {
    assetsTotal: assets.length, assetsInService: assets.filter((a) => a.status === "in-service").length, openWos: open.length,
    openP1: open.filter((w) => w.priority === "P1").length, openP2: open.filter((w) => w.priority === "P2").length,
    pmOverdue: plans.filter((p) => dueStatus(p.nextDue, today) === "overdue").length, pmDue14d: plans.filter((p) => dueStatus(p.nextDue, today) === "due").length,
    warranties90d: bands.filter((b) => b === "30d" || b === "90d").length, permitsDue: permits.filter((s) => s === "due").length,
    permitsExpired: permits.filter((s) => s === "expired").length, asBuiltCoveragePct: cells === 0 ? 0 : Math.round((current / cells) * 100),
  };
}

const ATTENTION_ORDER: AttentionKind[] = ["wo-p1", "wo-p2", "pm-overdue", "permit", "warranty-30d", "inspection-fail"];

/** Sorted P1, P2, overdue PM, permits, warranties, failed inspections, then by date. */
export function attentionItems(db: Db, towerId?: Id, today: ISODate = todayISO()): AttentionItem[] {
  const items: AttentionItem[] = [];
  const inScope = (id: Id) => !towerId || id === towerId;
  const towerName = (id: Id) => db.towers[id]?.name ?? id;
  const tagOf = (id?: Id) => (id ? db.assets[id]?.tag : undefined);

  for (const w of openWorkOrders(db, { towerId })) {
    if (w.priority !== "P1" && w.priority !== "P2") continue;
    items.push({
      kind: w.priority === "P1" ? "wo-p1" : "wo-p2", towerId: w.towerId, title: `${w.number} · ${w.title}`,
      subtitle: [towerName(w.towerId), tagOf(w.assetId), w.status].filter(Boolean).join(" · "), href: paths.workOrder(w.id),
      tone: w.priority === "P1" ? "danger" : "warn", at: w.reportedAt.slice(0, 10),
    });
  }
  for (const p of Object.values(db.pmPlans)) {
    const a = db.assets[p.assetId];
    if (!a || !inScope(a.towerId) || dueStatus(p.nextDue, today) !== "overdue") continue;
    items.push({
      kind: "pm-overdue", towerId: a.towerId, title: `${a.tag} · ${p.task}`, subtitle: `${towerName(a.towerId)} · overdue by ${plural(-daysUntil(p.nextDue, today), "day")}`,
      href: paths.plan(p.id), tone: "danger", at: p.nextDue,
    });
  }
  for (const p of Object.values(db.permits)) {
    if (!inScope(p.towerId)) continue;
    const s = permitStatus(p.expiryDate, today);
    if (s === "valid") continue;
    const d = daysUntil(p.expiryDate, today);
    items.push({
      kind: "permit", towerId: p.towerId, title: `${PERMIT_LABEL[p.type]} permit ${p.number}`,
      subtitle: `${towerName(p.towerId)} · ${s === "expired" ? `expired ${plural(-d, "day")} ago` : d === 0 ? "expires today" : `expires in ${plural(d, "day")}`}`,
      href: paths.permits({ tower: p.towerId }), tone: s === "expired" ? "danger" : "warn", at: p.expiryDate,
    });
  }
  for (const w of Object.values(db.warranties)) {
    const a = db.assets[w.assetId];
    if (!a || !inScope(a.towerId) || warrantyBand(w.end, today) !== "30d") continue;
    const d = daysUntil(w.end, today);
    items.push({
      kind: "warranty-30d", towerId: a.towerId, title: `${a.tag} · warranty ends ${d === 0 ? "today" : `in ${plural(d, "day")}`}`,
      subtitle: `${db.equipmentTypes[a.equipmentTypeId]?.name ?? a.equipmentTypeId} · ${towerName(a.towerId)}`, href: paths.asset(a.id), tone: "warn", at: w.end,
    });
  }
  for (const i of Object.values(db.inspections)) {
    const a = db.assets[i.assetId];
    const d = daysUntil(i.date, today);
    if (!a || !inScope(a.towerId) || i.result !== "fail" || d > 0 || d < -FAILED_INSPECTION_DAYS) continue;
    items.push({
      kind: "inspection-fail", towerId: a.towerId, title: `${a.tag} · ${INSPECTION_LABEL[i.type]} failed`,
      subtitle: `${towerName(a.towerId)} · ${i.inspector}`, href: paths.inspection(i.id), tone: "danger", at: i.date,
    });
  }
  return items.sort((a, b) => ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind) || cmp(a.at, b.at) || cmp(a.title, b.title));
}
