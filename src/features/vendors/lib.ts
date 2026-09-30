// Feature-only derived values for vendors and warranties: pure functions of the Db snapshot, joined for display.
// Warranty bands, due states and open work orders always come from selectors.ts; nothing here re-implements them.
import { PERMIT_DUE_DAYS, dueStatus, isOverdueWo, openWorkOrders, warrantyBand } from "@/data/selectors";
import type {
  Asset, Brand, Contact, Db, Discipline, Document, DueStatus, Id, ISODate, Model, PermitStatus, PMPlan, Tower, Vendor, VendorKind,
  Warranty, WarrantyBand, WorkOrder,
} from "@/data/types";
import { daysUntil, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";

/** Spec 6.10: the accreditation badge shows when accreditation ends within 60 days (or has lapsed): the permit window, so status comes from permitStatus. */
export const ACCREDITATION_DUE_DAYS = PERMIT_DUE_DAYS;
/** A contract ending within a quarter is flagged on the vendor card and page. */
export const CONTRACT_ENDING_DAYS = 90;
/** Keeps the printed claim sheet on one A4 page; the sheet says how many more exist. */
export const CLAIM_SHEET_MAX_WOS = 6;

export const VENDOR_KINDS: VendorKind[] = ["manufacturer-rep", "contractor", "service-provider", "supplier"];
export const isVendorKind = (v: string): v is VendorKind => (VENDOR_KINDS as string[]).includes(v);

/** "manufacturer-rep" -> "manufacturer rep" (Badge text; the CSS upper-cases it). */
export const words = (s: string): string => s.replace(/-/g, " ");
/** "manufacturer-rep" -> "Manufacturer rep" (select options, CSV). */
export const sentence = (s: string): string => {
  const t = words(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const mailHref = (email: string): string => `mailto:${email}`;
/** "+62" / "-120" (true minus sign) / "0". */
export const signedDays = (n: number): string => (n > 0 ? `+${fmtNumber(n)}` : n < 0 ? `−${fmtNumber(-n)}` : "0");
export const fmtHours = (h: number | null): string => (h == null ? "—" : `${fmtNumber(h, 1)} h`);
/** "in 75 days" / "12 days ago" / "today". */
export function relDays(days: number): string {
  if (days === 0) return "today";
  return days > 0 ? `in ${plural(days, "day")}` : `${plural(-days, "day")} ago`;
}
/** Contract-window state only (accreditation uses permitStatus). Typed as PermitStatus so the tone comes from permitTone in @/lib/status. */
export const expiryState = (days: number, within: number): PermitStatus => (days < 0 ? "expired" : days <= within ? "due" : "valid");

/** Same wording as the warranty tabs: bands are exclusive ("30d" is 0 to 30 days left, "90d" is 31 to 90). */
export const BAND_LABEL: Record<WarrantyBand, string> = {
  expired: "Expired", "30d": "≤ 30 d", "90d": "≤ 90 d", "365d": "≤ 365 d", active: "Active", none: "None",
};

const HOUR_MS = 3_600_000;
const byTag = (a: Asset, b: Asset) => a.tag.localeCompare(b.tag);
const latestFirst = (a: WorkOrder, b: WorkOrder) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt);

// --- Response time ---------------------------------------------------------------------------------------------------------------

/** Hours from reportedAt to the first timeline event whose status is assigned or in-progress; null when the order never got one. */
export function responseHours(wo: WorkOrder): number | null {
  const start = Date.parse(wo.reportedAt);
  const firsts = wo.timeline
    .filter((e) => e.status === "assigned" || e.status === "in-progress")
    .map((e) => Date.parse(e.at))
    .filter((t) => Number.isFinite(t) && t >= start);
  return firsts.length === 0 || !Number.isFinite(start) ? null : (Math.min(...firsts) - start) / HOUR_MS;
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// --- Vendors ---------------------------------------------------------------------------------------------------------------------

export type AssetRole = "Service" | "Installer" | "Service + installer";

/** A vendor serves an asset by servicing it, by having installed it (and so holding its warranty), or both. */
export function roleOf(a: Asset, vendorId: Id): AssetRole | null {
  const service = a.serviceVendorId === vendorId;
  const installer = a.installerVendorId === vendorId;
  return service && installer ? "Service + installer" : service ? "Service" : installer ? "Installer" : null;
}

export interface VendorRow {
  vendor: Vendor;
  disciplines: Discipline[];
  primary: Contact | undefined;
  /** Assets the vendor services or installed, limited to the tower when one is given. */
  served: Asset[];
  openWos: number;
  contractDays: number | undefined;
  /** Contract started and not yet ended. */
  contractActive: boolean;
  accreditationDays: number | undefined;
}

/**
 * One row per vendor, by name. With a tower, only vendors that serve an asset there or hold a work order there stay,
 * and the counts are that tower's.
 */
export function vendorRows(db: Db, towerId?: Id | null, today: ISODate = todayISO()): VendorRow[] {
  const assets = Object.values(db.assets);
  const orders = Object.values(db.workOrders);
  const open = openWorkOrders(db, towerId ? { towerId } : {});
  const rows: VendorRow[] = [];
  for (const vendor of Object.values(db.vendors)) {
    const served = assets.filter((a) => roleOf(a, vendor.id) !== null && (!towerId || a.towerId === towerId));
    if (towerId && served.length === 0 && !orders.some((w) => w.vendorId === vendor.id && w.towerId === towerId)) continue;
    const c = vendor.contract;
    const contractDays = c ? daysUntil(c.end, today) : undefined;
    rows.push({
      vendor,
      disciplines: vendor.disciplineIds.map((id) => db.disciplines[id]).filter(Boolean),
      primary: vendor.contacts[0],
      served,
      openWos: open.filter((w) => w.vendorId === vendor.id).length,
      contractDays,
      contractActive: !!c && daysUntil(c.start, today) <= 0 && (contractDays ?? -1) >= 0,
      accreditationDays: vendor.accreditationExpiry ? daysUntil(vendor.accreditationExpiry, today) : undefined,
    });
  }
  return rows.sort((a, b) => a.vendor.name.localeCompare(b.vendor.name));
}

export interface ServedRow {
  asset: Asset;
  role: AssetRole;
  typeName: string;
  tower: Tower | undefined;
  brandName: string;
  modelNo: string;
  band: WarrantyBand;
}
export interface WoRow { wo: WorkOrder; tower: Tower | undefined; assetTag: string; response: number | null; overdue: boolean }
export interface PlanRow { plan: PMPlan; assetTag: string; tower: Tower | undefined; state: DueStatus }

export interface VendorDetail {
  vendor: Vendor;
  disciplines: Discipline[];
  brands: Brand[];
  served: ServedRow[];
  plans: PlanRow[];
  orders: WoRow[];
  openCount: number;
  /** Median of the orders that have a response time; null when none do. */
  medianResponse: number | null;
  timedCount: number;
  warranties: WarrantyRow[];
}

export function vendorDetail(db: Db, vendorId: Id, today: ISODate = todayISO()): VendorDetail | undefined {
  // Own-property guard: "constructor" / "toString" would otherwise resolve to an inherited function and crash the render.
  const vendor = Object.hasOwn(db.vendors, vendorId) ? db.vendors[vendorId] : undefined;
  if (!vendor) return undefined;
  const bands = new Map<Id, WarrantyBand>(Object.values(db.warranties).map((w): [Id, WarrantyBand] => [w.assetId, warrantyBand(w.end, today)]));
  const tagOf = (id?: Id) => (id ? (db.assets[id]?.tag ?? id) : "");

  const served = Object.values(db.assets)
    .filter((a) => roleOf(a, vendorId) !== null)
    .sort(byTag)
    .map((asset): ServedRow => {
      const model = db.models[asset.modelId];
      return {
        asset, role: roleOf(asset, vendorId) ?? "Service", typeName: db.equipmentTypes[asset.equipmentTypeId]?.name ?? asset.equipmentTypeId,
        tower: db.towers[asset.towerId], brandName: model ? (db.brands[model.brandId]?.name ?? model.brandId) : "", modelNo: model?.modelNo ?? "",
        band: bands.get(asset.id) ?? "none",
      };
    });

  const plans = Object.values(db.pmPlans)
    .filter((p) => p.vendorId === vendorId)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
    .map((plan): PlanRow => ({
      plan, assetTag: tagOf(plan.assetId), tower: db.towers[db.assets[plan.assetId]?.towerId ?? ""], state: dueStatus(plan.nextDue, today),
    }));

  const orders = Object.values(db.workOrders)
    .filter((w) => w.vendorId === vendorId)
    .sort(latestFirst)
    .map((wo): WoRow => ({ wo, tower: db.towers[wo.towerId], assetTag: tagOf(wo.assetId), response: responseHours(wo), overdue: isOverdueWo(wo) }));
  const timed = orders.flatMap((o) => (o.response === null ? [] : [o.response]));

  return {
    vendor,
    disciplines: vendor.disciplineIds.map((id) => db.disciplines[id]).filter(Boolean),
    brands: vendor.brandIds.map((id) => db.brands[id]).filter(Boolean),
    served, plans, orders,
    openCount: openWorkOrders(db, { vendorId }).length,
    medianResponse: median(timed),
    timedCount: timed.length,
    warranties: warrantyRows(db, today).filter((r) => r.warranty.vendorId === vendorId),
  };
}

// --- Warranties ------------------------------------------------------------------------------------------------------------------

export interface WarrantyRow {
  warranty: Warranty;
  asset: Asset;
  band: WarrantyBand;
  /** Calendar days from today to the end date, negative once expired. */
  days: number;
  typeName: string;
  tower: Tower | undefined;
  brand: Brand | undefined;
  model: Model | undefined;
  vendor: Vendor | undefined;
  doc: Document | undefined;
  /** Open work orders on the asset that were reported while the warranty ran. */
  openWos: number;
}

const inCover = (wo: WorkOrder, w: Warranty): boolean => {
  const day = wo.reportedAt.slice(0, 10);
  return day >= w.start && day <= w.end;
};

/** One row per warranty, soonest end first (expired ones lead), ties by asset tag. */
export function warrantyRows(db: Db, today: ISODate = todayISO()): WarrantyRow[] {
  const openByAsset = new Map<Id, WorkOrder[]>();
  for (const wo of openWorkOrders(db)) if (wo.assetId) openByAsset.set(wo.assetId, [...(openByAsset.get(wo.assetId) ?? []), wo]);
  const rows: WarrantyRow[] = [];
  for (const warranty of Object.values(db.warranties)) {
    const asset = db.assets[warranty.assetId];
    if (!asset) continue;
    const model = db.models[asset.modelId];
    rows.push({
      warranty, asset, band: warrantyBand(warranty.end, today), days: daysUntil(warranty.end, today),
      typeName: db.equipmentTypes[asset.equipmentTypeId]?.name ?? asset.equipmentTypeId,
      tower: db.towers[asset.towerId], brand: model ? db.brands[model.brandId] : undefined, model,
      vendor: db.vendors[warranty.vendorId], doc: warranty.docId ? db.documents[warranty.docId] : undefined,
      openWos: (openByAsset.get(asset.id) ?? []).filter((wo) => inCover(wo, warranty)).length,
    });
  }
  return rows.sort((a, b) => a.days - b.days || byTag(a.asset, b.asset));
}

export const warrantyHaystack = (r: WarrantyRow): string =>
  [r.asset.tag, r.asset.serial, r.typeName, r.brand?.name, r.model?.modelNo, r.vendor?.name, r.warranty.coverage, r.tower?.name].join(" ").toLowerCase();

export interface ClaimData {
  row: WarrantyRow;
  /** "Tower · floor · room". */
  where: string;
  /** Every work order on the asset, newest first, with whether it was reported while the warranty ran. */
  orders: { wo: WorkOrder; inCover: boolean }[];
}

export function claimData(db: Db, warrantyId: Id, today: ISODate = todayISO()): ClaimData | undefined {
  const row = warrantyRows(db, today).find((r) => r.warranty.id === warrantyId);
  if (!row) return undefined;
  const floor = db.floors[row.asset.floorId];
  const space = db.spaces[row.asset.spaceId];
  return {
    row,
    where: [row.tower?.name, floor?.label, space?.name].filter(Boolean).join(" · "),
    orders: Object.values(db.workOrders)
      .filter((w) => w.assetId === row.asset.id)
      .sort(latestFirst)
      .map((wo) => ({ wo, inCover: inCover(wo, row.warranty) })),
  };
}

/** `/warranties` with the current query, `claim` set or (id null) dropped. Opening a sheet keeps band, tower and search so Back returns to the same list. */
export function claimHref(params: URLSearchParams, id: Id | null): string {
  const next = new URLSearchParams(params);
  if (id) next.set("claim", id);
  else next.delete("claim");
  const qs = next.toString();
  return qs ? `${paths.warranties()}?${qs}` : paths.warranties();
}
