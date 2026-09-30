import type { Discipline } from "@/data/types";

export const DISCIPLINES: Discipline[] = [
  { id: "ELEC", name: "Electrical", tone: "navy", order: 1 },
  { id: "HVAC", name: "Mechanical / HVAC", tone: "info", order: 2 },
  { id: "PLUMB", name: "Plumbing / Sanitary", tone: "ok", order: 3 },
  { id: "FIRE", name: "Fire protection", tone: "danger", order: 4 },
  { id: "ELV", name: "ELV / Auxiliary", tone: "gold", order: 5 },
  { id: "VT", name: "Vertical transport", tone: "warn", order: 6 },
  { id: "ARCH", name: "Architectural", tone: "muted", order: 7 },
  { id: "STRUCT", name: "Structural", tone: "ink-soft", order: 8 },
];
