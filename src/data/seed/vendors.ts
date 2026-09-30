import type { Contact, Contract, DisciplineCode, Vendor, VendorKind } from "@/data/types";
import { daysFromNow } from "@/lib/dates";
import { slug } from "./rng";

// id = slug(name), e.g. "norvik-power-philippines". Contract and accreditation dates are offsets from today so the demo never goes stale.
const c = (name: string, role: string, phone: string, email: string): Contact => ({ name, role, phone, email });
const contract = (ref: string, startOffset: number, endOffset: number, slaResponseHours: number, scope: string): Contract =>
  ({ ref, start: daysFromNow(startOffset), end: daysFromNow(endOffset), slaResponseHours, scope });
const v = (
  name: string, kind: VendorKind, disciplineIds: DisciplineCode[], brandIds: string[], contacts: Contact[],
  extra: { contract?: Contract; accreditationOffset?: number } = {},
): Vendor => ({
  id: slug(name), name, kind, disciplineIds, brandIds, contacts,
  ...(extra.contract ? { contract: extra.contract } : {}),
  ...(extra.accreditationOffset !== undefined ? { accreditationExpiry: daysFromNow(extra.accreditationOffset) } : {}),
});

export const VENDORS: Vendor[] = [
  v("Norvik Power Philippines", "manufacturer-rep", ["ELEC"], ["norvik-power"], [
    c("Benedict Alcantara", "Service manager", "+63 917 720 3101", "service@norvik-ph.example.test"),
    c("Rowena Pascual", "Parts desk", "+63 917 720 3102", "parts@norvik-ph.example.test"),
  ], { contract: contract("RCS-2025-011", -320, 410, 4, "Genset preventive maintenance and 24-hour breakdown response"), accreditationOffset: 240 }),
  v("PowerLine Electrical Services", "contractor", ["ELEC"], ["meridian-switchgear", "orbis-electric", "voltara"], [
    c("Gilbert Rivera", "Operations head", "+63 917 720 3201", "ops@powerline.example.test"),
    c("Nenita Sarmiento", "Duty engineer", "+63 917 720 3202", "duty@powerline.example.test"),
  ], { contract: contract("RCS-2025-014", -200, 165, 8, "HV and LV switchgear, transformer and UPS maintenance"), accreditationOffset: 180 }),
  v("Halcyon Fire Philippines", "manufacturer-rep", ["FIRE"], ["halcyon-fire-systems"], [
    c("Teresita Lopez", "Account manager", "+63 917 720 3301", "accounts@halcyon-ph.example.test"),
  ], { accreditationOffset: 200 }),
  v("SafeGuard Fire Services", "service-provider", ["FIRE"], ["halcyon-fire-systems", "kestrel-pumps", "vega-pumps"], [
    c("Edgardo Valdez", "Service lead", "+63 917 720 3401", "service@safeguard.example.test"),
    c("Marites Domingo", "Compliance officer", "+63 917 720 3402", "compliance@safeguard.example.test"),
    c("Alvin Castillo", "Dispatcher", "+63 917 720 3403", "dispatch@safeguard.example.test"),
  ], { contract: contract("RCS-2024-032", -540, 220, 2, "Fire pump, FDAS and sprinkler maintenance with FSIC support"), accreditationOffset: 18 }),
  v("Norden Lifts Manila", "manufacturer-rep", ["VT"], ["norden-lifts"], [
    c("Ferdinand Robles", "Service manager", "+63 917 720 3501", "service@norden-manila.example.test"),
    c("Grace Andrada", "Customer care", "+63 917 720 3502", "care@norden-manila.example.test"),
  ], { contract: contract("RCS-2025-021", -300, 75, 2, "Full-maintenance elevator contract with entrapment response"), accreditationOffset: 310 }),
  v("Kanto Climate PH", "manufacturer-rep", ["HVAC"], ["kanto-climate", "tanaka-air"], [
    c("Rommel Estrada", "Technical sales", "+63 917 720 3601", "sales@kanto-ph.example.test"),
  ], { accreditationOffset: 260 }),
  v("ChillTech Mechanical", "service-provider", ["HVAC"], ["boreal-chillers", "kanto-climate", "tanaka-air"], [
    c("Lorna Magsaysay", "Service coordinator", "+63 917 720 3701", "service@chilltech.example.test"),
    c("Dennis Pineda", "Chiller specialist", "+63 917 720 3702", "chillers@chilltech.example.test"),
  ], { contract: contract("RCS-2025-018", -150, 215, 12, "Chiller, cooling tower and AHU maintenance"), accreditationOffset: 130 }),
  v("AquaFlow Pumps & Tanks", "supplier", ["PLUMB"], ["vega-pumps", "aquila-sanitary"], [
    c("Josephine Ilagan", "Sales engineer", "+63 917 720 3801", "sales@aquaflow.example.test"),
    c("Raul Buenaventura", "Service technician", "+63 917 720 3802", "service@aquaflow.example.test"),
  ], { contract: contract("RCS-2025-026", -90, 275, 24, "Domestic pump and tank servicing"), accreditationOffset: 300 }),
  v("Sentinel Systems Integrators", "contractor", ["ELV"], ["sentinel-detection", "argus-vision", "portis-access"], [
    c("Vanessa Cruz", "Project manager", "+63 917 720 3901", "projects@sentinel-si.example.test"),
    c("Arnel Mercado", "Support engineer", "+63 917 720 3902", "support@sentinel-si.example.test"),
  ], { accreditationOffset: 150 }),
  v("Cortex BMS Services", "service-provider", ["ELV", "HVAC"], ["cortex-controls"], [
    c("Ivan Salvador", "BMS engineer", "+63 917 720 4001", "bms@cortex-services.example.test"),
  ], { contract: contract("RCS-2025-030", -60, 305, 8, "BMS monitoring, backups and controller support") }),
  v("Terra Interiors Supply", "supplier", ["ARCH"], ["terra-stone", "lumen-lighting", "cedar-co-doors", "harbor-hardware", "solis-paints"], [
    c("Camille Navarro", "Account executive", "+63 917 720 4101", "orders@terra-interiors.example.test"),
  ]),
  v("MetroBuild General Contractors", "contractor", ["ARCH", "STRUCT"], ["skyreach-bmu"], [
    c("Rodrigo Ferrer", "Project director", "+63 917 720 4201", "projects@metrobuild.example.test"),
    c("Anna Liza Gomez", "Document controller", "+63 917 720 4202", "documents@metrobuild.example.test"),
  ], { accreditationOffset: 52 }),
];
