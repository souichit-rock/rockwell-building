import { useSyncExternalStore } from "react";
import type { Collection, Db, Id, Row } from "@/data/types";

// Read-only seed + a small overlay of demo edits. The overlay is the only thing persisted (localStorage "rb:v1");
// the snapshot is the seed with the overlay applied, rebuilt per write and cached. Only this file and useTheme.ts touch browser storage.
// The seed (about 90 kB) is its own chunk so the entry chunk stays inside the bundle budget: `storeReady` settles once it has loaded,
// and App suspends on it, so no component ever reads the store before then.
const KEY = "rb:v1";

export interface UiState { towerScope: Id | null }
type Upserts = { [K in Collection]?: Record<Id, Row<K>> };
interface Overlay { v: 1; upserts: Upserts; removed: Partial<Record<Collection, Id[]>>; ui: UiState }

const emptyOverlay = (): Overlay => ({ v: 1, upserts: {}, removed: {}, ui: { towerScope: null } });
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

let seed: Db; // assigned by storeReady, before any component renders
let snapshot: Db;
let overlay: Overlay = emptyOverlay();

function build(o: Overlay): Db {
  const db: Db = { ...seed }; // collections without edits keep sharing the seed's records
  for (const c of Object.keys(seed) as Collection[]) {
    const up = o.upserts[c];
    const rm = o.removed[c];
    if (!up && !rm?.length) continue;
    const rows: Record<Id, unknown> = { ...seed[c], ...up };
    for (const id of rm ?? []) delete rows[id];
    Object.assign(db, { [c]: rows });
  }
  return db;
}

// null = nothing usable stored (absent, unreadable, bad JSON, wrong version, or it cannot be applied): the caller starts clean.
function readOverlay(): Overlay | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    if (!isRecord(o) || o.v !== 1 || !isRecord(o.upserts) || !isRecord(o.removed)) return null;
    const ui = isRecord(o.ui) && typeof o.ui.towerScope === "string" ? o.ui.towerScope : null;
    const overlay: Overlay = { v: 1, upserts: o.upserts as Upserts, removed: o.removed as Overlay["removed"], ui: { towerScope: ui } };
    build(overlay); // throws on a malformed collection, which discards the overlay
    return overlay;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(overlay));
  } catch {
    // private window, quota or blocked storage: the session still works, it just will not survive a reload
  }
}

/** Resolves once the seed chunk is loaded and the stored overlay applied. App suspends on it (React `use`). */
export const storeReady: Promise<void> = import("@/data/seed").then(({ SEED }) => {
  seed = SEED;
  overlay = readOverlay() ?? emptyOverlay();
  snapshot = build(overlay);
  // Another tab wrote (or cleared) the overlay: adopt it so this tab never overwrites it with stale state.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    overlay = readOverlay() ?? emptyOverlay();
    snapshot = build(overlay);
    emit();
  });
});

function commitDb() {
  snapshot = build(overlay);
  persist();
  emit();
}

export const getDb = (): Db => snapshot;

/** Subscribes to the store and returns `select(db)`. Runs on every render of the caller, so an inline selector may return a fresh array or object. */
export function useDb<T>(select: (db: Db) => T): T {
  return select(useSyncExternalStore(subscribe, getDb, getDb));
}

/** Insert or replace a full row (the id is read from the row). */
export function upsert<K extends Collection>(c: K, row: Row<K>): void {
  const id = (row as { id: Id }).id;
  const kept = overlay.removed[c]?.filter((x) => x !== id);
  overlay = {
    ...overlay,
    upserts: { ...overlay.upserts, [c]: { ...overlay.upserts[c], [id]: row } },
    removed: kept ? { ...overlay.removed, [c]: kept } : overlay.removed,
  };
  commitDb();
}

export function remove(c: Collection, id: Id): void {
  const { [id]: _dropped, ...rest } = (overlay.upserts[c] ?? {}) as Record<Id, unknown>;
  const hidden = id in seed[c] ? [...new Set([...(overlay.removed[c] ?? []), id])] : (overlay.removed[c] ?? []);
  overlay = {
    ...overlay,
    upserts: { ...overlay.upserts, [c]: rest } as Upserts,
    removed: { ...overlay.removed, [c]: hidden },
  };
  commitDb();
}

/** Drops every demo edit and the tower scope. The caller confirms with the user first (ResetDemo does). */
export function resetDemo(): void {
  overlay = emptyOverlay();
  snapshot = build(overlay);
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored that we could not already ignore
  }
  emit();
}

export const getUi = (): UiState => overlay.ui;
export const useUi = (): UiState => useSyncExternalStore(subscribe, getUi, getUi);

export function setUi(patch: Partial<UiState>): void {
  overlay = { ...overlay, ui: { ...overlay.ui, ...patch } };
  persist();
  emit();
}

/** Next work-order number for a prefix such as "WO-2026-": prefix + 4-digit max-existing + 1 (scans workOrders only). */
export function nextNumber(prefix: string): string {
  let max = 0;
  for (const wo of Object.values(snapshot.workOrders)) {
    if (!wo.number.startsWith(prefix)) continue;
    const n = Number.parseInt(wo.number.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

let lastStamp = 0;
/** `${prefix}-${base36 timestamp}`; strictly increasing within a session so two rows made in the same millisecond cannot collide. */
export function newId(prefix: string): Id {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return `${prefix}-${lastStamp.toString(36)}`;
}
