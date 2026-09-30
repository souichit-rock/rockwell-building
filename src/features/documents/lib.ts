// Feature-only helpers for the documents feature: labels, filter hooks and small derivations that selectors.ts does not offer.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { permitStatus } from "@/data/selectors";
import { useDb } from "@/data/store";
import type {
  Db, DisciplineCode, DocLink, DocRevision, DocStatus, DocType, Document, Floor, Id, LinkRelation, Permit, PermitStatus, PermitType, PMPlan,
} from "@/data/types";
import { daysUntil } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";

export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Badge text: the enum value with hyphens replaced by spaces (design-system §4.6). */
export const words = (s: string) => s.replace(/-/g, " ");

// --- Labels and allow-lists (query values are checked against these, so a hand-edited URL cannot inject anything) ---------------

export const DOC_TYPES: readonly DocType[] = [
  "as-built", "shop-drawing", "om-manual", "datasheet", "tc-report", "permit", "warranty-cert", "finish-schedule", "inspection-report", "contract",
];
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  "as-built": "As-built", "shop-drawing": "Shop drawing", "om-manual": "O&M manual", datasheet: "Datasheet", "tc-report": "T&C report",
  permit: "Permit", "warranty-cert": "Warranty certificate", "finish-schedule": "Finish schedule", "inspection-report": "Inspection report", contract: "Contract",
};
export const DOC_STATUSES: readonly DocStatus[] = ["current", "for-review", "superseded"];
export const DOC_STATUS_LABEL: Record<DocStatus, string> = { current: "Current", "for-review": "For review", superseded: "Superseded" };
export const DISCIPLINE_CODES: readonly DisciplineCode[] = ["ELEC", "HVAC", "PLUMB", "FIRE", "ELV", "VT", "ARCH", "STRUCT"];

export const PERMIT_TYPES: readonly PermitType[] = [
  "occupancy", "fsic", "electrical", "mechanical", "elevator", "genset-ecc", "water-discharge", "sanitary",
];
export const PERMIT_LABEL: Record<PermitType, string> = {
  occupancy: "Occupancy", fsic: "FSIC", electrical: "Electrical", mechanical: "Mechanical", elevator: "Elevator", "genset-ecc": "Genset ECC",
  "water-discharge": "Water discharge", sanitary: "Sanitary",
};
export const PERMIT_STATE_LABEL: Record<PermitStatus, string> = { valid: "Valid", due: "Due soon", expired: "Expired" };

/** The first value in `allowed` that equals `value`, else "" (unset). */
export function pick<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return allowed.find((a) => a === value) ?? "";
}

export const fileSize = (kb: number) => (kb >= 1024 ? `${fmtNumber(kb / 1024, 1)} MB` : `${fmtNumber(kb)} KB`);

// --- Documents ------------------------------------------------------------------------------------------------------------------

/** Newest revision by date; on a tie the later array entry wins (same rule as DocumentCard). */
export const latestRev = (d: Document): DocRevision | undefined =>
  d.revisions.reduce<DocRevision | undefined>((a, r) => (!a || r.date >= a.date ? r : a), undefined);

export const revisionsNewestFirst = (d: Document): DocRevision[] =>
  d.revisions.map((r, i) => ({ r, i })).sort((a, b) => cmp(b.r.date, a.r.date) || b.i - a.i).map((x) => x.r);

/** "R3" after R0..R2 (highest numeric revision plus one); "" when no revision follows the R<n> pattern. */
export function nextRev(d: Document): string {
  const nums = d.revisions.flatMap((r) => {
    const m = /^R(\d+)$/i.exec(r.rev.trim());
    return m ? [Number(m[1])] : [];
  });
  return nums.length ? `R${Math.max(...nums) + 1}` : "";
}

/** "EDS · B3", "EDS" for a tower-wide sheet, "Portfolio" for a document that belongs to no tower. */
export function docPlace(db: Db, d: Document): string {
  const tower = d.towerId ? db.towers[d.towerId] : undefined;
  const floor = d.floorId ? db.floors[d.floorId] : undefined;
  return [tower?.code ?? "Portfolio", floor?.label].filter(Boolean).join(" · ");
}

/** Link relation a new document gets when it is linked to an asset at creation. */
export const relationFor = (t: DocType): LinkRelation =>
  t === "as-built" ? "governs" : t === "tc-report" || t === "warranty-cert" || t === "inspection-report" || t === "permit" ? "certifies" : "references";

