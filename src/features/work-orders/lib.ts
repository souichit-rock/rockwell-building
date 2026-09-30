// Feature-only helpers for work orders: labels, the workflow graph, filters read from the route query, time formatting and the
// one write path for status changes (board card, detail header and the close-out dialog all go through changeStatus).
import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { isOverdueWo, PRIORITY_TARGET_HOURS } from "@/data/selectors";
import { getDb, newId, upsert, useDb } from "@/data/store";
import type {
  Asset, Db, Floor, Id, InspectionResult, InspectionType, ISODateTime, Space, TeamMember, Tower, WOEvent, WOKind, WOPriority, WOStatus, WorkOrder,
} from "@/data/types";
import { addFrequency, todayISO } from "@/lib/dates";

// --- Labels -----------------------------------------------------------------------------------------------------------------------

export const STATUSES: WOStatus[] = ["open", "assigned", "in-progress", "on-hold", "done", "cancelled"];
export const STATUS_LABEL: Record<WOStatus, string> = {
  open: "Open", assigned: "Assigned", "in-progress": "In progress", "on-hold": "On hold", done: "Done", cancelled: "Cancelled",
};
export const KINDS: WOKind[] = ["corrective", "preventive", "inspection", "project"];
export const KIND_LABEL: Record<WOKind, string> = { corrective: "Corrective", preventive: "Preventive", inspection: "Inspection", project: "Project" };
export const PRIORITIES: WOPriority[] = ["P1", "P2", "P3", "P4"];
export const RESULTS: InspectionResult[] = ["pass", "pass-with-findings", "fail"];
export const RESULT_LABEL: Record<InspectionResult, string> = { pass: "Pass", "pass-with-findings": "Pass with findings", fail: "Fail" };

export const isFinal = (s: WOStatus): boolean => s === "done" || s === "cancelled";
/** Badge text is the enum value with hyphens replaced by spaces (design-system 4.6). */
export const badgeText = (value: string): string => value.replace(/-/g, " ");

/** Own-property lookup: an id such as "constructor" from the URL must not find something on the prototype. */
export const lookup = <T,>(rec: Record<string, T>, id: string | null | undefined): T | undefined =>
  id && Object.hasOwn(rec, id) ? rec[id] : undefined;

export function targetText(p: WOPriority): string {
  const h = PRIORITY_TARGET_HOURS[p];
  return h < 24 ? `${h} h` : `${h / 24} d`;
}
export const priorityLabel = (p: WOPriority): string => `${p} · target ${targetText(p)}`;

/** "GRB-B2-FP-01 · Fire pump (electric)" style option label for an asset. */
export const assetLabel = (db: Db, id: Id): string => {
  const a = db.assets[id];
  return a ? `${a.tag} · ${db.equipmentTypes[a.equipmentTypeId]?.name ?? a.equipmentTypeId}` : id;
};

/**
 * Where a work order is, resolved without throwing: a job can hang off an asset, off a room alone, or off the tower only,
 * which is why the locationOf selector (asset required) is not used here.
 */
export interface Where { tower: Tower | undefined; floor: Floor | undefined; space: Space | undefined; asset: Asset | undefined }
export function whereOf(db: Db, wo: WorkOrder): Where {
  const asset = lookup(db.assets, wo.assetId);
  const space = lookup(db.spaces, wo.spaceId ?? asset?.spaceId);
  return { tower: lookup(db.towers, wo.towerId), floor: lookup(db.floors, space?.floorId ?? asset?.floorId), space, asset };
}

// --- Workflow ---------------------------------------------------------------------------------------------------------------------

// open -> assigned -> in-progress -> on-hold / done, cancel from any non-final state, resume from on-hold.
const NEXT: Record<WOStatus, WOStatus[]> = {
  open: ["assigned", "cancelled"],
  assigned: ["in-progress", "cancelled"],
  "in-progress": ["on-hold", "done", "cancelled"],
  "on-hold": ["in-progress", "cancelled"],
  done: [],
  cancelled: [],
};
export const nextStatuses = (s: WOStatus): WOStatus[] => NEXT[s];

export function transitionLabel(from: WOStatus, to: WOStatus): string {
  if (to === "assigned") return "Assign";
  if (to === "in-progress") return from === "on-hold" ? "Resume" : "Start work";
  if (to === "on-hold") return "Put on hold";
  if (to === "done") return "Complete";
  return "Cancel";
}

// --- People -----------------------------------------------------------------------------------------------------------------------

/** The tower's Building Engineer: reporter default on the new form, and the "by" on every status change (there is no sign-in). */
export function defaultEngineer(db: Db, towerId: Id): TeamMember | undefined {
  const members = Object.values(db.teamMembers).filter((m) => m.towerIds.includes(towerId));
  return members.find((m) => m.role === "Building Engineer") ?? members[0];
}

