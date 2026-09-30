// Dashboard-only derived values (spec 6.1). Every number here comes from a foundation selector; this file only groups, sorts and words them.
import {
  PERMIT_DUE_DAYS, PM_DUE_DAYS, asBuiltCoverage, attentionItems, brandImpact, openWorkOrders, permitStatus, portfolioKpis, recordGaps, towerHealth,
} from "@/data/selectors";
import type { AttentionItem, Db, DisciplineCode, HealthScore, Id, ISODate, PortfolioKpis, RecordGap, RecordGapKind, Tower } from "@/data/types";
import { addDays, daysUntil, fmtDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";

export interface TowerCard { tower: Tower; health: HealthScore; openWos: number; permitsDue: number; docs: number }
export interface AttentionGroup { tower: Tower; health: HealthScore; items: AttentionItem[] }
export interface GapRow { gap: RecordGap; tower: Tower; missing: string[] }
export interface GapSection { kind: RecordGapKind; rows: GapRow[] }
export interface StripDay { date: ISODate; day: number; count: number; label: string }
export interface TourStep { title: string; caption: string; to: string }

export interface DashboardData {
  kpis: PortfolioKpis;
  warranties30: number;
  cards: TowerCard[];
  groups: AttentionGroup[];
  attentionCount: number;
  gaps: GapSection[];
  strip: StripDay[];
  tour: TourStep[];
}

const GAP_ORDER: RecordGapKind[] = ["missing-asbuilt", "no-om", "stale-sheet"];
const weekday = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

// The selectors word a subtitle as "<Tower> · rest"; under a tower heading the prefix is noise.
const stripTower = (subtitle: string, name: string) => (subtitle.startsWith(`${name} · `) ? subtitle.slice(name.length + 3) : subtitle);

function towerCards(db: Db, today: ISODate): TowerCard[] {
  const permits = Object.values(db.permits);
  const docs = Object.values(db.documents);
  return Object.values(db.towers).map((tower) => ({
    tower,
    health: towerHealth(db, tower.id, today),
    openWos: openWorkOrders(db, { towerId: tower.id }).length,
    // due within PERMIT_DUE_DAYS or already expired: both need a renewal action
    permitsDue: permits.filter((p) => p.towerId === tower.id && permitStatus(p.expiryDate, today) !== "valid").length,
    docs: docs.filter((d) => d.towerId === tower.id && d.status === "current").length,
  }));
}

/** Towers with something to act on, worst health first; items keep the selector's severity order. */
function attentionGroups(items: AttentionItem[], cards: TowerCard[]): AttentionGroup[] {
  return cards
    .map(({ tower, health }) => ({
      tower,
      health,
      items: items.filter((i) => i.towerId === tower.id).map((i) => ({ ...i, subtitle: stripTower(i.subtitle, tower.name) })),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.health.score - b.health.score);
}

/** "Mechanical / HVAC: B2, GF" for every discipline that has a floor without a current as-built (cells come from asBuiltCoverage). */
function missingByDiscipline(db: Db, towerId: Id): string[] {
  const by = new Map<DisciplineCode, string[]>();
  for (const c of asBuiltCoverage(db, towerId)) {
    if (c.status === "missing") by.set(c.disciplineId, [...(by.get(c.disciplineId) ?? []), db.floors[c.floorId]?.label ?? c.floorId]);
  }
  return [...by].map(([id, floors]) => `${db.disciplines[id]?.name ?? id}: ${floors.join(", ")}`);
}

function gapSections(db: Db, towerId?: Id): GapSection[] {
  const gaps = recordGaps(db, towerId);
  return GAP_ORDER.map((kind) => ({
    kind,
    rows: gaps.flatMap((gap): GapRow[] => {
      const tower = db.towers[gap.towerId];
      return gap.kind === kind && tower ? [{ gap, tower, missing: kind === "missing-asbuilt" ? missingByDiscipline(db, tower.id) : [] }] : [];
    }),
  })).filter((s) => s.rows.length > 0);
}

/** Plans due today through PM_DUE_DAYS ahead (15 bars), the same window portfolioKpis counts as "due", so the bars add up to the KPI. */
function pmStrip(db: Db, today: ISODate): StripDay[] {
  const counts = new Map<ISODate, number>();
  for (const p of Object.values(db.pmPlans)) {
    const d = daysUntil(p.nextDue, today);
    if (d >= 0 && d <= PM_DUE_DAYS) counts.set(p.nextDue, (counts.get(p.nextDue) ?? 0) + 1);
  }
  return Array.from({ length: PM_DUE_DAYS + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, day: Number(date.slice(8)), count: counts.get(date) ?? 0, label: `${weekday.format(new Date(`${date}T00:00:00Z`))}, ${fmtDate(date)}` };
  });
}

/** The ten-minute tour, in the order of spec 6.1. Ids are the deterministic seed ids; captions quote live numbers where they carry one. */
function tourSteps(db: Db, kpis: PortfolioKpis): TourStep[] {
  const impact = brandImpact(db, "kestrel-pumps");
  const standard = db.standards["rds-fp-01"];
  const prohibited = standard?.approvals.find((a) => a.brandId === "kestrel-pumps")?.tier === "prohibited";
  const where = impact.towerIds.map((id) => db.towers[id]?.name ?? id).join(", ");
  const doc = db.documents["doc-eds-e-ab"];
  const rev = doc?.revisions[doc.revisions.length - 1]?.rev;
  const predecessor = Object.values(db.documents).find((d) => d.supersededById === "doc-eds-e-ab");
  const task = db.pmPlans["pm-eds-b3-fp-01-1"]?.task.toLowerCase() ?? "PM visit";
  return [
    { title: "Portfolio dashboard", caption: "You are here: health by tower, what needs attention and where the records have gaps.", to: paths.home() },
    { title: "Edades Suites tower", caption: "Facts, floor stack, systems summary and the as-built coverage matrix for one building.", to: paths.tower("eds") },
    {
      title: "B3 plan, FIRE layer",
      caption: "The basement fire pump room on the schematic plan, filtered to the fire protection layer with the pump highlighted.",
      to: paths.floor("eds", "eds-b3", { highlight: "asset:eds-b3-fp-01", layer: ["FIRE"] }),
    },
    { title: "Asset passport EDS-B3-FP-01", caption: "Location, brand, model, serial, warranty and compliance for the electric fire pump.", to: paths.asset("eds-b3-fp-01") },
    { title: "Log a visit", caption: `Record the ${task} against its PM plan; readings and result join the asset history.`, to: paths.newInspection({ assetId: "eds-b3-fp-01", planId: "pm-eds-b3-fp-01-1" }) },
    { title: "Raise a work order", caption: "A corrective order prefilled from the asset, with its tower and location already set.", to: paths.newWorkOrder({ assetId: "eds-b3-fp-01" }) },
    { title: "Work order board", caption: "Open, Assigned, In progress, On hold and Done across the portfolio; the new order lands in Open.", to: paths.workOrders({ view: "board" }) },
    { title: "Compliance matrix", caption: "Every tower against every design standard, with waivers and deviations counted.", to: paths.compliance() },
    {
      title: "Kestrel Pumps brand page",
      caption: prohibited
        ? `Prohibited under ${standard?.code ?? "RDS-FP-01"}, yet ${plural(impact.assets, "asset")} still run on it (${where}). The impact panel shows the exposure.`
        : "Where the brand is installed, which towers run it and what it touches.",
      to: paths.brand("kestrel-pumps"),
    },
    {
      title: "Permits and compliance",
      caption: `${kpis.permitsExpired} expired and ${kpis.permitsDue} expiring within ${PERMIT_DUE_DAYS} days, each tied to its certificate.`,
      to: paths.permits(),
    },
    {
      title: "Revision timeline",
      caption: `${doc?.docNo ?? "EDS-E-AB"} is current at ${rev ?? "its latest revision"}${predecessor ? `, superseding ${predecessor.docNo}` : ""}; the timeline shows every issue.`,
      to: paths.document("doc-eds-e-ab"),
    },
  ];
}

/** `towerId` scopes the two lists (attention, gaps); KPIs, tower cards and the PM strip stay portfolio-wide. */
export function dashboardData(db: Db, today: ISODate, towerId?: Id): DashboardData {
  const kpis = portfolioKpis(db, today);
  const cards = towerCards(db, today);
  const all = attentionItems(db, undefined, today);
  const groups = attentionGroups(towerId ? attentionItems(db, towerId, today) : all, cards);
  return {
    kpis,
    warranties30: all.filter((i) => i.kind === "warranty-30d").length,
    cards,
    groups,
    attentionCount: groups.reduce((n, g) => n + g.items.length, 0),
    gaps: gapSections(db, towerId),
    strip: pmStrip(db, today),
    tour: tourSteps(db, kpis),
  };
}
