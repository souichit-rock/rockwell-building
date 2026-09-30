import type { Brand, DisciplineCode } from "@/data/types";
import { slug } from "./rng";

// Fictional brands: invented so the demo cannot be read as Rockwell's real approved-vendor list. Real names are a one-file swap.
// id = slug(name), e.g. "kestrel-pumps".
const b = (name: string, country: string, disciplineIds: DisciplineCode[], note?: string): Brand =>
  ({ id: slug(name), name, country, disciplineIds, ...(note ? { note } : {}) });

export const BRANDS: Brand[] = [
  b("Norvik Power", "Sweden", ["ELEC"], "Diesel generator sets, 500 to 2500 kVA."),
  b("Halden Diesel", "Germany", ["ELEC"], "Fuel systems and day tanks."),
  b("Meridian Switchgear", "Japan", ["ELEC"], "LV switchboards and transfer switches."),
  b("Orbis Electric", "South Korea", ["ELEC"], "Transformers, panelboards and lightning protection."),
  b("Voltara", "Taiwan", ["ELEC"], "Three-phase UPS systems."),
  b("Boreal Chillers", "United States", ["HVAC"], "Water-cooled chillers and cooling towers."),
  b("Kanto Climate", "Japan", ["HVAC"], "VRF systems and air handling units."),
  b("Tanaka Air", "Japan", ["HVAC", "PLUMB"], "VRF, fan coils, fans and blowers. Under phase-out review for VRF."),
  b("Vega Pumps", "Spain", ["PLUMB", "HVAC", "FIRE"], "Centrifugal pumps for water, HVAC and fire duty."),
  b("Kestrel Pumps", "Italy", ["FIRE", "PLUMB"], "Fire pump sets. Prohibited for fire pumps under RDS-FP-01."),
  b("Halcyon Fire Systems", "United States", ["FIRE"], "Fire pumps, alarm valves and clean-agent systems."),
  b("Sentinel Detection", "United Kingdom", ["ELV", "FIRE"], "Addressable fire detection and voice evacuation."),
  b("Argus Vision", "Taiwan", ["ELV"], "CCTV cameras and recorders."),
  b("Portis Access", "Singapore", ["ELV", "ARCH"], "Access control, recorders and parking barriers."),
  b("Cortex Controls", "Switzerland", ["ELV", "HVAC"], "Building management systems."),
  b("Norden Lifts", "Finland", ["VT"], "Passenger and service elevators."),
  b("Aurum Elevators", "Japan", ["VT"], "Passenger elevators."),
  b("Skyreach BMU", "Australia", ["VT"], "Building maintenance units and gondolas."),
  b("Terra Stone", "Italy", ["ARCH"], "Natural stone, porcelain and facade systems."),
  b("Lumen Lighting", "Philippines", ["ARCH"], "Architectural and utility luminaires."),
  b("Cedar & Co Doors", "Philippines", ["ARCH"], "Timber and fire-rated doors."),
  b("Harbor Hardware", "Germany", ["ARCH"], "Door hardware and closers."),
  b("Solis Paints", "Philippines", ["ARCH"], "Paints and waterproofing coatings."),
  b("Aquila Sanitary", "Japan", ["PLUMB", "ARCH"], "Sanitary ware, water heaters and storage tanks."),
  b("Marlin Aquatics", "Australia", ["ARCH", "PLUMB"], "Pool filtration and circulation equipment."),
];
