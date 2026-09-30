// Towers feature: derived values that selectors.ts does not list. Everything here is a pure function of the Db snapshot;
// statuses come from the foundation selectors, this file only groups and labels them.
import type {
  AttentionKind, BadgeTone, CoverageCell, Db, Discipline, DisciplineCode, Document, Floor, FloorKind, HealthScore, Id, ISODate, Permit,
  PermitType, TeamMember, Tower, TowerUse,
} from "@/data/types";
import { asBuiltCoverage, assetsIn, complianceFor, dueStatus, openWorkOrders } from "@/data/selectors";
import { daysUntil, fmtDate, todayISO } from "@/lib/dates";
import { plural } from "@/lib/format";
import { docStatusTone } from "@/lib/status";

// --- labels -----------------------------------------------------------------------------------------------------------------------

export const USE_LABEL: Record<TowerUse, string> = { residential: "Residential", office: "Office" };

export const FLOOR_KIND_LABEL: Record<FloorKind, string> = {
  "basement-plant": "Basement plant", "basement-parking": "Basement parking", ground: "Ground floor", podium: "Podium", typical: "Typical floor", roof: "Roof deck",
};

export const PERMIT_LABEL: Record<PermitType, string> = {
  occupancy: "Occupancy", fsic: "FSIC", electrical: "Electrical", mechanical: "Mechanical", elevator: "Elevator", "genset-ecc": "Genset ECC",
  "water-discharge": "Water discharge", sanitary: "Sanitary",
};

export const ATTENTION_LABEL: Record<AttentionKind, string> = {
  "wo-p1": "P1", "wo-p2": "P2", "pm-overdue": "PM overdue", permit: "Permit", "warranty-30d": "Warranty", "inspection-fail": "Inspection",
};

export const COVERAGE_LABEL: Record<CoverageCell["status"], string> = { current: "Current", superseded: "Superseded", missing: "Missing" };
// docStatusTone has no entry for a missing sheet, and a superseded sheet that still governs equipment is a warning here, not a neutral.
export const COVERAGE_TONE: Record<CoverageCell["status"], BadgeTone> = { current: docStatusTone("current"), superseded: "warn", missing: "danger" };

// --- floors -----------------------------------------------------------------------------------------------------------------------

/** Every level of a tower, roof first and the lowest basement last. */
export const floorsOf = (db: Db, towerId: Id): Floor[] =>
  Object.values(db.floors).filter((f) => f.towerId === towerId).sort((a, b) => b.level - a.level);

export function assetCountsByFloor(db: Db, towerId: Id): Map<Id, number> {
  const counts = new Map<Id, number>();
  for (const a of assetsIn(db, { towerId })) counts.set(a.floorId, (counts.get(a.floorId) ?? 0) + 1);
  return counts;
}

/** "B3 to RD" for a roof-first floor list. */
export const levelRange = (floors: Floor[]): string => (floors.length > 0 ? `${floors[floors.length - 1].label} to ${floors[0].label}` : "");

// --- systems summary --------------------------------------------------------------------------------------------------------------

export interface SystemRow {
  id: DisciplineCode; name: string; order: number;
  assets: number; overduePm: number; openWos: number;
  governed: number;   // assets that have a governing standard: the compliance denominator
  ok: number;         // compliant + waived
  deviations: number; phaseOut: number;
}

/** One row per discipline that holds assets in the tower; `unlinkedOpenWos` are open work orders with no asset to attribute to a system. */
export function systemsSummary(db: Db, towerId: Id): { rows: SystemRow[]; unlinkedOpenWos: number } {
  const rows = new Map<DisciplineCode, SystemRow>();
  const rowFor = (id: DisciplineCode | undefined): SystemRow | undefined => {
    const d = id && db.disciplines[id];
    if (!d) return undefined;
    let r = rows.get(d.id);
    if (!r) {
      r = { id: d.id, name: d.name, order: d.order, assets: 0, overduePm: 0, openWos: 0, governed: 0, ok: 0, deviations: 0, phaseOut: 0 };
      rows.set(d.id, r);
    }
    return r;
  };
  const disciplineOf = (assetId: Id | undefined): DisciplineCode | undefined => {
    const a = assetId ? db.assets[assetId] : undefined;
    return a ? db.equipmentTypes[a.equipmentTypeId]?.disciplineId : undefined;
  };

  for (const a of assetsIn(db, { towerId })) {
    const r = rowFor(disciplineOf(a.id));
    if (!r) continue;
    r.assets++;
    const status = complianceFor(db, a).status;
    if (status !== "no-standard") r.governed++;
    if (status === "compliant" || status === "waived") r.ok++;
    else if (status === "deviation") r.deviations++;
    else if (status === "phase-out") r.phaseOut++;
  }
  for (const p of Object.values(db.pmPlans)) {
    if (db.assets[p.assetId]?.towerId !== towerId || dueStatus(p.nextDue) !== "overdue") continue;
    const r = rowFor(disciplineOf(p.assetId));
    if (r) r.overduePm++;
  }
  let unlinkedOpenWos = 0;
  for (const w of openWorkOrders(db, { towerId })) {
    const r = rowFor(disciplineOf(w.assetId));
    if (r) r.openWos++;
    else unlinkedOpenWos++;
  }
  return { rows: [...rows.values()].sort((a, b) => a.order - b.order), unlinkedOpenWos };
}

