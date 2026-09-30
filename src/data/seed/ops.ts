import type {
  Asset, Id, InspectionLog, InspectionResult, InspectionType, ISODate, ISODateTime, PMPlan, Reading, TeamMember, Vendor, WOEvent, WOKind,
  WOPriority, WorkOrder, WOStatus,
} from "@/data/types";
import { PRIORITY_TARGET_HOURS } from "@/data/selectors";
import { daysFromNow } from "@/lib/dates";
import type { Rng } from "./rng";

const H = 3_600_000;
/** Manila wall-clock ISO date-time (+08:00, no DST) for an epoch in ms. */
export const manilaIso = (ms: number): ISODateTime => `${new Date(ms + 8 * H).toISOString().slice(0, 19)}+08:00`;

/** Building engineer per tower, in the order tm-5..tm-8 of team.ts. */
const ENGINEER: Record<Id, Id> = { eds: "tm-5", prl: "tm-6", grb: "tm-7", "8rw": "tm-8" };

interface Lookups {
  assets: Record<Id, Asset>;
  plans: Record<Id, PMPlan>;
  team: Record<Id, TeamMember>;
  vendors: Record<Id, Vendor>;
}
const who = (l: Lookups, id: string): string => l.team[id]?.name ?? l.vendors[id]?.name ?? id;

// ---------------------------------------------------------------------------------------------------------------------------------
// Work orders. Numbers WO-2026-0101..0125 (id wo-1..wo-25). Times are relative to the moment the seed is built.
// Storyline: 10 open/assigned (2 P1, 3 P2), 4 in progress, 2 on hold, 8 done, 1 cancelled; exactly 3 non-final orders are past due (wo-1, wo-3, wo-6).
// ---------------------------------------------------------------------------------------------------------------------------------
type Ev = [agoHours: number, by: string, note: string, status?: WOStatus];
interface WoSpec {
  title: string; description: string; assetId: Id; kind: WOKind; priority: WOPriority; status: WOStatus; reporter: Id; assignee?: Id; vendor?: Id;
  planned?: boolean; ago: number; dueIn?: number; doneAgo?: number; events?: Ev[];
}

