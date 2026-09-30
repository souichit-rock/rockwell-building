import type { Db, DocRevision, PermitType, SearchHit } from "@/data/types";
import { paths } from "@/lib/paths";

const PERMIT_LABEL: Record<PermitType, string> = {
  occupancy: "Occupancy", fsic: "FSIC", electrical: "Electrical", mechanical: "Mechanical", elevator: "Elevator",
  "genset-ecc": "Genset ECC", "water-discharge": "Water discharge", sanitary: "Sanitary",
};
const words = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// One index per store snapshot: the palette calls buildIndex on every open and gets the cached array until a write happens.
const cache = new WeakMap<Db, SearchHit[]>();

/** Flat, searchable list over towers, assets, work orders, documents, standards, brands, models, vendors, permits, floors and rooms.
 *  Build order is the tie-break order in `search`, so the kinds people jump to most come first and the ~2,400 rooms come last. */
export function buildIndex(db: Db): SearchHit[] {
  const cached = cache.get(db);
  if (cached) return cached;

  const out: SearchHit[] = [];
  // The haystack is title + subtitle + extra terms, lower-cased once here so `search` only does substring tests.
  const add = (kind: string, id: string, title: string, subtitle: string, href: string, ...terms: Array<string | undefined>) =>
    out.push({ kind, id, title, subtitle, href, haystack: [title, subtitle, ...terms].filter(Boolean).join(" ").toLowerCase() });

  for (const t of Object.values(db.towers)) {
    add("Tower", t.id, t.name, `${t.code} · ${t.estate}`, paths.tower(t.id), t.address);
  }
  for (const a of Object.values(db.assets)) {
    const type = db.equipmentTypes[a.equipmentTypeId];
    const model = db.models[a.modelId];
    const brand = model && db.brands[model.brandId];
    const floor = db.floors[a.floorId];
    const space = db.spaces[a.spaceId];
    const tower = db.towers[a.towerId];
    add(
      "Asset", a.id, a.tag,
      [type?.name, [brand?.name, model?.modelNo].filter(Boolean).join(" "), floor?.label, space?.name].filter(Boolean).join(" · "),
      paths.asset(a.id), a.serial, space?.code, tower?.name,
    );
  }
  for (const w of Object.values(db.workOrders)) {
    add("Work order", w.id, w.number, `${w.title} · ${w.priority} · ${words(w.status)}`, paths.workOrder(w.id),
      w.assetId ? db.assets[w.assetId]?.tag : undefined, db.towers[w.towerId]?.name);
  }
  for (const d of Object.values(db.documents)) {
    const latest = d.revisions.reduce<DocRevision | undefined>((a, r) => (!a || r.date >= a.date ? r : a), undefined);
    add("Document", d.id, d.docNo, latest ? `${d.title} · Rev ${latest.rev}` : d.title, paths.document(d.id),
      words(d.type), d.towerId ? db.towers[d.towerId]?.name : undefined);
  }
  for (const s of Object.values(db.standards)) {
    add("Standard", s.id, s.code, s.title, paths.standard(s.id), s.disciplineId);
  }
  for (const b of Object.values(db.brands)) {
    add("Brand", b.id, b.name, `Brand · ${b.country}`, paths.brand(b.id));
  }
  for (const m of Object.values(db.models)) {
    add("Model", m.id, m.modelNo, `${db.brands[m.brandId]?.name ?? "Model"} · ${db.equipmentTypes[m.equipmentTypeId]?.name ?? ""}`, paths.model(m.id));
  }
  for (const v of Object.values(db.vendors)) {
    add("Vendor", v.id, v.name, `${words(v.kind)} · ${v.disciplineIds.join(", ")}`, paths.vendor(v.id),
      ...v.contacts.flatMap((c) => [c.name, c.email]));
  }
  for (const p of Object.values(db.permits)) {
    add("Permit", p.id, p.number, `${PERMIT_LABEL[p.type]} · ${db.towers[p.towerId]?.name ?? ""}`, paths.permits({ tower: p.towerId, type: p.type }),
      p.type, p.issuer);
  }
  for (const f of Object.values(db.floors)) {
    const tower = db.towers[f.towerId];
    add("Floor", f.id, `${tower?.name ?? f.towerId} · ${f.label}`, `Floor plan · ${words(f.kind)}`, paths.floor(f.towerId, f.id),
      tower && `${tower.code} ${f.label}`);
  }
  for (const s of Object.values(db.spaces)) {
    const tower = db.towers[s.towerId];
    add("Space", s.id, s.name, `${tower?.code ?? s.towerId} · ${db.floors[s.floorId]?.label ?? ""} · ${s.code}`, paths.space(s.id),
      tower?.name, words(s.kind));
  }

  cache.set(db, out);
  return out;
}

/** Every whitespace-separated term must appear in the haystack (case-insensitive). Ranking: exact match on the title (tag / docNo / number / name)
 *  first, then title prefix, title substring, haystack-only; ties keep index order. At most a quarter of `limit` (min 4) per kind, so one
 *  kind (2,400 rooms, 47 assets) cannot crowd the rest out of the palette. */
export function search(index: SearchHit[], q: string, limit = 30): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (!query || limit <= 0) return [];
  const terms = query.split(/\s+/);

  const matches: Array<{ hit: SearchHit; rank: number; order: number }> = [];
  index.forEach((hit, order) => {
    if (!terms.every((t) => hit.haystack.includes(t))) return;
    const title = hit.title.toLowerCase();
    const rank = title === query ? 0 : title.startsWith(query) ? 1 : title.includes(query) ? 2 : 3;
    matches.push({ hit, rank, order });
  });
  matches.sort((a, b) => a.rank - b.rank || a.order - b.order);

  const perKind = Math.max(4, Math.ceil(limit / 4));
  const used = new Map<string, number>();
  const out: SearchHit[] = [];
  for (const { hit } of matches) {
    const n = used.get(hit.kind) ?? 0;
    if (n >= perKind) continue;
    used.set(hit.kind, n + 1);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}