/** Later issues (nearest first) and earlier issues (nearest first) around `d`. Cycle-safe. */
export function supersession(db: Db, d: Document): { newer: Document[]; older: Document[] } {
  const seen = new Set<Id>([d.id]);
  const newer: Document[] = [];
  for (let cur = d.supersededById ? db.documents[d.supersededById] : undefined; cur && !seen.has(cur.id); cur = cur.supersededById ? db.documents[cur.supersededById] : undefined) {
    newer.push(cur);
    seen.add(cur.id);
  }
  const older: Document[] = [];
  const all = Object.values(db.documents);
  const queue: Id[] = [d.id];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    for (const x of all) {
      if (x.supersededById !== id || seen.has(x.id)) continue;
      seen.add(x.id);
      older.push(x);
      queue.push(x.id);
    }
  }
  return { newer, older };
}

/** Floors a document covers, governing links first, in link order: floor links, then the floor of each space and asset, then `floorId`. */
export function governedFloors(db: Db, d: Document): Floor[] {
  const out: Floor[] = [];
  const seen = new Set<Id>();
  const add = (id?: Id) => {
    const f = id ? db.floors[id] : undefined;
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  };
  const ordered = [...d.links].sort((a, b) => Number(b.relation === "governs") - Number(a.relation === "governs"));
  for (const l of ordered) {
    if (l.kind === "floor") add(l.id);
    else if (l.kind === "space") add(db.spaces[l.id]?.floorId);
    else if (l.kind === "asset") add(db.assets[l.id]?.floorId);
  }
  add(d.floorId);
  return out;
}

export type LinkGroups = Record<"assets" | "spaces" | "floors" | "other", DocLink[]>;

export function groupLinks(d: Document): LinkGroups {
  const g: LinkGroups = { assets: [], spaces: [], floors: [], other: [] };
  for (const l of d.links) (l.kind === "asset" ? g.assets : l.kind === "space" ? g.spaces : l.kind === "floor" ? g.floors : g.other).push(l);
  return g;
}

export interface LinkView { title: string; sub: string; href?: string; mono?: boolean }

/** What one document link points at, for the Where used lists. A target that no longer exists reads as its id. */
export function describeLink(db: Db, l: DocLink, docId: Id): LinkView {
  const gone: LinkView = { title: l.id, sub: `${l.kind} no longer on record`, mono: true };
  switch (l.kind) {
    case "asset": {
      const a = db.assets[l.id];
      if (!a) return gone;
      const sub = [db.equipmentTypes[a.equipmentTypeId]?.name, db.floors[a.floorId]?.label, db.spaces[a.spaceId]?.name].filter(Boolean).join(" · ");
      return { title: a.tag, sub, href: paths.asset(a.id), mono: true };
    }
    case "space": {
      const s = db.spaces[l.id];
      if (!s) return gone;
      return { title: s.name, sub: [s.code, db.floors[s.floorId]?.label, db.towers[s.towerId]?.code].filter(Boolean).join(" · "), href: paths.space(s.id) };
    }
    case "floor": {
      const f = db.floors[l.id];
      if (!f) return gone;
      const tower = db.towers[f.towerId];
      return { title: `${tower?.name ?? f.towerId} · ${f.label}`, sub: "Show on plan", href: paths.floor(f.towerId, f.id, { highlight: `doc:${docId}` }) };
    }
    case "tower": {
      const t = db.towers[l.id];
      return t ? { title: t.name, sub: `Tower · ${t.code}`, href: paths.tower(t.id) } : gone;
    }
    case "model": {
      const m = db.models[l.id];
      if (!m) return gone;
      return { title: `${db.brands[m.brandId]?.name ?? ""} ${m.modelNo}`.trim(), sub: "Model", href: paths.model(m.id) };
    }
    case "standard": {
      const s = db.standards[l.id];
      return s ? { title: s.code, sub: s.title, href: paths.standard(s.id), mono: true } : gone;
    }
    case "permit": {
      const p = db.permits[l.id];
      if (!p) return gone;
      return {
        title: `${PERMIT_LABEL[p.type]} permit`, sub: `${p.number} · ${db.towers[p.towerId]?.name ?? p.towerId}`,
        href: paths.permits({ tower: p.towerId, type: p.type }),
      };
    }
    case "vendor": {
      const v = db.vendors[l.id];
      return v ? { title: v.name, sub: "Vendor", href: paths.vendor(v.id) } : gone;
    }
  }
}

/** Greedy word wrap for SVG text; the last allowed line is clipped with an ellipsis. */
export function wrapText(text: string, max: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && `${cur} ${w}`.length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const rest = lines.slice(maxLines - 1).join(" ");
  return [...lines.slice(0, maxLines - 1), rest.length > max ? `${rest.slice(0, max - 1).trimEnd()}…` : rest];
}

