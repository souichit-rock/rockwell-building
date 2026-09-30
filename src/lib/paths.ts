import type {
  AssetStatus, ComplianceStatus, Criticality, DisciplineCode, DocStatus, DocType, Id, InspectionResult, InspectionType,
  PermitType, TeamName, VendorKind, WarrantyBand, WOKind, WOPriority, WOStatus,
} from "@/data/types";

// URLSearchParams; undefined / null / "" / [] keys are dropped, arrays are comma-joined.
function qs(q?: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q ?? {})) {
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
const e = encodeURIComponent;

export const paths = {
  home: () => "/",

  towers: () => "/towers",
  tower: (id: Id) => `/towers/${e(id)}`,
  floor: (towerId: Id, floorId: Id, q?: { highlight?: `asset:${Id}` | `space:${Id}` | `doc:${Id}`; layer?: DisciplineCode[] }) =>
    `/towers/${e(towerId)}/floors/${e(floorId)}${qs(q)}`,
  space: (id: Id) => `/spaces/${e(id)}`,

  assets: (q?: {
    tower?: Id; discipline?: DisciplineCode; type?: Id; status?: AssetStatus; band?: WarrantyBand[]; crit?: Criticality;
    compliance?: ComplianceStatus; pm?: "overdue"; q?: string; brand?: Id; model?: Id; vendor?: Id;
    /** `om: "missing"` lists only assets with no O&M manual linked (dashboard record-gap link). */
    om?: "missing";
  }) => `/assets${qs(q)}`,
  asset: (id: Id, q?: { tab?: "overview" | "documents" | "maintenance" | "history" }) => `/assets/${e(id)}${qs(q)}`,
  qr: (tag: string) => `/a/${e(tag)}`,

  standards: () => "/standards",
  standard: (id: Id) => `/standards/${e(id)}`,
  finishes: (q?: { tower?: Id }) => `/finishes${qs(q)}`,
  compliance: () => "/compliance",

  catalogue: (q?: { discipline?: DisciplineCode; type?: Id; q?: string }) => `/catalogue${qs(q)}`,
  brand: (id: Id) => `/catalogue/brands/${e(id)}`,
  model: (id: Id) => `/catalogue/models/${e(id)}`,

  documents: (q?: { tower?: Id; discipline?: DisciplineCode; type?: DocType; status?: DocStatus; current?: 0 | 1; q?: string }) =>
    `/documents${qs(q)}`,
  document: (id: Id) => `/documents/${e(id)}`,
  permits: (q?: { tower?: Id; type?: PermitType }) => `/permits${qs(q)}`,

  workOrders: (q?: {
    view?: "board" | "list"; tower?: Id; status?: WOStatus; priority?: WOPriority; kind?: WOKind; assignee?: Id; vendor?: Id; assetId?: Id;
  }) => `/work-orders${qs(q)}`,
  newWorkOrder: (q?: { assetId?: Id; spaceId?: Id; towerId?: Id; title?: string }) => `/work-orders/new${qs(q)}`,
  workOrder: (id: Id) => `/work-orders/${e(id)}`,

  maintenance: (q?: {
    view?: "list" | "calendar"; month?: string; tower?: Id; discipline?: DisciplineCode; team?: TeamName; regulatory?: 1;
  }) => `/maintenance${qs(q)}`,
  plan: (id: Id) => `/maintenance/${e(id)}`,
  inspections: (q?: { tower?: Id; type?: InspectionType; result?: InspectionResult; assetId?: Id }) => `/inspections${qs(q)}`,
  newInspection: (q?: { assetId?: Id; planId?: Id }) => `/inspections/new${qs(q)}`,
  inspection: (id: Id) => `/inspections/${e(id)}`,

  warranties: (q?: { band?: WarrantyBand; tower?: Id }) => `/warranties${qs(q)}`,
  vendors: (q?: { kind?: VendorKind; discipline?: DisciplineCode; tower?: Id }) => `/vendors${qs(q)}`,
  vendor: (id: Id) => `/vendors/${e(id)}`,
};