const WO_SPECS: WoSpec[] = [
  { title: "Genset 2 failed to start on monthly test", description: "Genset 2 did not crank on the monthly auto-start test at the FCC panel. Standby genset 1 carried the test load. Starter and battery bank to be checked.", assetId: "eds-b3-gen-02", kind: "corrective", priority: "P1", status: "assigned", reporter: "tm-5", assignee: "tm-9", vendor: "norvik-power-philippines", ago: 5, events: [[4.5, "tm-5", "Assigned to the FM technician; vendor call-out requested.", "assigned"], [4, "norvik-power-philippines", "Technician dispatched, ETA 2 hours."]] },
  { title: "Fire pump churn pressure low", description: "Monthly churn test read 111 psi against the 125 psi minimum. Impeller wear-ring inspection requested from the service vendor.", assetId: "prl-b4-fp-01", kind: "corrective", priority: "P1", status: "assigned", reporter: "tm-6", assignee: "tm-10", vendor: "safeguard-fire-services", ago: 0.5, events: [[0.3, "tm-6", "Diesel standby pump verified available; electric pump kept on duty.", "assigned"]] },
  { title: "Feeder breaker tripped on LV main switchboard", description: "Feeder breaker tripped under load and again after reset. Load moved to the alternate feeder while thermography findings are reviewed.", assetId: "grb-b2-lvs-01", kind: "corrective", priority: "P2", status: "open", reporter: "tm-7", ago: 20, events: [[19, "tm-7", "Breaker reset once and tripped again. Load transferred to the alternate feeder."]] },
  { title: "Elevator 3 entrapment, car out of service", description: "Passengers were released after a door-operator fault. Car isolated pending inspection by the elevator vendor.", assetId: "eds-rd-el-03", kind: "corrective", priority: "P2", status: "assigned", reporter: "tm-1", assignee: "tm-5", vendor: "norden-lifts-manila", ago: 3, events: [[2.8, "tm-1", "Passengers released; car isolated.", "assigned"]] },
  { title: "Transfer pump 2 vibration above alarm limit", description: "Vibration velocity above the alarm limit during the weekly round. Standby pump 1 running; pump 2 to be isolated for a bearing check.", assetId: "8rw-b5-tp-02", kind: "corrective", priority: "P2", status: "open", reporter: "tm-8", ago: 2, events: [[1.5, "tm-8", "Standby pump 1 running; pump 2 marked out of service."]] },
  { title: "Camera feed drops on lobby NVR", description: "Cameras 12 to 16 lose their feed for 2 to 5 minutes at random intervals. Suspected switch port or NVR disk issue.", assetId: "eds-gf-nvr-01", kind: "corrective", priority: "P3", status: "open", reporter: "tm-1", ago: 144, events: [[140, "tm-9", "Reproduced twice during rounds; logs exported."], [120, "tm-1", "Awaiting integrator visit; reminder sent."]] },
  { title: "Quarterly ATS transfer test", description: "Raised from the PM plan: simulate mains failure and time the transfer to genset.", assetId: "eds-b3-ats-01", kind: "preventive", priority: "P3", status: "open", reporter: "tm-5", planned: true, ago: 48 },
  { title: "Monthly diesel fire pump run test", description: "Raised from the PM plan: monthly run test of the diesel fire pump. The plan is overdue.", assetId: "grb-b2-fpd-01", kind: "preventive", priority: "P3", status: "assigned", reporter: "tm-7", assignee: "tm-10", vendor: "safeguard-fire-services", planned: true, ago: 24, events: [[23, "tm-7", "Assigned with the fire service vendor.", "assigned"]] },
  { title: "Monthly cooling tower inspection", description: "Raised from the PM plan: basin, fill media, drift eliminators and dosing check.", assetId: "8rw-rd-ct-02", kind: "preventive", priority: "P4", status: "open", reporter: "tm-8", planned: true, ago: 72 },
  { title: "Monthly service elevator inspection", description: "Raised from the PM plan: door, safety, machine room and levelling checks.", assetId: "grb-rd-els-01", kind: "preventive", priority: "P4", status: "open", reporter: "tm-3", planned: true, ago: 96 },
  { title: "Semi-annual cistern inspection and cleaning", description: "Raised from the PM plan. Inlet valve found leaking once the tank was drained.", assetId: "eds-b3-cst-01", kind: "preventive", priority: "P3", status: "in-progress", reporter: "tm-5", assignee: "tm-9", planned: true, ago: 30, events: [[29, "tm-5", "Assigned.", "assigned"], [26, "tm-9", "Tank drained; inlet valve leaking, gasket replacement in progress.", "in-progress"]] },
  { title: "Quarterly UPS and battery health check", description: "Raised from the PM plan: battery string voltage and temperature, self-test and alarm log.", assetId: "grb-b2-ups-01", kind: "preventive", priority: "P3", status: "in-progress", reporter: "tm-7", assignee: "tm-7", vendor: "powerline-electrical-services", planned: true, ago: 40, events: [[38, "tm-7", "Assigned to the electrical contractor.", "assigned"], [10, "powerline-electrical-services", "Battery string test started; two blocks below tolerance.", "in-progress"]] },
  { title: "Monthly passenger elevator inspection", description: "Raised from the PM plan: doors, alarm, intercom, machine room and ride quality.", assetId: "8rw-rd-el-01", kind: "preventive", priority: "P3", status: "in-progress", reporter: "tm-8", assignee: "tm-8", vendor: "norden-lifts-manila", planned: true, ago: 26, events: [[24, "tm-8", "Assigned.", "assigned"], [5, "norden-lifts-manila", "Inspection under way.", "in-progress"]] },
  { title: "Semi-annual VRF outdoor unit service", description: "Raised from the PM plan: coil cleaning, refrigerant pressures, fan motor and error history.", assetId: "prl-rd-vrf-02", kind: "preventive", priority: "P4", status: "in-progress", reporter: "tm-6", assignee: "tm-10", planned: true, ago: 120, events: [[110, "tm-6", "Assigned.", "assigned"], [30, "tm-10", "Coil cleaning done; refrigerant pressure check pending.", "in-progress"]] },
  { title: "Roof waterproofing re-coat near lightning mast", description: "Blistering measured over about 12 square metres near the mast base. Re-coat to be scheduled with the roofing contractor.", assetId: "prl-rd-wp-01", kind: "project", priority: "P3", status: "on-hold", reporter: "tm-2", ago: 240, dueIn: 480, events: [[230, "tm-2", "Quotation requested from the roofing contractor.", "assigned"], [200, "tm-2", "On hold until the dry-season window and the approved quotation.", "on-hold"]] },
  { title: "Quarterly stair pressurisation fan test", description: "Raised from the PM plan. The test needs a fire-alarm shutdown window.", assetId: "grb-rd-spf-01", kind: "preventive", priority: "P4", status: "on-hold", reporter: "tm-3", planned: true, ago: 168, dueIn: 720, events: [[160, "tm-3", "Waiting for a fire-alarm shutdown window with the FDAS vendor.", "on-hold"]] },
  { title: "Fire alarm panel battery trouble", description: "FDAS panel showed a battery trouble signal. Standby batteries replaced and load-tested.", assetId: "8rw-gf-fdas-01", kind: "corrective", priority: "P2", status: "done", reporter: "tm-8", assignee: "tm-9", vendor: "sentinel-systems-integrators", ago: 312, doneAgo: 288, events: [[300, "tm-8", "Assigned.", "assigned"], [292, "tm-9", "Standby batteries replaced and load-tested.", "in-progress"]] },
  { title: "Monthly genset no-load and on-load run test", description: "Raised from the PM plan: 30-minute run on load with readings logged.", assetId: "eds-b3-gen-01", kind: "preventive", priority: "P3", status: "done", reporter: "tm-5", assignee: "tm-9", planned: true, ago: 240, doneAgo: 216, events: [[230, "tm-5", "Assigned.", "assigned"], [220, "tm-9", "Run started.", "in-progress"]] },
  { title: "Semi-annual transformer inspection and thermography", description: "Raised from the PM plan: thermography of terminations and bushings, oil level and temperature checks.", assetId: "8rw-b5-tx-01", kind: "preventive", priority: "P3", status: "done", reporter: "tm-8", assignee: "tm-8", vendor: "powerline-electrical-services", planned: true, ago: 984, doneAgo: 960, events: [[980, "tm-8", "Assigned to the electrical contractor.", "assigned"], [965, "powerline-electrical-services", "Inspection under way.", "in-progress"]] },
  { title: "Passenger elevator stopped between floors", description: "Car stopped between floors with passengers inside. Released by the vendor; governor switch reset and safety chain checked.", assetId: "grb-rd-el-01", kind: "corrective", priority: "P1", status: "done", reporter: "tm-3", assignee: "tm-7", vendor: "norden-lifts-manila", ago: 504, doneAgo: 501, events: [[503.5, "tm-3", "Passengers released by the vendor.", "assigned"], [502, "norden-lifts-manila", "Safety chain checked and car returned to service.", "in-progress"]] },
  { title: "Monthly passenger elevator inspection", description: "Raised from the PM plan: doors, alarm, intercom, machine room and ride quality.", assetId: "eds-rd-el-02", kind: "preventive", priority: "P3", status: "done", reporter: "tm-5", vendor: "norden-lifts-manila", planned: true, ago: 456, doneAgo: 432, events: [[440, "norden-lifts-manila", "Inspection under way.", "in-progress"]] },
  { title: "Monthly STP blower check", description: "Raised from the PM plan: belt, oil level, filter and discharge pressure.", assetId: "prl-b4-stp-01", kind: "preventive", priority: "P4", status: "done", reporter: "tm-6", assignee: "tm-10", planned: true, ago: 360, doneAgo: 336, events: [[350, "tm-6", "Assigned.", "assigned"]] },
  { title: "Booster pump 1 mechanical seal leak", description: "Seal weeping on booster pump 1; standby pump took the duty. Seal replaced by the pump supplier.", assetId: "eds-b3-bp-01", kind: "corrective", priority: "P3", status: "done", reporter: "tm-5", assignee: "tm-9", vendor: "aquaflow-pumps-tanks", ago: 792, doneAgo: 744, events: [[780, "tm-5", "Assigned to the pump supplier.", "assigned"], [750, "aquaflow-pumps-tanks", "Seal replaced; leak test passed.", "in-progress"]] },
  { title: "Quarterly fire alarm test", description: "Raised from the PM plan: sample detector test, battery check and interface relay test.", assetId: "eds-gf-fdas-01", kind: "inspection", priority: "P3", status: "done", reporter: "tm-5", assignee: "tm-9", vendor: "sentinel-systems-integrators", planned: true, ago: 1224, doneAgo: 1200, events: [[1210, "tm-5", "Assigned.", "assigned"]] },
  { title: "Annual elevated water tank inspection and cleaning", description: "Raised from the PM plan.", assetId: "eds-rd-ewt-01", kind: "preventive", priority: "P4", status: "cancelled", reporter: "tm-5", planned: true, ago: 200, events: [[190, "tm-5", "Cancelled: rescheduled to next quarter with the tank cleaning contractor.", "cancelled"]] },
];

