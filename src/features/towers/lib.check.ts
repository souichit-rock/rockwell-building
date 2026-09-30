// Self-check for lib.ts against the seed storyline. Run from the project root:
//   npx esbuild src/features/towers/lib.check.ts --bundle --platform=node --format=esm --alias:@=./src --define:import.meta.env.DEV=false | node --input-type=module
import { SEED as db } from "@/data/seed";
import { asBuiltCoverage, assetsIn, openWorkOrders, towerHealth } from "@/data/selectors";
import {
  assetCountsByFloor, cellKey, contactsFor, coverageModel, floorsOf, keyDocuments, permitExpiry, permitsOf, systemsSummary, telHref,
} from "./lib";

const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(`towers/lib check failed: ${msg}`);
};

for (const t of Object.values(db.towers)) {
  const floors = floorsOf(db, t.id);
  ok(floors.length === Object.values(db.floors).filter((f) => f.towerId === t.id).length, `${t.id}: stack lists every level`);
  ok(floors.every((f, i) => i === 0 || floors[i - 1].level > f.level), `${t.id}: levels strictly descend, roof first`);
  ok(floors[0].label === "RD", `${t.id}: the stack starts at the roof deck`);

  const total = assetsIn(db, { towerId: t.id }).length;
  ok([...assetCountsByFloor(db, t.id).values()].reduce((a, b) => a + b, 0) === total, `${t.id}: floor counts add up to the asset count`);

  const h = towerHealth(db, t.id);
  const s = systemsSummary(db, t.id);
  ok(s.rows.reduce((n, r) => n + r.assets, 0) === total, `${t.id}: systems assets add up`);
  ok(s.rows.reduce((n, r) => n + r.overduePm, 0) === h.overduePm, `${t.id}: systems overdue PM matches towerHealth`);
  ok(s.rows.reduce((n, r) => n + r.openWos, 0) + s.unlinkedOpenWos === openWorkOrders(db, { towerId: t.id }).length, `${t.id}: open WOs all accounted for`);

  const list = asBuiltCoverage(db, t.id);
  const cov = coverageModel(db, t.id);
  ok(cov.total === list.length && cov.cells.size === list.length, `${t.id}: matrix has exactly the selector's cells`);
  ok(list.every((c) => cov.cells.get(cellKey(c.floorId, c.disciplineId))?.status === c.status), `${t.id}: cell status comes from asBuiltCoverage`);

  ok(keyDocuments(db, t.id).every((d) => d.type === "as-built" && d.status === "current" && d.towerId === t.id), `${t.id}: key documents are current as-builts`);
  ok(contactsFor(db, t).every((m) => m.towerIds.includes(t.id) && m.id !== t.propertyManagerId), `${t.id}: contacts come from towerIds`);
  const dates = permitsOf(db, t.id).map((p) => p.expiryDate);
  ok(dates.every((d, i) => i === 0 || dates[i - 1] <= d), `${t.id}: permits sorted by expiry`);
}

// storyline
const grb = towerHealth(db, "grb");
ok(grb.score === 27 && grb.band === "Action" && grb.overduePm === 6, "GRB is 27 Action with 6 overdue PM");
ok(keyDocuments(db, "eds").some((d) => d.id === "doc-eds-e-ab") && !keyDocuments(db, "eds").some((d) => d.id === "doc-eds-e-ab-r0"), "EDS key documents skip the superseded predecessor");
const occupancy = permitsOf(db, "eds").find((p) => p.type === "occupancy");
ok(!!occupancy && permitExpiry(occupancy).date === "No expiry", "occupancy permit reads No expiry");
ok(telHref("+63 917 810 2201") === "tel:+639178102201", "telHref strips spaces");

console.log("towers/lib check passed");
