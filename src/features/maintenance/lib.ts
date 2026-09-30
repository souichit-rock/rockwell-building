// Feature-only derived values for maintenance (spec section 6): plan and inspection rows, filters, calendar cells, labels, CSV columns.
// Due status always comes from the foundation `dueStatus`; nothing here re-derives it.
import type {
  Asset, Db, DisciplineCode, DueStatus, Frequency, Id, InspectionLog, InspectionResult, InspectionType, ISODate, ISODateTime, Permit,
  PMPlan, Reading, TeamMember, TeamName, Tower, Vendor, WorkOrder, WOPriority,
} from "@/data/types";
import { dueStatus, PRIORITY_TARGET_HOURS } from "@/data/selectors";
import type { CsvColumn } from "@/lib/csv";
import { addFrequency, daysUntil, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// --- labels ---------------------------------------------------------------------------------------------------------------------

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", "semi-annual": "Semi-annual", annual: "Annual",
};
export const FREQUENCY_ORDER: Record<Frequency, number> = { weekly: 0, monthly: 1, quarterly: 2, "semi-annual": 3, annual: 4 };

export const INSPECTION_TYPE_LABEL: Record<InspectionType, string> = {
  "pm-visit": "PM visit", regulatory: "Regulatory", "condition-survey": "Condition survey", test: "Test",
};
export const INSPECTION_TYPES = Object.keys(INSPECTION_TYPE_LABEL) as InspectionType[];

export const RESULTS: InspectionResult[] = ["pass", "pass-with-findings", "fail"];
export const RESULT_LABEL: Record<InspectionResult, string> = { pass: "Pass", "pass-with-findings": "Pass with findings", fail: "Fail" };

export const PRIORITIES: WOPriority[] = ["P1", "P2", "P3", "P4"];

/** Badge text: the enum value with hyphens replaced by spaces (design-system section 4.6). */
export const words = (s: string): string => s.replace(/-/g, " ");

export const excerpt = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

export const readingText = (r: Reading): string => `${r.label} ${fmtNumber(r.value)}${r.unit ? ` ${r.unit}` : ""}`;

/** "P2 · 8 h target", "P4 · 14 d target" from the foundation priority targets. */
export function priorityLabel(p: WOPriority): string {
  const h = PRIORITY_TARGET_HOURS[p];
  return `${p} · ${h < 48 ? `${h} h` : `${h / 24} d`} target`;
}

/** Own-property lookup: an id such as "constructor" must read as "not found", not as an inherited function. */
export function pick<T>(rows: Record<Id, T>, id: string | undefined | null): T | undefined {
  return id != null && Object.hasOwn(rows, id) ? rows[id] : undefined;
}

// --- dates ----------------------------------------------------------------------------------------------------------------------

/** "in 5 days", "today", "12 days overdue". */
export function dueNote(nextDue: ISODate, today: ISODate = todayISO()): string {
  const d = daysUntil(nextDue, today);
  return d < 0 ? `${plural(-d, "day")} overdue` : d === 0 ? "today" : `in ${plural(d, "day")}`;
}

/** The next `count` visits, counted from the plan's next due date (month steps clamp to the month end without drifting). */
export const nextDueDates = (plan: PMPlan, count = 6): ISODate[] =>
  Array.from({ length: count }, (_, i) => addFrequency(plan.nextDue, plan.frequency, i));

const HOUR_MS = 3_600_000;
/** Manila wall-clock ISO date-time (+08:00, no DST) for an epoch in ms; the same shape the seed uses for work orders. */
export const manilaIso = (ms: number): ISODateTime => `${new Date(ms + 8 * HOUR_MS).toISOString().slice(0, 19)}+08:00`;
export const hoursFrom = (ms: number, hours: number): ISODateTime => manilaIso(ms + hours * HOUR_MS);

export const isMonth = (s: string | undefined): s is string => s !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

const MONTH_FMT = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
export const monthLabel = (month: string): string => MONTH_FMT.format(new Date(`${month}-01T00:00:00Z`));
export const shiftMonth = (month: string, by: number): string => addFrequency(`${month}-01`, "monthly", by).slice(0, 7);

// --- PM plans -------------------------------------------------------------------------------------------------------------------

export interface PlanRow {
  plan: PMPlan;
  asset: Asset;
  tower: Tower;
  typeName: string;
  discipline: DisciplineCode;
  status: DueStatus;
  permit: Permit | undefined;
  vendor: Vendor | undefined;
}

/** Every plan whose asset resolves, soonest next-due first (overdue plans lead), then asset tag. */
export function planRows(db: Db, today: ISODate = todayISO()): PlanRow[] {
  const rows: PlanRow[] = [];
  for (const plan of Object.values(db.pmPlans)) {
    const asset = pick(db.assets, plan.assetId);
    const tower = asset && pick(db.towers, asset.towerId);
    const type = asset && pick(db.equipmentTypes, asset.equipmentTypeId);
    if (!asset || !tower || !type) continue;
    rows.push({
      plan, asset, tower, typeName: type.name, discipline: type.disciplineId, status: dueStatus(plan.nextDue, today),
      permit: pick(db.permits, plan.permitId), vendor: pick(db.vendors, plan.vendorId),
    });
  }
  return rows.sort((a, b) => cmp(a.plan.nextDue, b.plan.nextDue) || cmp(a.asset.tag, b.asset.tag));
}

export interface ScheduleFilter { tower?: Id; discipline?: DisciplineCode; team?: TeamName; regulatory?: boolean; month?: string }

