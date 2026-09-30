import type { Model } from "@/data/types";
import { slug } from "./rng";

// id = slug(modelNo), e.g. "np-1250s". Fictional model numbers.
const m = (
  modelNo: string, brandId: string, equipmentTypeId: string, defaultWarrantyMonths: number, specs: Record<string, string>,
  successorModelId?: string,
): Model => ({
  id: slug(modelNo), brandId, equipmentTypeId, modelNo, specs, defaultWarrantyMonths,
  discontinued: successorModelId !== undefined, ...(successorModelId ? { successorModelId } : {}),
});

export const MODELS: Model[] = [
  // ELEC
  m("NP-1250S", "norvik-power", "gen", 24, { kVA: "1250", kW: "1000", Voltage: "400 V", Speed: "1800 rpm", Frequency: "60 Hz", Fuel: "Diesel" }),
  m("NP-1000S", "norvik-power", "gen", 24, { kVA: "1000", kW: "800", Voltage: "400 V", Speed: "1800 rpm", Frequency: "60 Hz" }, "np-1250s"),
  m("HD-DT-2000", "halden-diesel", "dt", 12, { Capacity: "2000 L", Fuel: "Diesel", Construction: "Double-wall steel", Alarm: "Low and high level" }),
  m("OE-TX-2500", "orbis-electric", "tx", 24, { kVA: "2500", Voltage: "13.8 kV / 400 V", "Vector group": "Dyn11", Cooling: "ONAN", Impedance: "6 %" }),
  m("MS-LV-4000", "meridian-switchgear", "lvs", 24, { Rating: "4000 A", Voltage: "400 V", "Fault level": "65 kA", Form: "Form 4b", Breakers: "ACB" }),
  m("MS-ATS-2000", "meridian-switchgear", "ats", 24, { Rating: "2000 A", Poles: "4", Voltage: "400 V", Transition: "Open, CTTS", Controller: "Digital" }),
  m("VT-UPS-300", "voltara", "ups", 24, { kVA: "300", kW: "270", Voltage: "400 V", Topology: "Double conversion", Batteries: "VRLA, 10 min" }),
  m("OE-DP-250", "orbis-electric", "dp", 12, { Rating: "250 A", Voltage: "400 V", Ways: "42", "Fault level": "25 kA" }),
  m("OE-LPS-ESE60", "orbis-electric", "lps", 24, { Type: "ESE air terminal", "Protection radius": "79 m", Level: "I", Standard: "NFPA 780" }),
  // HVAC
  m("BC-1200W", "boreal-chillers", "chl", 36, { Capacity: "1000 TR", kW: "3517", Refrigerant: "R-134a", Voltage: "400 V", Compressor: "Centrifugal, VSD" }),
  m("BC-CT-1000", "boreal-chillers", "ct", 24, { Capacity: "1000 TR", Flow: "250 L/s", Fans: "2 x 30 kW", Cells: "2" }),
  m("VP-CW-150", "vega-pumps", "cwp", 24, { Flow: "250 L/s", Head: "32 m", kW: "90", Speed: "1780 rpm" }),
  m("KC-AH-20", "kanto-climate", "ahu", 24, { Flow: "20000 CMH", Capacity: "85 kW", "Fan motor": "22 kW", Filter: "F7" }),
  m("TA-FC-06", "tanaka-air", "fcu", 12, { Flow: "600 CFM", Capacity: "3.5 kW", Voltage: "230 V", Speed: "3-speed" }),
  m("KC-VR-28", "kanto-climate", "vrf", 24, { Capacity: "28 HP", Refrigerant: "R410A", Voltage: "400 V", Compressors: "2 inverter", Cooling: "78 kW" }),
  m("TA-VR-24", "tanaka-air", "vrf", 24, { Capacity: "24 HP", Refrigerant: "R410A", Voltage: "400 V", Compressors: "2 inverter", Cooling: "67 kW" }),
  m("TA-SP-10", "tanaka-air", "spf", 24, { Flow: "12000 CMH", kW: "5.5", Pressure: "250 Pa", Speed: "1450 rpm" }),
  m("TA-EF-04", "tanaka-air", "ef", 12, { Flow: "4000 CMH", kW: "1.5", Speed: "1450 rpm", Voltage: "230 V" }),
  // PLUMB
  m("VP-TP-50", "vega-pumps", "tp", 24, { Flow: "50 L/s", Head: "45 m", kW: "37", Speed: "2900 rpm" }),
  m("VP-BP-30", "vega-pumps", "bp", 24, { Flow: "30 L/s", Head: "70 m", kW: "30", Speed: "2900 rpm" }),
  m("VP-SP-05", "vega-pumps", "sp", 12, { Flow: "10 L/s", Head: "12 m", kW: "3.7", Speed: "2900 rpm" }),
  m("TA-BL-15", "tanaka-air", "stp", 12, { Flow: "1200 CMH", kW: "15", Pressure: "60 kPa", Type: "Roots blower" }),
  m("AQ-CT-100", "aquila-sanitary", "cst", 24, { Capacity: "100 m3", Material: "SS304 panel", Compartments: "2", Standard: "NSF/ANSI 61" }),
  m("AQ-ET-50", "aquila-sanitary", "ewt", 24, { Capacity: "50 m3", Material: "SS304 panel", Compartments: "1", Standard: "NSF/ANSI 61" }),
  m("AQ-WH-200", "aquila-sanitary", "wh", 12, { Capacity: "200 L", kW: "6", Voltage: "400 V", Type: "Storage, electric" }),
  // FIRE
  m("HF-750E", "halcyon-fire-systems", "fp", 24, { Flow: "750 GPM", Head: "125 psi", kW: "75", Speed: "1780 rpm", Standard: "NFPA 20, UL/FM" }),
  m("KP-500E", "kestrel-pumps", "fp", 24, { Flow: "500 GPM", Head: "125 psi", kW: "55", Speed: "1780 rpm", Standard: "NFPA 20" }),
  m("HF-750D", "halcyon-fire-systems", "fpd", 24, { Flow: "750 GPM", Head: "125 psi", kW: "90", Engine: "Diesel", Standard: "NFPA 20, UL/FM" }),
  m("KP-500D", "kestrel-pumps", "fpd", 24, { Flow: "500 GPM", Head: "125 psi", kW: "70", Engine: "Diesel", Standard: "NFPA 20" }),
  m("VP-JP-10", "vega-pumps", "jp", 12, { Flow: "10 GPM", Head: "135 psi", kW: "3", Speed: "2900 rpm" }),
  m("HF-SAV-150", "halcyon-fire-systems", "sav", 24, { Size: "150 mm", Pressure: "300 psi", Type: "Wet alarm valve", Standard: "UL/FM" }),
  m("HF-CA-FM200", "halcyon-fire-systems", "ca", 24, { Agent: "HFC-227ea", Capacity: "120 kg", Cylinders: "2", Standard: "NFPA 2001" }),
  // ELV
  m("SD-FA-2000", "sentinel-detection", "fdas", 24, { Loops: "4", Capacity: "1000 devices", Protocol: "Addressable", Battery: "24 V, 38 Ah" }),
  m("AV-NVR-64", "argus-vision", "nvr", 24, { Channels: "64", Storage: "96 TB", Bandwidth: "640 Mbps", Standard: "ONVIF" }),
  m("PS-NVR-32", "portis-access", "nvr", 24, { Channels: "32", Storage: "48 TB", Bandwidth: "320 Mbps", Standard: "ONVIF" }),
  m("PS-AC-4", "portis-access", "acs", 24, { Doors: "4", Readers: "Wiegand / OSDP", Battery: "12 V, 7 Ah", Protocol: "TCP/IP" }),
  m("SD-PA-500", "sentinel-detection", "pa", 24, { Zones: "16", Output: "500 W", Standard: "EN 54-16", Amplifier: "Class-D" }),
  m("CC-BMS-X3", "cortex-controls", "bms", 24, { Points: "5000", Protocol: "BACnet/IP, Modbus", Storage: "1 TB SSD", Redundancy: "Hot standby" }),
  // VT
  m("NL-1600", "norden-lifts", "el", 24, { Persons: "21", Capacity: "1600 kg", Speed: "3.0 m/s", Drive: "Gearless traction" }, "nl-2000"),
  m("NL-2000", "norden-lifts", "el", 24, { Persons: "26", Capacity: "2000 kg", Speed: "4.0 m/s", Drive: "Gearless traction" }),
  m("AE-1350", "aurum-elevators", "el", 24, { Persons: "18", Capacity: "1350 kg", Speed: "2.5 m/s", Drive: "Gearless traction" }),
  m("NL-SV-2500", "norden-lifts", "els", 24, { Persons: "33", Capacity: "2500 kg", Speed: "2.0 m/s", Drive: "Geared traction" }),
  m("SR-BMU-3", "skyreach-bmu", "bmu", 24, { Capacity: "500 kg", Reach: "3 m", Travel: "Rail-mounted", Power: "400 V, 3-phase" }),
  // ARCH
  m("TS-CW-01", "terra-stone", "fac", 36, { System: "Unitised curtain wall", Glazing: "Double, low-e", Frame: "Aluminium", "Wind load": "3.0 kPa" }),
  m("SO-WP-02", "solis-paints", "wp", 36, { Type: "Liquid-applied membrane", Thickness: "2 mm", Colour: "Grey", Coverage: "1.2 kg/m2" }),
  m("MA-PF-30", "marlin-aquatics", "pf", 12, { Flow: "30 m3/h", kW: "2.2", Head: "14 m", Voltage: "400 V" }),
  m("PS-PB-01", "portis-access", "pb", 12, { Arm: "3 m", Cycle: "3 s", Voltage: "230 V", Standard: "IP54" }),
];