export function buildWorkOrders(l: Lookups): WorkOrder[] {
  const now = Date.now();
  return WO_SPECS.map((s, i): WorkOrder => {
    const n = i + 1;
    const asset = l.assets[s.assetId];
    if (!asset) throw new Error(`seed: work order ${n} references unknown asset ${s.assetId}`);
    const planId = s.planned ? `pm-${s.assetId}-1` : undefined;
    if (planId && !l.plans[planId]) throw new Error(`seed: work order ${n} references missing plan ${planId}`);
    const at = (agoHours: number) => manilaIso(now - agoHours * H);
    const reportedAt = at(s.ago);
    const dueAt = s.dueIn !== undefined ? manilaIso(now + s.dueIn * H) : manilaIso(now - s.ago * H + PRIORITY_TARGET_HOURS[s.priority] * H);
    const completedAt = s.doneAgo !== undefined ? at(s.doneAgo) : undefined;
    const timeline: WOEvent[] = [{ at: reportedAt, by: who(l, s.reporter), note: "Work order raised.", status: "open" }];
    for (const [ago, by, note, status] of s.events ?? []) timeline.push({ at: at(ago), by: who(l, by), note, ...(status ? { status } : {}) });
    if (completedAt) timeline.push({ at: completedAt, by: who(l, s.assignee ?? s.vendor ?? s.reporter), note: "Work completed and verified.", status: "done" });
    return {
      id: `wo-${n}`, number: `WO-2026-${String(100 + n).padStart(4, "0")}`, title: s.title, towerId: asset.towerId, assetId: s.assetId, spaceId: asset.spaceId,
      kind: s.kind, priority: s.priority, status: s.status, reportedById: s.reporter,
      ...(s.assignee ? { assignedToId: s.assignee } : {}), ...(s.vendor ? { vendorId: s.vendor } : {}), ...(planId ? { planId } : {}),
      reportedAt, dueAt, ...(completedAt ? { completedAt } : {}), description: s.description, timeline,
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Inspections: 12 monthly readings for 6 trend assets (72) plus 18 miscellaneous logs. 6 fails: wo-linked F1..F4, plus two older ones.
// ---------------------------------------------------------------------------------------------------------------------------------
const r1 = (x: number, d = 1) => Number(x.toFixed(d));
const DEFAULT_FINDING = "No abnormal findings. Readings recorded within limits.";

interface Trend {
  assetId: Id;
  /** Days between today and the latest monthly visit, so the six series do not all land on the same day. */
  stagger: number;
  readings: (k: number, noise: (amp: number) => number) => Reading[];
  /** k = months back (11 = oldest, 0 = latest). */
  outcome: (k: number) => { result: InspectionResult; findings: string; workOrderId?: Id };
}
const pass = (findings = DEFAULT_FINDING) => ({ result: "pass" as InspectionResult, findings });

const TRENDS: Trend[] = [
  {
    assetId: "eds-b3-gen-01", stagger: 4,
    readings: (k, n) => [
      { label: "Frequency", value: r1(60 + n(0.12), 2), unit: "Hz" },
      { label: "Output voltage", value: Math.round(400 + n(3)), unit: "V" },
      { label: "Oil pressure", value: r1(62 - (11 - k) * 0.5 + n(1)), unit: "psi" },
    ],
    outcome: (k) => (k === 6 ? { result: "pass-with-findings", findings: "Minor coolant weep at a hose clamp; clamp tightened." } : pass("Run completed on load for 30 minutes without alarms.")),
  },
  {
    assetId: "prl-b4-fp-01", stagger: 0,
    readings: (k, n) => [{ label: "Churn pressure", value: k === 0 ? 111.2 : k === 1 ? 121.4 : r1(129 - (11 - k) * 0.3 + n(0.8)), unit: "psi" }],
    outcome: (k) =>
      k === 0 ? { result: "fail", findings: "Churn pressure 111 psi against the 125 psi minimum. Pump kept on duty; wear-ring inspection requested.", workOrderId: "wo-2" }
        : k === 1 ? { result: "pass-with-findings", findings: "Churn pressure trending down; monitor next month." }
        : pass("Churn test passed; seal drip within limits."),
  },
  {
    assetId: "8rw-b5-tx-01", stagger: 8,
    readings: (k, n) => [{ label: "Winding temperature", value: r1(58 + (11 - k) * 0.7 + n(0.8)), unit: "°C" }],
    outcome: () => pass("Thermography clear; winding temperature within limits."),
  },
  {
    assetId: "grb-rd-el-01", stagger: 6,
    readings: (k, n) => [{ label: "Ride quality (vibration)", value: k === 2 ? 17.4 : k === 1 ? 13.2 : r1(11 + (11 - k) * 0.2 + n(0.5)), unit: "mg" }],
    outcome: (k) =>
      k === 2 ? { result: "fail", findings: "Vibration above the 15 mg limit. Guide shoes and rollers scheduled for replacement." }
        : k === 1 ? { result: "pass-with-findings", findings: "Re-check after guide-shoe replacement; slight residual vibration." }
        : pass("Ride quality within limits."),
  },
  {
    assetId: "8rw-rd-ct-01", stagger: 12,
    readings: (k, n) => [{ label: "Approach temperature", value: k === 2 ? 6.4 : k === 1 ? 4.7 : r1(4.2 + (11 - k) * 0.08 + n(0.15)), unit: "°C" }],
    outcome: (k) =>
      k === 2 ? { result: "fail", findings: "Fill media fouled; approach temperature above the 6 °C limit. Cleaning and dosing pump repair raised." }
        : k === 1 ? { result: "pass-with-findings", findings: "Approach temperature recovering after cleaning." }
        : pass("Basin and fill media clean; dosing normal."),
  },
  {
    assetId: "eds-gf-fdas-01", stagger: 2,
    readings: (k, n) => [{ label: "Battery voltage", value: k === 2 ? 26.4 : r1(27.2 + n(0.1)), unit: "V" }],
    outcome: (k) => (k === 2 ? { result: "pass-with-findings", findings: "Standby battery near end of life; replacement scheduled." } : pass("Panel healthy; no faults in the log.")),
  },
];

interface MiscSpec {
  assetId: Id; type: InspectionType; daysAgo: number; result: InspectionResult; findings: string; readings?: Reading[]; workOrderId?: Id; planned?: boolean;
}
const MISC: MiscSpec[] = [
  { assetId: "eds-b3-gen-02", type: "test", daysAgo: 0, result: "fail", findings: "Failed to crank on auto and manual start. Battery voltage low after three attempts.", readings: [{ label: "Battery voltage", value: 11.2, unit: "V" }, { label: "Start attempts", value: 3, unit: "count" }], workOrderId: "wo-1" },
  { assetId: "grb-b2-lvs-01", type: "test", daysAgo: 9, result: "fail", findings: "Thermography found a hot spot on the B-phase termination of the feeder breaker.", readings: [{ label: "Hot-spot temperature", value: 96, unit: "°C" }, { label: "Ambient temperature", value: 33, unit: "°C" }], workOrderId: "wo-3" },
  { assetId: "8rw-b5-tp-02", type: "test", daysAgo: 6, result: "fail", findings: "Vibration velocity above the alarm limit at the drive-end bearing.", readings: [{ label: "Vibration velocity", value: 7.9, unit: "mm/s" }], workOrderId: "wo-5" },
  { assetId: "eds-b3-fp-01", type: "regulatory", daysAgo: 30, result: "pass", findings: "FSIC pre-inspection walkthrough completed; documents and tags in order." },
  { assetId: "prl-gf-fdas-01", type: "regulatory", daysAgo: 45, result: "pass-with-findings", findings: "Two detector heads flagged for replacement before the FSIC visit." },
  { assetId: "grb-rd-el-02", type: "regulatory", daysAgo: 200, result: "pass", findings: "Annual safety gear and brake test passed." },
  { assetId: "8rw-rd-el-03", type: "regulatory", daysAgo: 150, result: "pass", findings: "Annual safety gear and brake test passed." },
  { assetId: "eds-b3-lvs-01", type: "condition-survey", daysAgo: 110, result: "pass", findings: "Busbars and breakers in good condition; no corrosion." },
  { assetId: "prl-rd-vrf-01", type: "condition-survey", daysAgo: 95, result: "pass-with-findings", findings: "Fan motor bearing noise; monitor. Unit is on a waiver under RDS-ME-01." },
  { assetId: "grb-b2-tx-01", type: "condition-survey", daysAgo: 130, result: "pass-with-findings", findings: "Oil level slightly low; top-up planned at the next PM." },
  { assetId: "eds-b3-ats-01", type: "test", daysAgo: 40, result: "pass", findings: "Quarterly transfer test passed.", readings: [{ label: "Transfer time", value: 7.2, unit: "s" }], planned: true },
  { assetId: "8rw-b5-ups-01", type: "test", daysAgo: 70, result: "pass", findings: "Battery discharge test passed.", readings: [{ label: "Runtime", value: 11.4, unit: "min" }], planned: true },
  { assetId: "prl-b4-gen-01", type: "test", daysAgo: 75, result: "pass", findings: "Load-bank test at 100 % for 2 hours passed.", readings: [{ label: "Load", value: 100, unit: "%" }, { label: "Duration", value: 2, unit: "h" }] },
  { assetId: "eds-rd-el-02", type: "pm-visit", daysAgo: 20, result: "pass", findings: "Monthly inspection completed.", planned: true },
  { assetId: "eds-b3-cst-01", type: "pm-visit", daysAgo: 1, result: "pass-with-findings", findings: "Inlet valve leaking once the tank was drained.", workOrderId: "wo-11", planned: true },
  { assetId: "8rw-gf-fdas-01", type: "pm-visit", daysAgo: 13, result: "pass-with-findings", findings: "Battery trouble cleared after battery replacement.", workOrderId: "wo-17", planned: true },
  { assetId: "grb-b2-fpd-01", type: "pm-visit", daysAgo: 34, result: "pass", findings: "Monthly diesel run test completed.", planned: true },
  { assetId: "grb-gf-fac-01", type: "condition-survey", daysAgo: 5, result: "pass-with-findings", findings: "Sealant cracking on the west elevation; monitor and reseal." },
];

export function buildInspections(l: Lookups, rng: Rng): InspectionLog[] {
  const out: InspectionLog[] = [];
  const noise = (amp: number) => (rng() - 0.5) * 2 * amp;
  const inspectorFor = (a: Asset) => l.team[ENGINEER[a.towerId]].name;
  const add = (x: Omit<InspectionLog, "id">) => out.push({ id: `insp-${out.length + 1}`, ...x });

  for (const s of MISC) {
    const a = l.assets[s.assetId];
    if (!a) throw new Error(`seed: inspection references unknown asset ${s.assetId}`);
    add({
      assetId: a.id, ...(s.planned ? { planId: `pm-${a.id}-1` } : {}), ...(s.workOrderId ? { workOrderId: s.workOrderId } : {}),
      date: daysFromNow(-s.daysAgo), type: s.type, inspector: inspectorFor(a), ...(a.serviceVendorId ? { vendorId: a.serviceVendorId } : {}),
      result: s.result, readings: s.readings ?? [], findings: s.findings,
    });
  }
  for (const t of TRENDS) {
    const a = l.assets[t.assetId];
    if (!a) throw new Error(`seed: trend references unknown asset ${t.assetId}`);
    for (let k = 11; k >= 0; k--) {
      const o = t.outcome(k);
      const date: ISODate = daysFromNow(-(k * 30 + t.stagger));
      add({
        assetId: a.id, planId: `pm-${a.id}-1`, ...(o.workOrderId ? { workOrderId: o.workOrderId } : {}), date, type: "pm-visit", inspector: inspectorFor(a),
        ...(a.serviceVendorId ? { vendorId: a.serviceVendorId } : {}), result: o.result, readings: t.readings(k, noise), findings: o.findings,
      });
    }
  }
  return out;
}
