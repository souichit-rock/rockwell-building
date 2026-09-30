// Feature-only derived values for the catalogue. Everything that exists in selectors.ts (brandImpact, warrantyBand, warrantyFor,
// openWorkOrders, docsFor) is imported from there; this file only joins the brand / model / standard rows the pages need.
import { brandImpact, openWorkOrders, warrantyBand, warrantyFor } from "@/data/selectors";
import type {
  ApprovalTier, Asset, BadgeTone, Brand, Db, Discipline, DisciplineCode, EquipmentType, Id, Model, Standard, Tower, Vendor, WarrantyBand,
  WorkOrder,
} from "@/data/types";
import { warrantyTone } from "@/lib/status";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** "phase-out" becomes "phase out" (Badge children are the enum value with hyphens replaced; the CSS upper-cases them). */
export const words = (s: string): string => s.replace(/-/g, " ");
/** "phase-out" becomes "Phase out". */
export const sentence = (s: string): string => {
  const t = words(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Own-key lookup, so a route param such as "constructor" is a bad id rather than an Object.prototype member. */
export function lookup<T>(rows: Record<string, T>, id: string | null | undefined): T | undefined {
  return id != null && Object.hasOwn(rows, id) ? rows[id] : undefined;
}

// --- Approval tiers -------------------------------------------------------------------------------------------------------------

const TIER_ORDER: ApprovalTier[] = ["preferred", "acceptable", "phase-out", "prohibited"];
export const tierRank = (t: ApprovalTier): number => TIER_ORDER.indexOf(t);
export const isRestricted = (t: ApprovalTier): boolean => t === "phase-out" || t === "prohibited";

export interface BrandApprovalRow { standard: Standard; tier: ApprovalTier; note?: string }

/** One row per standard that lists the brand, ordered by standard code. */
export function approvalsOf(db: Db, brandId: Id): BrandApprovalRow[] {
  const rows: BrandApprovalRow[] = [];
  for (const standard of Object.values(db.standards)) {
    const a = standard.approvals.find((x) => x.brandId === brandId);
    if (a) rows.push({ standard, tier: a.tier, note: a.note });
  }
  return rows.sort((a, b) => collator.compare(a.standard.code, b.standard.code));
}

/** The most favourable tier the brand holds in any standard; undefined when no standard lists it. */
export const bestTier = (rows: BrandApprovalRow[]): ApprovalTier | undefined =>
  rows.reduce<ApprovalTier | undefined>((best, r) => (best === undefined || tierRank(r.tier) < tierRank(best) ? r.tier : best), undefined);

/** Standards that cover an equipment type, each with the tier this brand holds in it (undefined = brand not listed). */
export function standardsForType(db: Db, typeId: Id, brandId: Id): { standard: Standard; tier?: ApprovalTier }[] {
  return Object.values(db.standards)
    .filter((s) => s.equipmentTypeIds.includes(typeId))
    .map((standard) => ({ standard, tier: standard.approvals.find((a) => a.brandId === brandId)?.tier }));
}

// --- Installed counts -----------------------------------------------------------------------------------------------------------

/** Installed assets per model and per brand in one pass; `towerId` narrows to one tower. Every status counts, as the registry does. */
export function installedCounts(db: Db, towerId?: Id | null): { byModel: Map<Id, number>; byBrand: Map<Id, number> } {
  const byModel = new Map<Id, number>();
  const byBrand = new Map<Id, number>();
  for (const a of Object.values(db.assets)) {
    if (towerId && a.towerId !== towerId) continue;
    byModel.set(a.modelId, (byModel.get(a.modelId) ?? 0) + 1);
    const brandId = db.models[a.modelId]?.brandId;
    if (brandId) byBrand.set(brandId, (byBrand.get(brandId) ?? 0) + 1);
  }
  return { byModel, byBrand };
}

const byTag = (a: Asset, b: Asset) => collator.compare(a.tag, b.tag);
export const assetsOfBrand = (db: Db, brandId: Id): Asset[] =>
  Object.values(db.assets).filter((a) => db.models[a.modelId]?.brandId === brandId).sort(byTag);
export const assetsOfModel = (db: Db, modelId: Id): Asset[] => Object.values(db.assets).filter((a) => a.modelId === modelId).sort(byTag);

export interface TowerCount { tower: Tower; count: number }
/** One row per tower (zero included), in seed order. */
export const countByTower = (db: Db, assets: Asset[]): TowerCount[] =>
  Object.values(db.towers).map((tower) => ({ tower, count: assets.filter((a) => a.towerId === tower.id).length }));

export const vendorsOfBrand = (db: Db, brandId: Id): Vendor[] =>
  Object.values(db.vendors).filter((v) => v.brandIds.includes(brandId)).sort((a, b) => collator.compare(a.name, b.name));

/** Same rule as brandImpact().openWos, but returning the rows so the panel can link them. */
export function openWosOnAssets(db: Db, assets: Asset[]): WorkOrder[] {
  const ids = new Set(assets.map((a) => a.id));
  return openWorkOrders(db).filter((w) => w.assetId && ids.has(w.assetId)).sort((a, b) => collator.compare(a.number, b.number));
}

// --- Models ---------------------------------------------------------------------------------------------------------------------

export interface ModelRow {
  model: Model; brand?: Brand; type?: EquipmentType; discipline?: Discipline; successor?: Model; installed: number;
}

export function modelRows(db: Db, byModel: Map<Id, number>): ModelRow[] {
  return Object.values(db.models).map((model) => {
    const type = db.equipmentTypes[model.equipmentTypeId];
    return {
      model, brand: db.brands[model.brandId], type, discipline: type && db.disciplines[type.disciplineId],
      successor: model.successorModelId ? db.models[model.successorModelId] : undefined, installed: byModel.get(model.id) ?? 0,
    };
  });
}

/** Models that name this one as their successor, so a spec sheet can say what it replaces. */
export const predecessorsOf = (db: Db, modelId: Id): Model[] =>
  Object.values(db.models).filter((m) => m.successorModelId === modelId).sort((a, b) => collator.compare(a.modelNo, b.modelNo));

/** "Flow 750 GPM · Head 125 psi" (all specs, or the first `n`). */
export const specLine = (m: Model, n = Infinity): string =>
  Object.entries(m.specs).slice(0, n).map(([k, v]) => `${k} ${v}`).join(" · ");
export const keySpec = (m: Model): string => specLine(m, 2) || "—";

// --- Catalogue filters ----------------------------------------------------------------------------------------------------------

export interface CatalogueFilters { discipline: DisciplineCode | null; type: Id | null; q: string; towerId: Id | null }
export interface BrandRow {
  brand: Brand; disciplineNames: string[]; installed: number; models: number; approvals: BrandApprovalRow[]; best?: ApprovalTier;
}

const modelHay = (r: ModelRow): string =>
  [r.model.modelNo, r.brand?.name, r.type?.name, r.discipline?.name, ...Object.values(r.model.specs)].join(" ").toLowerCase();

/**
 * Brands and models for the catalogue page. With a tower, only what is installed there is listed (and counted); a search term
 * must appear in the brand's own text or in one of its models, so typing a model number surfaces its brand card too.
 */
export function catalogue(db: Db, f: CatalogueFilters): { brands: BrandRow[]; models: ModelRow[] } {
  const { byModel, byBrand } = installedCounts(db, f.towerId);
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (hay: string) => terms.every((t) => hay.includes(t));
  const all = modelRows(db, byModel);

  const models = all
    .filter((r) =>
      (!f.discipline || r.discipline?.id === f.discipline) && (!f.type || r.model.equipmentTypeId === f.type) && (!f.towerId || r.installed > 0)
      && matches(modelHay(r)))
    .sort((a, b) => collator.compare(a.brand?.name ?? "", b.brand?.name ?? "") || collator.compare(a.model.modelNo, b.model.modelNo));

  const brands = Object.values(db.brands)
    .flatMap((brand): BrandRow[] => {
      const mine = all.filter((r) => r.model.brandId === brand.id);
      const installed = byBrand.get(brand.id) ?? 0;
      const structural =
        (!f.discipline || brand.disciplineIds.includes(f.discipline)) && (!f.type || mine.some((r) => r.model.equipmentTypeId === f.type))
        && (!f.towerId || installed > 0);
      const disciplineNames = brand.disciplineIds.map((d) => db.disciplines[d]?.name ?? d);
      const brandHay = [brand.name, brand.country, brand.note, ...disciplineNames].join(" ").toLowerCase();
      if (!structural || !(matches(brandHay) || mine.some((r) => matches(modelHay(r))))) return [];
      const approvals = approvalsOf(db, brand.id);
      return [{ brand, disciplineNames, installed, models: mine.length, approvals, best: bestTier(approvals) }];
    })
    .sort((a, b) => collator.compare(a.brand.name, b.brand.name));

  return { brands, models };
}

// --- Warranty -------------------------------------------------------------------------------------------------------------------

export const BAND_LABEL: Record<WarrantyBand, string> = {
  expired: "Expired", "30d": "30 days", "90d": "90 days", "365d": "1 year", active: "Active", none: "None",
};

export interface SpreadBucket { key: "expired" | "soon" | "active"; label: string; bands: WarrantyBand[]; tone: BadgeTone; count: number }

/** Expired / ends within 90 days / active. The bands are the registry's own, so each bucket links to a `band=` filter with the same count. */
export function warrantySpread(db: Db, assets: Asset[]): { buckets: SpreadBucket[]; none: number } {
  const bands = assets.map((a) => warrantyBand(warrantyFor(db, a.id)?.end));
  const bucket = (key: SpreadBucket["key"], label: string, of: WarrantyBand[], tone: WarrantyBand): SpreadBucket =>
    ({ key, label, bands: of, tone: warrantyTone(tone), count: bands.filter((b) => of.includes(b)).length });
  return {
    buckets: [
      bucket("expired", "Expired", ["expired"], "expired"),
      bucket("soon", "Ends within 90 days", ["30d", "90d"], "90d"),
      bucket("active", "Active", ["365d", "active"], "active"),
    ],
    none: bands.filter((b) => b === "none").length,
  };
}

// Literal class names so Tailwind can see them (SVG fills for a BadgeTone taken from @/lib/status).
export const TONE_FILL: Record<BadgeTone, string> = {
  ok: "fill-ok", warn: "fill-warn", danger: "fill-danger", info: "fill-info", neutral: "fill-muted", gold: "fill-gold", "solid-ok": "fill-ok",
};

// --- Self-check -----------------------------------------------------------------------------------------------------------------

/** Where-used must add up three ways (by model, by tower, brandImpact) or the registry links would disagree with the pages. Empty = fine. */
export function catalogueProblems(db: Db): string[] {
  const problems: string[] = [];
  const { byModel, byBrand } = installedCounts(db);
  for (const brand of Object.values(db.brands)) {
    const total = byBrand.get(brand.id) ?? 0;
    const viaModels = Object.values(db.models).filter((m) => m.brandId === brand.id).reduce((n, m) => n + (byModel.get(m.id) ?? 0), 0);
    const viaTowers = countByTower(db, assetsOfBrand(db, brand.id)).reduce((n, r) => n + r.count, 0);
    const impact = brandImpact(db, brand.id).assets;
    if (viaModels !== total || viaTowers !== total || impact !== total) {
      problems.push(`${brand.id}: ${total} installed, ${viaModels} by model, ${viaTowers} by tower, ${impact} in brandImpact`);
    }
  }
  return problems;
}
