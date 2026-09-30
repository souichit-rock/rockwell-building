import type { ApprovalTier, BrandApproval, DisciplineCode, Standard } from "@/data/types";
import { slug } from "./rng";

// id = slug(code), e.g. "rds-fp-01". Every standard is portfolio-wide (appliesToTowerIds: []) and owned by Design & Technical.
const a = (brandId: string, tier: ApprovalTier, note?: string): BrandApproval => ({ brandId, tier, ...(note ? { note } : {}) });
const s = (
  code: string, title: string, disciplineId: DisciplineCode, equipmentTypeIds: string[], revision: string, effectiveDate: string,
  clauses: string[], approvals: BrandApproval[],
): Standard => ({
  id: slug(code), code, title, disciplineId, equipmentTypeIds, clauses, approvals,
  appliesToTowerIds: [], revision, effectiveDate, ownerTeam: "Design & Technical",
});

export const STANDARDS: Standard[] = [
  s("RDS-EL-01", "Generator sets & transfer switches", "ELEC", ["gen", "dt", "ats"], "R2", "2023-03-01", [
    "Generator sets shall be diesel, 60 Hz, rated for standby duty with at least 24 hours of fuel autonomy at full load.",
    "Automatic transfer shall use a closed-transition transfer switch with a mechanical interlock; transfer to genset supply shall complete within 10 seconds.",
    "Each genset room shall carry a day tank with low-level and high-level alarms and a bunded connection to the main tank.",
    "Exhaust and acoustic design shall meet the DENR-EMB permit conditions; an ECC is required before the set is operated.",
  ], [a("norvik-power", "preferred"), a("meridian-switchgear", "preferred", "Transfer switches"), a("halden-diesel", "acceptable", "Fuel systems and day tanks")]),
  s("RDS-EL-02", "Transformers & LV switchgear", "ELEC", ["tx", "lvs", "dp"], "R2", "2022-09-15", [
    "Transformers shall be oil-immersed ONAN with Dyn11 vector group; winding temperature and Buchholz trips shall be wired to the BMS.",
    "LV main switchboards shall be Form 4b and fault-rated for the prospective level with 20 % spare capacity.",
    "Panelboards shall carry 20 % spare ways and a printed circuit directory.",
    "All switchgear shall be supplied with type-test certificates and thermography inspection windows.",
  ], [a("meridian-switchgear", "preferred"), a("orbis-electric", "acceptable")]),
  s("RDS-EL-03", "UPS & critical power", "ELEC", ["ups"], "R1", "2024-01-10", [
    "UPS shall be double-conversion online with N+1 redundancy for life-safety and BMS loads.",
    "Battery autonomy shall be at least 10 minutes at full load with temperature-compensated charging.",
    "The bypass shall allow maintenance without interrupting the load.",
  ], [a("voltara", "preferred"), a("orbis-electric", "acceptable")]),
  s("RDS-FP-01", "Fire pumps & controllers", "FIRE", ["fp", "fpd", "jp"], "R3", "2025-02-03", [
    "Fire pumps shall be listed to NFPA 20 with UL or FM approval.",
    "Each system shall comprise one electric duty pump, one diesel standby pump and one jockey pump.",
    "Churn and flow tests shall be witnessed at commissioning and repeated annually.",
    "Controllers shall be listed, with phase-failure and low-pressure alarms wired to the FDAS.",
    "Pump sets shall have a documented service history of at least 5 years in tropical high-rise duty.",
  ], [
    a("halcyon-fire-systems", "preferred"), a("vega-pumps", "acceptable", "Jockey pumps"),
    a("kestrel-pumps", "prohibited", "Repeated churn-pressure failures; no new installations."),
  ]),
  s("RDS-VT-01", "Passenger & service elevators", "VT", ["el", "els"], "R2", "2023-07-20", [
    "Passenger elevators shall be gearless traction with regenerative drives.",
    "Each tower shall have at least one service elevator sized for 2500 kg with protection pads.",
    "Firefighter elevator operation shall comply with the National Building Code of the Philippines.",
    "The elevator operating permit shall be renewed annually before expiry.",
  ], [a("norden-lifts", "preferred"), a("aurum-elevators", "acceptable")]),
  s("RDS-ME-01", "HVAC primary plant", "HVAC", ["chl", "ct", "vrf", "ahu"], "R2", "2024-05-06", [
    "Water-cooled chillers shall have variable-speed compressors and a full-load COP of at least 6.0.",
    "Refrigerants shall be R-134a, R410A or a lower-GWP alternative; R-22 is not permitted.",
    "Cooling towers shall include drift eliminators and automated water treatment.",
    "Air handling units shall use F7 filters or better with access for coil cleaning.",
  ], [
    a("boreal-chillers", "preferred"), a("kanto-climate", "preferred"),
    a("tanaka-air", "phase-out", "No new VRF orders; existing units run to end of life."),
  ]),
  s("RDS-PL-01", "Domestic water pumps & tanks", "PLUMB", ["tp", "bp", "cst", "ewt"], "R1", "2022-11-02", [
    "Domestic pumps shall be duty and standby with alternating start and dry-run protection.",
    "Storage tanks shall be stainless steel panel type with two compartments so one can be cleaned while the other stays in service.",
    "Cistern capacity shall cover one day of demand and roof tank capacity one hour.",
  ], [a("vega-pumps", "preferred"), a("aquila-sanitary", "acceptable", "Storage tanks")]),
  s("RDS-ELV-01", "Fire detection & alarm", "ELV", ["fdas", "pa"], "R2", "2023-10-12", [
    "Fire detection shall be addressable and listed to EN 54 or UL 864.",
    "The FDAS shall interface with elevators, pressurisation fans, fire pumps and access control.",
    "Voice evacuation zones shall follow fire compartments and reach at least 15 dB above ambient.",
    "Panels shall carry 24 hours of standby battery plus 30 minutes of alarm load.",
  ], [a("sentinel-detection", "preferred"), a("halcyon-fire-systems", "acceptable")]),
  s("RDS-ELV-02", "CCTV & access control", "ELV", ["nvr", "acs"], "R1", "2024-03-18", [
    "Cameras shall be IP and ONVIF-conformant, minimum 4 MP.",
    "Recording shall be retained for 30 days at full frame rate.",
    "Access controllers shall use an OSDP secure channel; Wiegand is accepted for legacy doors only.",
  ], [a("argus-vision", "preferred"), a("portis-access", "acceptable")]),
  s("RDS-ELV-03", "Building management system", "ELV", ["bms"], "R1", "2024-08-26", [
    "The BMS shall use BACnet/IP with Modbus gateways for legacy plant.",
    "Plant points shall be trended at 1-minute intervals with 2 years of retention.",
    "Servers shall be redundant with a daily configuration backup.",
  ], [a("cortex-controls", "preferred"), a("sentinel-detection", "acceptable", "Fire-system interface")]),
];