/** PM plans in the tower due within PM_DUE_DAYS (status "due"); overdue plans are counted by towerHealth. */
export function pmDueCount(db: Db, towerId: Id): number {
  let n = 0;
  for (const p of Object.values(db.pmPlans)) if (db.assets[p.assetId]?.towerId === towerId && dueStatus(p.nextDue) === "due") n++;
  return n;
}

// --- as-built coverage ------------------------------------------------------------------------------------------------------------

export const cellKey = (floorId: Id, disciplineId: DisciplineCode): string => `${floorId}|${disciplineId}`;

export interface CoverageModel {
  floors: Floor[];            // floors that hold assets, roof first
  disciplines: Discipline[];  // disciplines present in at least one cell, in house order
  cells: Map<string, CoverageCell>;
  total: number; current: number; pct: number;
}

/** Shapes asBuiltCoverage for a matrix: the cell values are the selector's, nothing is derived from documents here. */
export function coverageModel(db: Db, towerId: Id): CoverageModel {
  const list = asBuiltCoverage(db, towerId);
  const floorIds = new Set(list.map((c) => c.floorId));
  const disciplineIds = new Set(list.map((c) => c.disciplineId));
  const current = list.filter((c) => c.status === "current").length;
  return {
    floors: Object.values(db.floors).filter((f) => floorIds.has(f.id)).sort((a, b) => b.level - a.level),
    disciplines: Object.values(db.disciplines).filter((d) => disciplineIds.has(d.id)).sort((a, b) => a.order - b.order),
    cells: new Map(list.map((c) => [cellKey(c.floorId, c.disciplineId), c])),
    total: list.length, current, pct: list.length === 0 ? 0 : Math.round((current / list.length) * 100),
  };
}

/** Current as-built sheets of the tower, by document number. */
export const keyDocuments = (db: Db, towerId: Id): Document[] =>
  Object.values(db.documents)
    .filter((d) => d.towerId === towerId && d.type === "as-built" && d.status === "current")
    .sort((a, b) => (a.docNo < b.docNo ? -1 : a.docNo > b.docNo ? 1 : 0));

// --- permits ----------------------------------------------------------------------------------------------------------------------

/** Soonest expiry first, so anything that needs renewal leads the list; the occupancy permit (2099) lands last. */
export const permitsOf = (db: Db, towerId: Id): Permit[] =>
  Object.values(db.permits).filter((p) => p.towerId === towerId).sort((a, b) => (a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : 0));

/** The occupancy permit carries the 2099-12-31 sentinel and reads "No expiry". */
export function permitExpiry(p: Permit, today: ISODate = todayISO()): { date: string; note: string } {
  if (p.expiryDate.startsWith("2099")) return { date: "No expiry", note: "" };
  const d = daysUntil(p.expiryDate, today);
  const note = d < 0 ? `Expired ${plural(-d, "day")} ago` : d === 0 ? "Expires today" : `In ${plural(d, "day")}`;
  return { date: fmtDate(p.expiryDate), note };
}

// --- people -----------------------------------------------------------------------------------------------------------------------

/** Everyone whose towerIds include the tower, except the property manager (shown on their own). */
export const contactsFor = (db: Db, tower: Tower): TeamMember[] =>
  Object.values(db.teamMembers).filter((m) => m.towerIds.includes(tower.id) && m.id !== tower.propertyManagerId);

/** "+63 917 810 2201" to a dialable tel: URL. */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

// --- health -----------------------------------------------------------------------------------------------------------------------

/** The non-zero terms of the towerHealth score, in words ("6 overdue PM plans", "1 open P1"). */
export function healthDrivers(h: HealthScore): string[] {
  const out: string[] = [];
  if (h.overduePm > 0) out.push(plural(h.overduePm, "overdue PM plan"));
  if (h.openP1 > 0) out.push(`${h.openP1} open P1`);
  if (h.openP2 > 0) out.push(`${h.openP2} open P2`);
  if (h.expiredPermits > 0) out.push(plural(h.expiredPermits, "expired permit"));
  if (h.failedInspections > 0) out.push(plural(h.failedInspections, "failed inspection"));
  if (h.expiredWarrantyCritA > 0) out.push(`${plural(h.expiredWarrantyCritA, "critical asset")} out of warranty`);
  return out;
}