export const filterPlans = (rows: PlanRow[], f: ScheduleFilter): PlanRow[] =>
  rows.filter(
    (r) =>
      (!f.tower || r.tower.id === f.tower) && (!f.discipline || r.discipline === f.discipline) && (!f.team || r.plan.assigneeTeam === f.team) &&
      (!f.regulatory || r.plan.regulatory) && (!f.month || r.plan.nextDue.startsWith(f.month)),
  );

export function scheduleKpis(rows: PlanRow[], today: ISODate = todayISO()) {
  const month = today.slice(0, 7);
  return {
    overdue: rows.filter((r) => r.status === "overdue").length,
    due: rows.filter((r) => r.status === "due").length,
    thisMonth: rows.filter((r) => r.plan.nextDue.startsWith(month)).length,
    regulatoryDue: rows.filter((r) => r.plan.regulatory && r.status !== "on-track").length,
    regulatoryTotal: rows.filter((r) => r.plan.regulatory).length,
  };
}

export interface CalendarItem { row: PlanRow; carried: boolean }

/**
 * Plans by day for the visible 6 x 7 grid: each plan sits on its next-due date; every overdue plan is also carried into today's cell
 * (when today is on the grid) so overdue work is always visible at the present. The list and the calendar read the same rows.
 */
export function calendarCells(rows: PlanRow[], weeks: ISODate[][], today: ISODate): Map<ISODate, CalendarItem[]> {
  const visible = new Set(weeks.flat());
  const cells = new Map<ISODate, CalendarItem[]>();
  const add = (date: ISODate, item: CalendarItem) => cells.set(date, [...(cells.get(date) ?? []), item]);
  for (const row of rows) if (visible.has(row.plan.nextDue)) add(row.plan.nextDue, { row, carried: false });
  if (visible.has(today)) for (const row of rows) if (row.status === "overdue") add(today, { row, carried: true });
  return cells;
}

export const PLAN_CSV: CsvColumn<PlanRow>[] = [
  { label: "Tower", value: (r) => r.tower.name },
  { label: "Asset tag", value: (r) => r.asset.tag },
  { label: "Equipment", value: (r) => r.typeName },
  { label: "Task", value: (r) => r.plan.task },
  { label: "Frequency", value: (r) => FREQUENCY_LABEL[r.plan.frequency] },
  { label: "Team", value: (r) => r.plan.assigneeTeam },
  { label: "Vendor", value: (r) => r.vendor?.name },
  { label: "Estimated hours", value: (r) => r.plan.estimatedHours },
  { label: "Regulatory", value: (r) => (r.plan.regulatory ? "Yes" : "No") },
  { label: "Permit number", value: (r) => r.permit?.number },
  { label: "Last done", value: (r) => r.plan.lastDone },
  { label: "Next due", value: (r) => r.plan.nextDue },
  { label: "Status", value: (r) => words(r.status) },
];

// --- inspections ----------------------------------------------------------------------------------------------------------------

export interface InspectionRow {
  log: InspectionLog;
  asset: Asset;
  tower: Tower;
  typeName: string;
  workOrder: WorkOrder | undefined;
}

/** Newest first. Logs whose asset no longer resolves are left out. */
export function inspectionRows(db: Db): InspectionRow[] {
  const rows: InspectionRow[] = [];
  for (const log of Object.values(db.inspections)) {
    const asset = pick(db.assets, log.assetId);
    const tower = asset && pick(db.towers, asset.towerId);
    const type = asset && pick(db.equipmentTypes, asset.equipmentTypeId);
    if (!asset || !tower || !type) continue;
    rows.push({ log, asset, tower, typeName: type.name, workOrder: pick(db.workOrders, log.workOrderId) });
  }
  return rows.sort((a, b) => cmp(b.log.date, a.log.date));
}

export interface InspectionFilter { tower?: Id; type?: InspectionType; result?: InspectionResult; assetId?: Id }

export const filterInspections = (rows: InspectionRow[], f: InspectionFilter): InspectionRow[] =>
  rows.filter(
    (r) =>
      (!f.tower || r.tower.id === f.tower) && (!f.type || r.log.type === f.type) && (!f.result || r.log.result === f.result) &&
      (!f.assetId || r.asset.id === f.assetId),
  );

export const INSPECTION_CSV: CsvColumn<InspectionRow>[] = [
  { label: "Date", value: (r) => r.log.date },
  { label: "Tower", value: (r) => r.tower.name },
  { label: "Asset tag", value: (r) => r.asset.tag },
  { label: "Equipment", value: (r) => r.typeName },
  { label: "Type", value: (r) => INSPECTION_TYPE_LABEL[r.log.type] },
  { label: "Inspector", value: (r) => r.log.inspector },
  { label: "Result", value: (r) => RESULT_LABEL[r.log.result] },
  { label: "Findings", value: (r) => r.log.findings },
  { label: "Readings", value: (r) => r.log.readings.map(readingText).join("; ") },
  { label: "Work order", value: (r) => r.workOrder?.number },
];

/** Team members assigned to the tower; the Building Engineer is the default inspector. */
export function inspectorsFor(db: Db, towerId: Id): { people: TeamMember[]; fallback: TeamMember | undefined } {
  const people = Object.values(db.teamMembers).filter((m) => m.towerIds.includes(towerId));
  return { people, fallback: people.find((m) => m.role === "Building Engineer") ?? people[0] };
}

// --- hand-off from the new-inspection form to the inspection page (router state) -------------------------------------------------

export interface SavedState { inspectionId: Id; nextDue?: ISODate; workOrderId?: Id; workOrderNumber?: string }

export function readSaved(state: unknown): SavedState | undefined {
  const saved = typeof state === "object" && state !== null ? (state as { saved?: unknown }).saved : undefined;
  return typeof saved === "object" && saved !== null && typeof (saved as SavedState).inspectionId === "string" ? (saved as SavedState) : undefined;
}
