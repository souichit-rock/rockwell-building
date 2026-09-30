import {
  asBuiltCoverage, attentionItems, brandImpact, complianceFor, dueStatus, finishDeviations, finishesFor, governingSheet, isOverdueWo, openWorkOrders,
  permitStatus, pinsForFloor, portfolioKpis, recordGaps, towerHealth, warrantyBand,
} from "@/data/selectors";
import type { ComplianceStatus, Db, WarrantyBand } from "@/data/types";
import { todayISO } from "@/lib/dates";

/** Demo storyline checks (spec sections 2 and 6.1): every status appears and every named id exists. Throws with the full list; returns report lines. */
export function verifyStoryline(db: Db, today = todayISO()): string[] {
  const problems: string[] = [];
  const report: string[] = [];
  const expect = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };
  const count = <T,>(rows: T[], f: (r: T) => boolean) => rows.filter(f).length;

  // Named ids the demo, the tour and the smoke URLs rely on
  const named: [keyof Db, string][] = [
    ["towers", "eds"], ["towers", "prl"], ["towers", "grb"], ["towers", "8rw"],
    ["floors", "eds-b3"], ["floors", "eds-gf"], ["floors", "eds-l12"], ["floors", "eds-rd"], ["spaces", "eds-b3-fpr"],
    ["assets", "eds-b3-fp-01"], ["assets", "eds-b3-gen-01"], ["assets", "eds-b3-gen-02"], ["assets", "prl-b4-fp-01"], ["assets", "8rw-b5-tx-01"],
    ["assets", "grb-rd-el-01"], ["assets", "8rw-rd-ct-01"], ["assets", "eds-gf-fdas-01"], ["assets", "grb-b2-fp-01"], ["assets", "grb-b2-fpd-01"],
    ["assets", "prl-rd-vrf-01"], ["assets", "prl-rd-vrf-02"], ["assets", "prl-rd-vrf-03"],
    ["documents", "doc-eds-e-ab"], ["documents", "doc-eds-e-ab-r0"], ["documents", "doc-grb-elv-ab"], ["documents", "doc-8rw-p-ab"], ["documents", "doc-eds-fp-ab"],
    ["permits", "permit-eds-fsic"], ["pmPlans", "pm-eds-b3-fp-01-1"], ["waivers", "waiver-1"], ["waivers", "waiver-2"],
    ["standards", "rds-fp-01"], ["standards", "rds-me-01"], ["brands", "kestrel-pumps"], ["brands", "tanaka-air"],
    ["workOrders", "wo-1"], ["workOrders", "wo-25"], ["teamMembers", "tm-11"],
  ];
  for (const [c, id] of named) expect(Object.prototype.hasOwnProperty.call(db[c], id), `missing ${c}:${id}`);
  expect(db.workOrders["wo-1"]?.number === "WO-2026-0101" && db.workOrders["wo-25"]?.number === "WO-2026-0125", "work-order numbers must run WO-2026-0101..0125");

  // Warranty bands
  const bandCount: Record<WarrantyBand, number> = { expired: 0, "30d": 0, "90d": 0, "365d": 0, active: 0, none: 0 };
  for (const w of Object.values(db.warranties)) bandCount[warrantyBand(w.end, today)]++;
  for (const b of ["expired", "30d", "90d", "365d", "active"] as const) expect(bandCount[b] > 0, `no warranty in band ${b}`);
  expect(bandCount.none === 0, "every asset must have a warranty");
  expect(bandCount.expired >= 12 && bandCount.expired <= 20, `expired warranties ${bandCount.expired}, expected about 15`);
  expect(bandCount["30d"] + bandCount["90d"] === 12, `warranties within 90 days ${bandCount["30d"] + bandCount["90d"]}, expected 12`);
  expect(bandCount["365d"] === 10, `warranties within a year ${bandCount["365d"]}, expected 10`);
  report.push(`warranty bands   ${JSON.stringify(bandCount)}`);

  // PM and permits
  const plans = Object.values(db.pmPlans);
  const pm = { overdue: count(plans, (p) => dueStatus(p.nextDue, today) === "overdue"), due: count(plans, (p) => dueStatus(p.nextDue, today) === "due") };
  expect(pm.overdue === 6 && pm.due === 10, `PM overdue/due ${pm.overdue}/${pm.due}, expected 6/10`);
  expect(count(plans, (p) => p.regulatory) > 0, "no regulatory plans");
  const permits = Object.values(db.permits);
  const pr = { expired: count(permits, (p) => permitStatus(p.expiryDate, today) === "expired"), due: count(permits, (p) => permitStatus(p.expiryDate, today) === "due") };
  expect(pr.expired === 2 && pr.due === 4, `permits expired/due ${pr.expired}/${pr.due}, expected 2/4`);
  report.push(`pm plans         ${plans.length} (overdue ${pm.overdue}, due <=14d ${pm.due}); permits expired ${pr.expired}, due ${pr.due}`);

  // Work orders
  const wos = Object.values(db.workOrders);
  const by = (s: string) => count(wos, (w) => w.status === s);
  expect(by("open") + by("assigned") === 10 && by("in-progress") === 4 && by("on-hold") === 2 && by("done") === 8 && by("cancelled") === 1, "work-order status mix must be 10 open/assigned, 4 in progress, 2 on hold, 8 done, 1 cancelled");
  const open = openWorkOrders(db);
  expect(count(open, (w) => w.priority === "P1") === 2 && count(open, (w) => w.priority === "P2") === 3, "open work orders must include exactly 2 P1 and 3 P2");
  expect(count(open, (w) => isOverdueWo(w)) === 3, "exactly 3 open work orders must be past due");
  expect(db.workOrders["wo-1"]?.title === "Genset 2 failed to start on monthly test" && db.workOrders["wo-2"]?.title === "Fire pump churn pressure low", "P1 titles differ from the spec");
  const preventive = count(wos, (w) => w.kind === "preventive" || (w.kind === "inspection" && !!w.planId));
  expect(preventive >= 13 && count(wos, (w) => w.kind === "corrective") >= 8, "work-order kind mix should be about 60 % preventive, 40 % corrective");
  report.push(`work orders      open ${open.length} (P1 ${count(open, (w) => w.priority === "P1")}, P2 ${count(open, (w) => w.priority === "P2")}, past due ${count(open, (w) => isOverdueWo(w))}); preventive ${preventive}`);

  // Compliance
  const statuses: Record<ComplianceStatus, number> = { compliant: 0, "phase-out": 0, deviation: 0, waived: 0, "no-standard": 0 };
  for (const a of Object.values(db.assets)) statuses[complianceFor(db, a, today).status]++;
  for (const s of Object.keys(statuses) as ComplianceStatus[]) expect(statuses[s] > 0, `no asset with compliance ${s}`);
  const st = (id: string) => complianceFor(db, db.assets[id], today).status;
  expect(st("grb-b2-fp-01") === "waived" && st("grb-b2-fpd-01") === "deviation", "GRB fire pumps: electric waived, diesel deviation");
  expect(st("prl-rd-vrf-01") === "waived" && st("prl-rd-vrf-02") === "phase-out" && st("prl-rd-vrf-03") === "phase-out", "PRL VRF: one waived, two phase-out");
  expect(st("eds-b3-fp-01") === "compliant", "EDS-B3-FP-01 must be compliant (Halcyon, preferred)");
  const kestrel = brandImpact(db, "kestrel-pumps");
  expect(kestrel.assets === 2 && kestrel.towerIds.join() === "grb", `Kestrel impact ${JSON.stringify(kestrel)}`);
  report.push(`compliance       ${JSON.stringify(statuses)}`);

  // As-built coverage, stale sheets, gaps
  const cov = { current: 0, superseded: 0, missing: 0 };
  for (const t of Object.values(db.towers)) for (const c of asBuiltCoverage(db, t.id)) cov[c.status]++;
  for (const k of Object.keys(cov) as (keyof typeof cov)[]) expect(cov[k] > 0, `no as-built coverage cell with status ${k}`);
  expect(asBuiltCoverage(db, "grb").some((c) => c.disciplineId === "ELV" && c.status === "missing"), "GRB ELV coverage must read missing");
  expect(asBuiltCoverage(db, "8rw").some((c) => c.floorId === "8rw-rd" && c.disciplineId === "PLUMB" && c.status === "missing"), "8RW roof PLUMB coverage must read missing");
  const stale = Object.values(db.assets).filter((a) => governingSheet(db, a.id)?.stale).map((a) => a.id);
  expect(stale.length === 8, `stale-sheet assets ${stale.length}, expected 8 (2 per tower)`);
  expect(db.documents["doc-eds-e-ab-r0"]?.supersededById === "doc-eds-e-ab", "EDS-E-AB-R0 must be superseded by EDS-E-AB");
  expect(count(Object.values(db.documents), (d) => d.status === "superseded") === 4, "expected 4 superseded as-builts");
  expect(count(Object.values(db.documents), (d) => d.status === "for-review") === 3, "expected 3 for-review documents");
  const gaps = recordGaps(db);
  for (const k of ["missing-asbuilt", "no-om", "stale-sheet"] as const) expect(gaps.some((g) => g.kind === k), `no record gap of kind ${k}`);
  report.push(`as-built cells   ${JSON.stringify(cov)}; stale-sheet assets ${stale.length}; record gaps ${gaps.length}`);

  // Health, KPIs, attention
  const health = Object.values(db.towers).map((t) => ({ id: t.id, ...towerHealth(db, t.id, today) }));
  for (const band of ["Good", "Watch", "Action"] as const) expect(health.some((h) => h.band === band), `no tower in health band ${band}`);
  report.push(`tower health     ${health.map((h) => `${h.id} ${h.score} ${h.band}`).join(", ")}`);
  const kpis = portfolioKpis(db, today);
  report.push(`kpis             ${JSON.stringify(kpis)}`);
  const attention = attentionItems(db, undefined, today);
  const kinds = new Set(attention.map((a) => a.kind));
  for (const k of ["wo-p1", "wo-p2", "pm-overdue", "permit", "warranty-30d", "inspection-fail"] as const) expect(kinds.has(k), `no attention item of kind ${k}`);
  report.push(`attention items  ${attention.length}`);

  // Inspections
  const failed = Object.values(db.inspections).filter((i) => i.result === "fail");
  expect(failed.length === 6 && count(failed, (i) => !!i.workOrderId) === 4, "expected 6 failed inspections, 4 linked to work orders");
  expect(failed.every((i) => i.workOrderId === undefined || openWorkOrders(db).some((w) => w.id === i.workOrderId)), "WO-linked fails must point at open work orders");

  // Finishes
  const dev = finishDeviations(db);
  expect(dev.length === 3, `finish deviations ${dev.length}, expected 3`);
  expect(finishesFor(db, "lobby", "eds").some((r) => r.surface === "floor" && r.deviates), "EDS lobby floor must deviate");
  expect(finishesFor(db, "unit", "prl").some((r) => r.surface === "door" && r.override && !r.deviates), "PRL unit door override must be identical");

  // Plans
  for (const f of Object.values(db.floors)) {
    if (f.id === "eds-b3") expect(pinsForFloor(db, f.id).length >= 15, "EDS B3 should show a full plant-room pin set");
  }
  const eds = pinsForFloor(db, "eds-b3", ["FIRE"]);
  expect(eds.length > 0 && eds.some((p) => p.assetId === "eds-b3-fp-01" && p.label === "FP-01"), "FIRE layer of EDS B3 must show FP-01");

  if (problems.length > 0) throw new Error(`verifyStoryline found ${problems.length} problem(s):\n - ${problems.join("\n - ")}`);
  return report;
}
