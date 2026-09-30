// Route smoke list (spec §9): one concrete URL per route in the §3 table, using the deterministic seed ids, plus the list filters, the
// three plan highlight kinds and one bad-id case per detail route. Plain string literals on purpose, so the orchestrator, a grep and
// scripts/gate.mjs (which checks every feature route is covered) can all read them without executing anything.
// Every list carries ?tower=grb so the tower filter path is exercised, not only the unfiltered default.

/** Routes that must render fully from the seed (no console errors). */
const FOUND = [
  // overview
  "/",
  "/towers",
  "/towers/eds",

  // floor plans and spaces
  "/towers/eds/floors/eds-b3",
  "/towers/eds/floors/eds-b3?highlight=asset:eds-b3-fp-01&layer=FIRE",
  "/towers/eds/floors/eds-l12?highlight=space:eds-l12-u01",
  "/towers/eds/floors/eds-b3?highlight=doc:doc-eds-fp-ab",
  "/spaces/eds-b3-fpr",

  // assets
  "/assets?tower=grb",
  "/assets?brand=kestrel-pumps",
  "/assets/eds-b3-fp-01",
  "/assets/eds-b3-fp-01?tab=documents",
  "/assets/eds-b3-fp-01?tab=maintenance",
  "/assets/eds-b3-fp-01?tab=history",
  "/a/EDS-B3-FP-01",

  // standards, finishes, compliance
  "/standards",
  "/standards/rds-fp-01",
  "/finishes?tower=grb",
  "/compliance",

  // catalogue
  "/catalogue",
  "/catalogue/brands/kestrel-pumps",
  "/catalogue/models/hf-750e",

  // documents and permits
  "/documents?tower=grb",
  "/documents/doc-eds-e-ab",
  "/permits?tower=grb",

  // work orders
  "/work-orders?tower=grb",
  "/work-orders?view=list&tower=grb",
  "/work-orders/new?assetId=eds-b3-fp-01",
  "/work-orders/wo-1",

  // maintenance and inspections
  "/maintenance?tower=grb",
  "/maintenance?view=calendar&tower=grb",
  "/maintenance/pm-eds-b3-fp-01-1",
  "/inspections?tower=grb",
  "/inspections/new?assetId=eds-b3-fp-01&planId=pm-eds-b3-fp-01-1",
  "/inspections/insp-1",

  // warranties and vendors
  "/warranties?tower=grb",
  "/warranties?band=30d",
  "/vendors?tower=grb",
  "/vendors/halcyon-fire-philippines",
];

/** One bad id per detail route, plus an unknown path: each must show the "Not found" card, not crash. */
export const SMOKE_NOT_FOUND = [
  "/nowhere/at/all",
  "/towers/zzz",
  "/towers/eds/floors/zzz",
  "/spaces/zzz",
  "/assets/zzz",
  "/a/ZZZ-00-XX-00",
  "/standards/zzz",
  "/catalogue/brands/zzz",
  "/catalogue/models/zzz",
  "/documents/zzz",
  "/work-orders/zzz",
  "/maintenance/zzz",
  "/inspections/zzz",
  "/vendors/zzz",
];

export const SMOKE_URLS: string[] = [...FOUND, ...SMOKE_NOT_FOUND];
