import { assetsIn, governingSheet, openWorkOrders, warrantyBand, warrantyFor } from "@/data/selectors";
import type {
  Asset, Db, DisciplineCode, DocRevision, DocStatus, Document, FloorKind, Id, PlanPin, PMPlan, Rect, Space, SpaceKind, Tone,
  WorkOrder, WOPriority,
} from "@/data/types";
import { plural } from "@/lib/format";
import { fitRects } from "./view";

// Feature-only derived values for the floor plan and space pages. Everything here reads the store snapshot; nothing is invented.

/** Row by id, without the prototype keys ("constructor" must be a bad id, not a hit). */
export const pick = <T>(rows: Record<Id, T>, id: string): T | undefined => (Object.hasOwn(rows, id) ? rows[id] : undefined);

// --- ?highlight= and ?layer= -----------------------------------------------------------------------------------------------

export type HighlightKind = "asset" | "space" | "doc";
export interface Highlight { kind: HighlightKind; id: Id }
export type Sel = { kind: "asset" | "space"; id: Id } | null;

export function parseHighlight(raw: string | null): Highlight | null {
  const m = /^(asset|space|doc):(.+)$/.exec(raw ?? "");
  return m ? { kind: m[1] as HighlightKind, id: m[2] } : null;
}

export const highlightValue = (h: Highlight) => `${h.kind}:${h.id}` as const;

/** Known discipline codes only, in the order given, no repeats. */
export function parseLayers(raw: string | null, db: Db): DisciplineCode[] {
  const out: DisciplineCode[] = [];
  for (const code of (raw ?? "").split(",")) {
    if (Object.hasOwn(db.disciplines, code) && !out.includes(code as DisciplineCode)) out.push(code as DisciplineCode);
  }
  return out;
}

/** Selection implied by a point highlight that lives on this floor (a doc highlight selects nothing). */
export function selFor(db: Db, floorId: Id, hl: Highlight | null): Sel {
  if (hl?.kind === "asset" && pick(db.assets, hl.id)?.floorId === floorId) return { kind: "asset", id: hl.id };
  if (hl?.kind === "space" && pick(db.spaces, hl.id)?.floorId === floorId) return { kind: "space", id: hl.id };
  return null;
}

// --- documents that govern part of a floor ---------------------------------------------------------------------------------

/** `allRooms`: the sheet governs the floor as such and names no room, so every room is lit. */
export interface Governed { doc: Document; spaceIds: Id[]; assetIds: Id[]; wholeFloor: boolean; allRooms: boolean }

/**
 * What `docId` governs on `floorId`: the spaces and assets it links with "governs" (any relation when it governs nothing at all,
 * e.g. an O&M manual that only references assets). A sheet that governs the floor as such and names no room lights every room.
 */
export function governedOn(db: Db, docId: Id, floorId: Id): Governed | null {
  const doc = pick(db.documents, docId);
  if (!doc) return null;
  const governs = doc.links.filter((l) => l.relation === "governs");
  const spaceIds = new Set<Id>();
  const assetIds = new Set<Id>();
  let wholeFloor = false;
  for (const l of governs.length > 0 ? governs : doc.links) {
    if (l.kind === "floor" && l.id === floorId) wholeFloor = true;
    else if (l.kind === "space" && db.spaces[l.id]?.floorId === floorId) spaceIds.add(l.id);
    else if (l.kind === "asset") {
      const a = db.assets[l.id];
      if (a?.floorId === floorId) {
        assetIds.add(a.id);
        spaceIds.add(a.spaceId);
      }
    }
  }
  const allRooms = wholeFloor && spaceIds.size === 0;
  if (allRooms) for (const s of Object.values(db.spaces)) if (s.floorId === floorId) spaceIds.add(s.id);
  return { doc, spaceIds: [...spaceIds], assetIds: [...assetIds], wholeFloor, allRooms };
}

/** The window a highlight should open on: the pin, the room, or everything the document governs. `null` = fit the whole plan. */
export function focusTarget(db: Db, hl: Highlight | null, pins: PlanPin[], gov: Governed | null): Rect | null {
  if (!hl) return null;
  const point = (x: number, y: number): Rect => ({ x, y, w: 0, h: 0 });
  if (hl.kind === "asset") {
    const pin = pins.find((p) => p.assetId === hl.id);
    return pin ? fitRects([point(pin.x, pin.y)], 40) : null;
  }
  if (hl.kind === "space") {
    const space = pick(db.spaces, hl.id);
    return space ? fitRects([space.rect], 30) : null;
  }
  if (!gov) return null;
  const rects: Rect[] = [];
  for (const id of gov.spaceIds) if (db.spaces[id]) rects.push(db.spaces[id].rect);
  for (const p of pins) if (gov.assetIds.includes(p.assetId)) rects.push(point(p.x, p.y));
  return rects.length > 0 ? fitRects(rects, 30) : null;
}

// --- labels ----------------------------------------------------------------------------------------------------------------

const KIND_ACRONYM: Partial<Record<SpaceKind, string>> = {
  stp: "STP", fcc: "FCC", mdf: "MDF", "bms-room": "BMS room", "lv-room": "LV room", "ahu-room": "AHU room",
};