const actorFor = (db: Db, wo: WorkOrder): TeamMember | undefined => defaultEngineer(db, wo.towerId) ?? db.teamMembers[wo.reportedById];

export const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

export const phoneHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;

// --- Time -------------------------------------------------------------------------------------------------------------------------

const HOUR = 3_600_000;
const MANILA_OFFSET = 8 * HOUR;

/** Manila wall-clock ISO string, the same shape the seed uses ("2026-09-30T09:40:00+08:00"). */
export const manilaIso = (ms: number): ISODateTime => `${new Date(ms + MANILA_OFFSET).toISOString().slice(0, 19)}+08:00`;
/** Value for <input type="datetime-local">, in Manila time to match every date shown in the app. */
export const toLocalInput = (ms: number): string => new Date(ms + MANILA_OFFSET).toISOString().slice(0, 16);
export function fromLocalInput(value: string): ISODateTime | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00+08:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
/** Now plus the priority's response target: what the due field is prefilled with. */
export const dueFor = (priority: WOPriority, from: number = Date.now()): string => toLocalInput(from + PRIORITY_TARGET_HOURS[priority] * HOUR);

/** "<1 h", "5 h", "3 d" */
export function span(ms: number): string {
  const h = Math.max(0, Math.round(ms / HOUR));
  if (h < 1) return "<1 h";
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} d`;
}

const endOf = (w: WorkOrder, now: number): number =>
  isFinal(w.status) ? Date.parse(w.completedAt ?? w.timeline[w.timeline.length - 1]?.at ?? w.reportedAt) : now;
/** Milliseconds from reported to now (open work) or to completion / cancellation (final work). */
export const ageMs = (w: WorkOrder, now: number): number => Math.max(0, endOf(w, now) - Date.parse(w.reportedAt));

export function ageLine(w: WorkOrder, now: number): string {
  const s = span(ageMs(w, now));
  return w.status === "done" ? `Closed in ${s}` : w.status === "cancelled" ? `Cancelled after ${s}` : `${s} old`;
}

/** "Overdue 3 h" / "Due in 2 d"; empty for final work orders. */
export function dueLine(w: WorkOrder, now: number): string {
  if (isFinal(w.status)) return "";
  const due = Date.parse(w.dueAt);
  return isOverdueWo(w, now) ? `Overdue ${span(now - due)}` : `Due in ${span(due - now)}`;
}

// --- Filters ----------------------------------------------------------------------------------------------------------------------

export interface WoFilters {
  view: "board" | "list";
  tower: Id | "";
  status: WOStatus | "";
  priority: WOPriority | "";
  kind: WOKind | "";
  assignee: Id | "";
  vendor: Id | "";
  assetId: Id | "";
  cancelled: boolean;
}

const pick = <T extends string>(v: string | null, all: readonly T[]): T | "" => (all.find((x) => x === v) ?? "");

/**
 * Filters live in the route query. The tower comes from `?tower=` when present (query wins) and from the tower scope otherwise.
 * `update` writes query keys (an empty value removes the key); `setTower("")` also drops the scope so "All towers" means all.
 */
export function useWoFilters() {
  const db = useDb((d) => d);
  const [sp, setSp] = useSearchParams();
  const { towerId: scope, setTowerId } = useTowerScope();
  const queryTower = lookup(db.towers, sp.get("tower"))?.id ?? "";

  const filters: WoFilters = {
    view: sp.get("view") === "list" ? "list" : "board",
    tower: queryTower || scope || "",
    status: pick(sp.get("status"), STATUSES),
    priority: pick(sp.get("priority"), PRIORITIES),
    kind: pick(sp.get("kind"), KINDS),
    assignee: lookup(db.teamMembers, sp.get("assignee"))?.id ?? "",
    vendor: lookup(db.vendors, sp.get("vendor"))?.id ?? "",
    assetId: sp.get("assetId") ?? "",
    cancelled: sp.get("cancelled") === "1",
  };

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setSp(next, { replace: true });
  };
  const setTower = (id: string) => {
    update({ tower: id });
    if (!id && scope) setTowerId(null);
  };
  const clear = () => {
    const next = new URLSearchParams();
    const view = sp.get("view");
    if (view) next.set("view", view);
    setSp(next, { replace: true });
  };

  return {
    filters,
    update,
    setTower,
    clear,
    hasFilters: Boolean(queryTower || filters.status || filters.priority || filters.kind || filters.assignee || filters.vendor || filters.assetId || filters.cancelled),
    /** Tower id shown in the "Scoped to" chip: the scope, but only while no ?tower= overrides it. */
    scopeTower: scope && !queryTower ? scope : "",
    clearScope: () => setTowerId(null),
  };
}

/** Cancelled work orders are hidden unless `cancelled=1` or `status=cancelled`; board and list share this, so their counts agree. */
export function filterWorkOrders(db: Db, f: WoFilters): WorkOrder[] {
  const showCancelled = f.cancelled || f.status === "cancelled";
  return Object.values(db.workOrders).filter(
    (w) =>
      (showCancelled || w.status !== "cancelled") &&
      (!f.tower || w.towerId === f.tower) &&
      (!f.status || w.status === f.status) &&
      (!f.priority || w.priority === f.priority) &&
      (!f.kind || w.kind === f.kind) &&
      (!f.assignee || w.assignedToId === f.assignee) &&
      (!f.vendor || w.vendorId === f.vendor) &&
      (!f.assetId || w.assetId === f.assetId),
  );
}

/** Active work first (overdue, then priority, then due), finished work last (most recent first). */
export function sortWorkOrders(list: WorkOrder[], now: number): WorkOrder[] {
  const doneAt = (w: WorkOrder) => Date.parse(w.completedAt ?? w.reportedAt);
  return [...list].sort((a, b) => {
    const fa = isFinal(a.status);
    const fb = isFinal(b.status);
    if (fa !== fb) return fa ? 1 : -1;
    if (fa) return doneAt(b) - doneAt(a);
    return (
      Number(isOverdueWo(b, now)) - Number(isOverdueWo(a, now)) ||
      a.priority.localeCompare(b.priority) ||
      Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
      a.number.localeCompare(b.number)
    );
  });
}

// --- Writes -----------------------------------------------------------------------------------------------------------------------

/**
 * Moves a work order along the workflow and appends the timeline event. Reads the latest row from the store, so a stale caller is safe,
 * and ignores a move the workflow does not allow. Moving to "assigned" with nobody set assigns the tower's Building Engineer.
 * Done sets completedAt; for preventive and inspection work with an asset it logs an inspection, and when a plan is linked it
 * rolls the plan (lastDone today, nextDue one frequency step on), exactly as the maintenance form does.
 */
export function changeStatus(woId: Id, to: WOStatus, opts: { note?: string; result?: InspectionResult } = {}): void {
  const db = getDb();
  const wo = db.workOrders[woId];
  if (!wo || !NEXT[wo.status].includes(to)) return;

  const now = Date.now();
  const at = manilaIso(now);
  const actor = actorFor(db, wo);
  const text = opts.note?.trim() ?? "";
  const result = opts.result ?? "pass";

  const assignedToId = wo.assignedToId ?? (to === "assigned" && !wo.vendorId ? actor?.id : undefined);
  const owners = [assignedToId && db.teamMembers[assignedToId]?.name, wo.vendorId && db.vendors[wo.vendorId]?.name].filter(Boolean).join(" and ");

  let note: string;
  if (to === "assigned") note = owners ? `Assigned to ${owners}.` : "Marked as assigned.";
  else if (to === "in-progress") note = wo.status === "on-hold" ? "Work resumed." : "Work started.";
  else if (to === "on-hold") note = text ? `Put on hold: ${text}` : "Put on hold.";
  else if (to === "done") note = `Work completed. Result: ${RESULT_LABEL[result]}.${text ? ` ${text}` : ""}`;
  else note = text ? `Cancelled: ${text}` : "Cancelled.";

  const event: WOEvent = { at, by: actor?.name ?? "Unknown", note, status: to };
  upsert("workOrders", {
    ...wo,
    status: to,
    ...(assignedToId ? { assignedToId } : {}),
    ...(to === "done" ? { completedAt: at } : {}),
    timeline: [...wo.timeline, event],
  });

  if (to !== "done") return;
  const today = todayISO();
  const plan = wo.planId ? db.pmPlans[wo.planId] : undefined;
  if (wo.assetId && (wo.kind === "preventive" || wo.kind === "inspection")) {
    const type: InspectionType = plan?.regulatory ? "regulatory" : wo.kind === "preventive" ? "pm-visit" : "test";
    upsert("inspections", {
      id: newId("insp"),
      assetId: wo.assetId,
      ...(wo.planId ? { planId: wo.planId } : {}),
      workOrderId: wo.id,
      date: today,
      type,
      inspector: (assignedToId && db.teamMembers[assignedToId]?.name) || (wo.vendorId && db.vendors[wo.vendorId]?.name) || actor?.name || "Unknown",
      ...(wo.vendorId ? { vendorId: wo.vendorId } : {}),
      result,
      readings: [],
      findings: text || (result === "pass" ? "No abnormal findings." : RESULT_LABEL[result]),
    });
  }
  if (plan) upsert("pmPlans", { ...plan, lastDone: today, nextDue: addFrequency(today, plan.frequency) });
}

/** Appends a note (an event without a status change). Allowed in any status. */
export function addNote(woId: Id, text: string): void {
  const db = getDb();
  const wo = db.workOrders[woId];
  const note = text.trim();
  if (!wo || !note) return;
  const event: WOEvent = { at: manilaIso(Date.now()), by: actorFor(db, wo)?.name ?? "Unknown", note };
  upsert("workOrders", { ...wo, timeline: [...wo.timeline, event] });
}
