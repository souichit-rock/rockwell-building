import type {
  Asset, Brand, DisciplineCode, DocLink, DocRevision, DocStatus, DocType, Document, EquipmentType, Id, ISODate, Model, Permit,
  Tower, Warranty,
} from "@/data/types";
import { addDays, daysFromNow } from "@/lib/dates";
import { TOWER_CONFIG } from "./towers";
import { rint, slug, type Rng } from "./rng";

/** Id of the certificate document for a permit; generate.ts stamps it on `Permit.docId`. */
export const permitDocId = (p: Pick<Permit, "towerId" | "type">): Id => `doc-${p.towerId}-pc-${p.type}`;

export interface DocInput {
  rng: Rng;
  towers: Tower[];
  assets: Asset[];
  types: Record<Id, EquipmentType>;
  models: Record<Id, Model>;
  brands: Record<Id, Brand>;
  permits: Permit[];
  vendorNames: Record<Id, string>;
  /** The six newest warranties; each gets a certificate document. */
  newestWarranties: Warranty[];
}

const AS_BUILT_SETS: { disciplineId: DisciplineCode; code: string; name: string }[] = [
  { disciplineId: "ARCH", code: "A", name: "Architectural" },
  { disciplineId: "STRUCT", code: "S", name: "Structural" },
  { disciplineId: "ELEC", code: "E", name: "Electrical" },
  { disciplineId: "HVAC", code: "M", name: "Mechanical" },
  { disciplineId: "PLUMB", code: "P", name: "Plumbing" },
  { disciplineId: "FIRE", code: "FP", name: "Fire protection" },
  { disciplineId: "ELV", code: "ELV", name: "ELV" },
  { disciplineId: "VT", code: "VT", name: "Vertical transport" },
];
const REASONS = [
  "Updated for tenant alterations", "Revised after equipment replacement", "Corrected riser and panel schedules",
  "Re-issued with survey deviations incorporated",
];
const PERMIT_DISCIPLINE: Record<string, DisciplineCode> = {
  occupancy: "ARCH", fsic: "FIRE", electrical: "ELEC", mechanical: "HVAC", elevator: "VT", "genset-ecc": "ELEC", "water-discharge": "PLUMB", sanitary: "PLUMB",
};
const PERMIT_TITLE: Record<string, string> = {
  occupancy: "Certificate of occupancy", fsic: "Fire Safety Inspection Certificate", electrical: "Electrical operating permit",
  mechanical: "Mechanical operating permit", elevator: "Elevator operating permit", "genset-ecc": "Genset Environmental Compliance Certificate",
  "water-discharge": "Water discharge permit", sanitary: "Sanitary permit",
};