// --- Register filters and KPIs --------------------------------------------------------------------------------------------------

export interface DocFilters {
  tower: Id | "";
  discipline: DisciplineCode | "";
  type: DocType | "";
  status: DocStatus | "";
  currentOnly: boolean;
  q: string;
}

/** `skip: "type"` leaves the type filter out, so the type chips can count what each chip would show. */
export function matchesDoc(d: Document, f: DocFilters, skip?: "type"): boolean {
  if (f.tower && d.towerId !== f.tower) return false;
  if (f.discipline && d.disciplineId !== f.discipline) return false;
  if (skip !== "type" && f.type && d.type !== f.type) return false;
  if (f.status && d.status !== f.status) return false;
  if (f.currentOnly && d.status !== "current") return false;
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${d.docNo} ${d.title}`.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

/** Register KPI row. Scoped by tower only, so it does not move while the other filters are being tried. */
export function docKpis(db: Db, tower: Id | "") {
  const docs = Object.values(db.documents).filter((d) => !tower || d.towerId === tower);
  const permits = Object.values(db.permits).filter((p) => !tower || p.towerId === tower);
  const states = permits.map(permitState);
  return {
    total: docs.length,
    current: docs.filter((d) => d.status === "current").length,
    supersededLinked: docs.filter((d) => d.status === "superseded" && d.links.length > 0).length,
    forReview: docs.filter((d) => d.status === "for-review").length,
    permitsDue: states.filter((s) => s === "due").length,
    permitsExpired: states.filter((s) => s === "expired").length,
  };
}

// --- Permits --------------------------------------------------------------------------------------------------------------------

const NO_EXPIRY_YEAR = 2099; // the seed marks a permit that never lapses (occupancy) as 2099-12-31

export const hasExpiry = (p: Permit): boolean => p.expiryDate !== "" && Number(p.expiryDate.slice(0, 4)) < NO_EXPIRY_YEAR;

/** Status is always the foundation's `permitStatus`; a blank expiry cannot lapse. */
export const permitState = (p: Permit): PermitStatus => (p.expiryDate ? permitStatus(p.expiryDate) : "valid");

/** PM plans that renew this permit, earliest due first. */
export const renewalPlans = (db: Db, permitId: Id): PMPlan[] =>
  Object.values(db.pmPlans).filter((p) => p.permitId === permitId).sort((a, b) => cmp(a.nextDue, b.nextDue));

/** "in 12 days" / "3 days ago" / "today" for a permit that is due or expired; "" when it is neither (or never lapses). */
export function expiryNote(p: Permit): string {
  if (!hasExpiry(p) || permitState(p) === "valid") return "";
  const d = daysUntil(p.expiryDate);
  return d === 0 ? "today" : d > 0 ? `in ${plural(d, "day")}` : `${plural(-d, "day")} ago`;
}

// --- Route query and tower scope ------------------------------------------------------------------------------------------------

/** Read the route query and patch it in place (replace, so filters do not fill the back button). null / "" removes a key. */
export function useQuery() {
  const [params, setParams] = useSearchParams();
  const set = (patch: Record<string, string | null | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === "") next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  return { params, set };
}

/**
 * URL-backed search box. Router updates are transitions, so a box bound straight to the URL drops keystrokes; a local draft keeps typing
 * instant and the URL (the source of truth for filtering) is written after a short pause. An outside change to the URL replaces the draft.
 */
export function useSearchText(key = "q") {
  const { params, set } = useQuery();
  const applied = params.get(key) ?? "";
  const [draft, setDraft] = useState(applied);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!timer.current) setDraft(applied);
  }, [applied]);
  const onChange = (value: string) => {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      set({ [key]: value });
    }, 200);
  };
  return { draft, onChange, applied };
}

/** Effective tower filter: a valid ?tower= wins over the shared tower scope. `choose("")` means All towers and also clears the scope. */
export function useTowerFilter() {
  const { params, set } = useQuery();
  const { towerId: scope, setTowerId } = useTowerScope();
  const towers = useDb((db) => db.towers);
  const asked = params.get("tower");
  const fromQuery = asked !== null && Object.hasOwn(towers, asked) ? asked : null;
  const tower = fromQuery ?? scope ?? "";
  return {
    tower,
    towerName: tower ? (towers[tower]?.name ?? tower) : "",
    scoped: fromQuery === null && scope !== null,
    choose: (id: string) => {
      set({ tower: id || null });
      if (!id) setTowerId(null);
    },
    clearScope: () => setTowerId(null),
  };
}

/** After a failed submit: move focus to the first field that Field marked aria-invalid. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}
