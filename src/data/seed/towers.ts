import type { Id, Tower } from "@/data/types";

export const TOWERS: Tower[] = [
  {
    id: "eds", code: "EDS", name: "Edades Suites", estate: "Rockwell Center", address: "Amapola St, Makati City", use: "residential",
    floorsAbove: 40, floorsBelow: 3, gfaSqm: 62000, turnoverYear: 2016,
    propertyManagerId: "tm-1", pmoPhone: "+63 2 8555 0110", pmoEmail: "pmo.eds@example.rockwell.test",
  },
  {
    id: "prl", code: "PRL", name: "Proscenium Lincoln", estate: "Proscenium at Rockwell", address: "Estrella St, Makati City", use: "residential",
    floorsAbove: 50, floorsBelow: 4, gfaSqm: 88000, turnoverYear: 2019,
    propertyManagerId: "tm-2", pmoPhone: "+63 2 8555 0120", pmoEmail: "pmo.prl@example.rockwell.test",
  },
  {
    id: "grb", code: "GRB", name: "The Grove Tower B", estate: "The Grove by Rockwell", address: "E. Rodriguez Jr. Ave, Pasig City", use: "residential",
    floorsAbove: 30, floorsBelow: 2, gfaSqm: 41000, turnoverYear: 2014,
    propertyManagerId: "tm-3", pmoPhone: "+63 2 8555 0130", pmoEmail: "pmo.grb@example.rockwell.test",
  },
  {
    id: "8rw", code: "8RW", name: "8 Rockwell", estate: "Rockwell Center", address: "Hidalgo Dr, Makati City", use: "office",
    floorsAbove: 19, floorsBelow: 5, gfaSqm: 47000, turnoverYear: 2016,
    propertyManagerId: "tm-4", pmoPhone: "+63 2 8555 0140", pmoEmail: "pmo.8rw@example.rockwell.test",
  },
];

/** Generator config, not a Tower field: podium level (absent = no podium floor) and the one sample typical floor that holds equipment. */
export interface TowerConfig { podiumLevel?: number; sampleLevel: number }
export const TOWER_CONFIG: Record<Id, TowerConfig> = {
  eds: { podiumLevel: 5, sampleLevel: 12 },
  prl: { podiumLevel: 6, sampleLevel: 20 },
  grb: { podiumLevel: 5, sampleLevel: 15 },
  "8rw": { sampleLevel: 10 },
};