export function buildDocuments(inp: DocInput): { docs: Document[]; warrantyCerts: Record<Id, Id> } {
  const { rng, towers, assets, types, models, brands, permits, vendorNames } = inp;
  const docs: Document[] = [];
  const range = (lo: number, hi: number) => rint(rng, lo, hi);

  const add = (x: {
    id: Id; docNo: string; title: string; type: DocType; disciplineId: DisciplineCode; towerId?: Id; floorId?: Id;
    revisions: DocRevision[]; status?: DocStatus; supersededById?: Id; links: DocLink[]; size: [number, number]; pages: [number, number]; fileName?: string;
  }) => {
    const lastRev = x.revisions[x.revisions.length - 1].rev;
    docs.push({
      id: x.id, docNo: x.docNo, title: x.title, type: x.type, disciplineId: x.disciplineId,
      ...(x.towerId ? { towerId: x.towerId } : {}), ...(x.floorId ? { floorId: x.floorId } : {}),
      revisions: x.revisions, status: x.status ?? "current", ...(x.supersededById ? { supersededById: x.supersededById } : {}),
      links: x.links, fileName: x.fileName ?? `${x.docNo}-${lastRev}.pdf`, fileSizeKb: range(x.size[0], x.size[1]), pages: range(x.pages[0], x.pages[1]),
    });
  };
  const disc = (a: Asset) => types[a.equipmentTypeId].disciplineId;
  const link = (kind: DocLink["kind"], id: Id, relation: DocLink["relation"]): DocLink => ({ kind, id, relation });

  for (const t of towers) {
    const cfg = TOWER_CONFIG[t.id];
    const floorIds = {
      lowest: `${t.id}-b${t.floorsBelow}`, b1: `${t.id}-b1`, gf: `${t.id}-gf`, podium: cfg.podiumLevel ? `${t.id}-l${cfg.podiumLevel}` : undefined,
      roof: `${t.id}-rd`, sample: `${t.id}-l${cfg.sampleLevel}`,
    };
    const mine = assets.filter((a) => a.towerId === t.id);
    const tag = (suffix: string) => `${t.code}-${suffix}`;
    const tid = (suffix: string) => `doc-${t.id}-${suffix}`;

    // 1. As-built sets, one per discipline.
    for (const set of AS_BUILT_SETS) {
      const isElec = set.disciplineId === "ELEC";
      const revCount = isElec ? range(2, 3) : range(1, 3);
      const first = isElec ? addDays(`${t.turnoverYear}-06-30`, range(120, 400)) : `${t.turnoverYear}-06-30`;
      const revisions: DocRevision[] = [];
      let date: ISODate = first;
      for (let i = 0; i < revCount; i++) {
        if (i > 0) date = addDays(date, range(240, 720));
        const n = isElec ? i + 1 : i;
        revisions.push({
          rev: `R${n}`, date, issuedBy: n === 0 ? "MetroBuild General Contractors" : "Rockwell Design & Technical",
          reason: n === 0 ? "Issued as-built at turnover" : REASONS[(n + t.turnoverYear) % REASONS.length],
        });
      }
      // Floors governed: plant floors plus the sample floor. Deliberate holes keep the record-gap and coverage stories true.
      let govFloors = [floorIds.lowest, floorIds.b1, floorIds.gf, floorIds.podium, floorIds.roof, floorIds.sample].filter((x): x is string => !!x);
      let govAssets = mine.filter((a) => disc(a) === set.disciplineId);
      const omitted: Asset[] = [];
      if (isElec) {
        // The current ELEC sheet omits the roof (lightning protection) and the sample floor (panelboard); R0 keeps governing those two assets.
        govFloors = govFloors.filter((f) => f !== floorIds.roof && f !== floorIds.sample);
        for (const a of govAssets) if (a.floorId === floorIds.roof || a.floorId === floorIds.sample) omitted.push(a);
        govAssets = govAssets.filter((a) => !omitted.includes(a));
      }
      if (t.id === "8rw" && set.disciplineId === "PLUMB") {
        govFloors = govFloors.filter((f) => f !== floorIds.roof);
        govAssets = govAssets.filter((a) => a.floorId !== floorIds.roof);
      }
      const id = tid(`${set.code.toLowerCase()}-ab`);
      add({
        id, docNo: tag(`${set.code}-AB`), title: `${t.name} - ${set.name} as-built drawings`, type: "as-built", disciplineId: set.disciplineId, towerId: t.id,
        revisions, status: t.id === "grb" && set.disciplineId === "ELV" ? "for-review" : "current",
        links: [
          ...govFloors.map((f) => link("floor", f, "governs")),
          ...[...new Set(govAssets.map((a) => a.spaceId))].map((s) => link("space", s, "governs")),
          ...govAssets.map((a) => link("asset", a.id, "governs")),
        ],
        size: [1500, 14000], pages: [20, 120],
      });
      if (isElec) {
        add({
          id: tid("e-ab-r0"), docNo: tag("E-AB-R0"), title: `${t.name} - Electrical as-built drawings (R0 issue)`, type: "as-built", disciplineId: "ELEC", towerId: t.id,
          revisions: [{ rev: "R0", date: `${t.turnoverYear}-06-30`, issuedBy: "MetroBuild General Contractors", reason: "Issued as-built at turnover" }],
          status: "superseded", supersededById: id,
          links: [
            ...[...new Set(omitted.map((a) => a.spaceId))].map((s) => link("space", s, "governs")),
            ...omitted.map((a) => link("asset", a.id, "governs")),
          ],
          size: [1500, 9000], pages: [20, 90], fileName: `${tag("E-AB-R0")}.pdf`,
        });
      }
    }

    // 2. O&M manuals: gensets, fire pumps, elevators, HVAC plant.
    const om: { suffix: string; title: string; disciplineId: DisciplineCode; typeIds: string[]; standard: string }[] = [
      { suffix: "OM-GEN", title: "Generator sets", disciplineId: "ELEC", typeIds: ["gen"], standard: "rds-el-01" },
      { suffix: "OM-FP", title: "Fire pumps", disciplineId: "FIRE", typeIds: ["fp", "fpd", "jp"], standard: "rds-fp-01" },
      { suffix: "OM-EL", title: "Elevators", disciplineId: "VT", typeIds: ["el", "els"], standard: "rds-vt-01" },
      { suffix: "OM-HVAC", title: "HVAC plant", disciplineId: "HVAC", typeIds: t.use === "office" ? ["chl", "ct", "cwp", "ahu"] : ["vrf", "ahu"], standard: "rds-me-01" },
    ];
    for (const m of om) {
      const refs = mine.filter((a) => m.typeIds.includes(a.equipmentTypeId));
      const modelIds = [...new Set(refs.map((a) => a.modelId))];
      const date = `${t.turnoverYear}-08-15`;
      const revisions: DocRevision[] = [{ rev: "R0", date, issuedBy: "MetroBuild General Contractors", reason: "Issued at turnover" }];
      if (range(0, 1)) revisions.push({ rev: "R1", date: addDays(date, range(400, 1200)), issuedBy: "Rockwell Design & Technical", reason: "Added replacement-part lists" });
      add({
        id: tid(m.suffix.toLowerCase()), docNo: tag(m.suffix), title: `${t.name} - O&M manual, ${m.title}`, type: "om-manual", disciplineId: m.disciplineId, towerId: t.id,
        revisions, links: [...refs.map((a) => link("asset", a.id, "references")), ...modelIds.map((id) => link("model", id, "references")), link("standard", m.standard, "references")],
        size: [2000, 9000], pages: [60, 120],
      });
    }

    // 3. T&C reports.
    const tc: { suffix: string; title: string; disciplineId: DisciplineCode; typeIds: string[]; standard: string; vendor: Id }[] = [
      { suffix: "TC-GEN", title: "Genset load-bank test report", disciplineId: "ELEC", typeIds: ["gen"], standard: "rds-el-01", vendor: "norvik-power-philippines" },
      { suffix: "TC-FP", title: "Fire pump flow test report", disciplineId: "FIRE", typeIds: ["fp", "fpd"], standard: "rds-fp-01", vendor: "halcyon-fire-philippines" },
    ];
    for (const c of tc) {
      const refs = mine.filter((a) => c.typeIds.includes(a.equipmentTypeId));
      add({
        id: tid(c.suffix.toLowerCase()), docNo: tag(c.suffix), title: `${t.name} - ${c.title}`, type: "tc-report", disciplineId: c.disciplineId, towerId: t.id,
        revisions: [{ rev: "R0", date: addDays(refs[0].commissionDate, 7), issuedBy: vendorNames[c.vendor], reason: "Testing and commissioning at handover" }],
        links: [...refs.map((a) => link("asset", a.id, "certifies")), link("standard", c.standard, "references")],
        size: [400, 2500], pages: [6, 30],
      });
    }

    // 4. Shop drawings awaiting review (two portfolio-wide).
    if (t.id === "eds") {
      add({
        id: tid("sd-hvac-01"), docNo: tag("SD-HVAC-01"), title: `${t.name} - Roof condenser deck re-layout, shop drawing`, type: "shop-drawing", disciplineId: "HVAC", towerId: t.id, floorId: floorIds.roof,
        revisions: [{ rev: "R0", date: daysFromNow(-35), issuedBy: "ChillTech Mechanical", reason: "Issued for design review" }],
        status: "for-review", links: [link("floor", floorIds.roof, "references")], size: [3000, 9000], pages: [12, 40],
      });
    }
    if (t.id === "prl") {
      add({
        id: tid("sd-elv-01"), docNo: tag("SD-ELV-01"), title: `${t.name} - Ground floor CCTV relocation, shop drawing`, type: "shop-drawing", disciplineId: "ELV", towerId: t.id, floorId: floorIds.gf,
        revisions: [{ rev: "R0", date: daysFromNow(-21), issuedBy: "Sentinel Systems Integrators", reason: "Issued for design review" }],
        status: "for-review", links: [link("floor", floorIds.gf, "references")], size: [3000, 9000], pages: [12, 40],
      });
    }
  }

  // 5. Permit certificates (one per permit).
  for (const p of permits) {
    const t = towers.find((x) => x.id === p.towerId);
    if (!t) continue;
    add({
      id: permitDocId(p), docNo: `${t.code}-PC-${p.type.toUpperCase()}`, title: `${t.name} - ${PERMIT_TITLE[p.type]}`, type: "permit", disciplineId: PERMIT_DISCIPLINE[p.type], towerId: t.id,
      revisions: [{ rev: "R0", date: p.issuedDate, issuedBy: p.issuer, reason: "Permit issued" }],
      links: [link("permit", p.id, "certifies")], size: [180, 400], pages: [2, 3],
    });
  }

  // 6. Warranty certificates for the newest six warranties.
  const warrantyCerts: Record<Id, Id> = {};
  const perTower: Record<Id, number> = {};
  for (const w of inp.newestWarranties) {
    const a = assets.find((x) => x.id === w.assetId);
    if (!a) continue;
    const t = towers.find((x) => x.id === a.towerId);
    if (!t) continue;
    const n = (perTower[t.id] = (perTower[t.id] ?? 0) + 1);
    const id = `doc-${t.id}-wc-${n}`;
    warrantyCerts[a.id] = id;
    add({
      id, docNo: `${t.code}-WC-${String(n).padStart(2, "0")}`, title: `${a.tag} - Warranty certificate`, type: "warranty-cert", disciplineId: disc(a), towerId: t.id,
      revisions: [{ rev: "R0", date: w.start, issuedBy: vendorNames[w.vendorId] ?? "Vendor", reason: "Warranty certificate issued" }],
      links: [link("asset", a.id, "certifies")], size: [200, 600], pages: [2, 6],
    });
  }

  // 7. Datasheets linked to models.
  for (const modelId of ["np-1250s", "hf-750e", "nl-2000", "bc-1200w", "kc-vr-28", "cc-bms-x3"]) {
    const m = models[modelId];
    const brand = brands[m.brandId];
    add({
      id: `doc-ds-${slug(m.modelNo)}`, docNo: `DS-${m.modelNo}`, title: `${brand.name} ${m.modelNo} - Product datasheet`, type: "datasheet",
      disciplineId: types[m.equipmentTypeId].disciplineId,
      revisions: [
        { rev: "R0", date: "2023-02-10", issuedBy: brand.name, reason: "First release" },
        { rev: "R1", date: "2024-06-05", issuedBy: brand.name, reason: "Updated ratings table" },
      ],
      links: [link("model", m.id, "references")], size: [180, 900], pages: [2, 8],
    });
  }

  return { docs, warrantyCerts };
}