export const kindLabel = (kind: SpaceKind): string => KIND_ACRONYM[kind] ?? `${kind[0].toUpperCase()}${kind.slice(1).replace(/-/g, " ")}`;

export const FLOOR_KIND_LABEL: Record<FloorKind, string> = {
  "basement-plant": "Basement plant", "basement-parking": "Basement parking", ground: "Ground floor", podium: "Podium", typical: "Typical floor", roof: "Roof",
};

export const words = (s: string): string => s.replace(/-/g, " ");
export const capitalise = (s: string): string => `${s[0].toUpperCase()}${s.slice(1)}`;

/** Literal class names so Tailwind sees them: the swatch dot beside a discipline name, in the pin's own colour. */
export const TONE_BG: Record<Tone, string> = {
  navy: "bg-navy", gold: "bg-gold", info: "bg-info", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-muted", "ink-soft": "bg-ink-soft",
};

// --- asset facts for the drawer and the panels -----------------------------------------------------------------------------

export function latestRev(doc: Document): DocRevision | undefined {
  return doc.revisions.reduce<DocRevision | undefined>((a, r) => (!a || r.date >= a.date ? r : a), undefined);
}

/** The plan with the earliest due date. */
export function nextPmFor(db: Db, assetId: Id): PMPlan | undefined {
  let best: PMPlan | undefined;
  for (const p of Object.values(db.pmPlans)) if (p.assetId === assetId && (!best || p.nextDue < best.nextDue)) best = p;
  return best;
}

export function toneOf(db: Db, asset: Asset): Tone {
  const type = db.equipmentTypes[asset.equipmentTypeId];
  return (type && db.disciplines[type.disciplineId]?.tone) || "muted";
}

export function assetBrief(db: Db, asset: Asset) {
  const type = db.equipmentTypes[asset.equipmentTypeId];
  const model = db.models[asset.modelId];
  const brand = model && db.brands[model.brandId];
  const vendor = db.vendors[asset.serviceVendorId ?? asset.installerVendorId];
  const warranty = warrantyFor(db, asset.id);
  return {
    type, model, brand, vendor,
    vendorRole: asset.serviceVendorId ? "Service vendor" : "Installer",
    contact: vendor?.contacts[0],
    space: db.spaces[asset.spaceId],
    floor: db.floors[asset.floorId],
    plan: nextPmFor(db, asset.id),
    warranty,
    band: warrantyBand(warranty?.end),
    sheet: governingSheet(db, asset.id),
  };
}

/** The tower override note for a space kind and surface, when the override row carries one. */
export function overrideNote(db: Db, kind: SpaceKind, surface: string, towerId: Id): string | undefined {
  return Object.values(db.finishSchedule).find((e) => e.spaceKind === kind && e.surface === surface && e.towerId === towerId)?.note;
}

// --- space detail ----------------------------------------------------------------------------------------------------------

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const DOC_ORDER: Record<DocStatus, number> = { current: 0, "for-review": 1, superseded: 2 };
const byStatusThenNo = (a: Document, b: Document) => DOC_ORDER[a.status] - DOC_ORDER[b.status] || cmp(a.docNo, b.docNo);
const WO_ORDER: Record<WOPriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export interface RoomDoc { doc: Document; why: string }

/**
 * The sheets that govern a room, split by how they reach it: `room` names the room itself or an asset inside it; `floor` only
 * covers the whole floor (one as-built per discipline), so it is listed apart and never mistaken for a room-specific drawing.
 * Current sheets come first, superseded ones last, so a stale sheet is visible but never leads.
 */
export function docsForSpace(db: Db, space: Space): { room: RoomDoc[]; floor: Document[] } {
  const assetIds = new Set(assetsIn(db, { spaceId: space.id }).map((a) => a.id));
  const room: RoomDoc[] = [];
  const floor: Document[] = [];
  for (const doc of Object.values(db.documents)) {
    let names = false;
    let assets = 0;
    let wholeFloor = false;
    for (const l of doc.links) {
      if (l.relation !== "governs") continue;
      if (l.kind === "space" && l.id === space.id) names = true;
      else if (l.kind === "asset" && assetIds.has(l.id)) assets++;
      else if (l.kind === "floor" && l.id === space.floorId) wholeFloor = true;
    }
    if (names || assets > 0) {
      const why = names && assets > 0 ? `Governs this room and ${plural(assets, "asset")} in it` : names ? "Governs this room" : `Governs ${plural(assets, "asset")} in this room`;
      room.push({ doc, why });
    } else if (wholeFloor) floor.push(doc);
  }
  return { room: room.sort((a, b) => byStatusThenNo(a.doc, b.doc)), floor: floor.sort(byStatusThenNo) };
}

/** Open work orders raised on the room itself or on an asset in it, most urgent first. */
export function openWosForSpace(db: Db, space: Space): WorkOrder[] {
  const assetIds = new Set(assetsIn(db, { spaceId: space.id }).map((a) => a.id));
  return openWorkOrders(db, { towerId: space.towerId })
    .filter((w) => w.spaceId === space.id || (w.assetId !== undefined && assetIds.has(w.assetId)))
    .sort((a, b) => WO_ORDER[a.priority] - WO_ORDER[b.priority] || cmp(a.dueAt, b.dueAt));
}
