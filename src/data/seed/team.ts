import type { TeamMember } from "@/data/types";

const ALL = ["eds", "prl", "grb", "8rw"];
const mail = (name: string) => `${name.toLowerCase().replace(/^engr\.\s*/, "").replace(/[^a-z]+/g, ".")}@example.rockwell.test`;
const m = (n: number, name: string, role: string, team: TeamMember["team"], towerIds: string[], phone: string): TeamMember =>
  ({ id: `tm-${n}`, name, role, team, towerIds, phone, email: mail(name) });

// tm-1..4 property managers (eds, prl, grb, 8rw), tm-5..8 building engineers (same order), tm-9..10 technicians, tm-11 design & technical lead.
export const TEAM: TeamMember[] = [
  m(1, "Maricel Dela Cruz", "Property Manager", "Property Management", ["eds"], "+63 917 810 2201"),
  m(2, "Ramon Villanueva", "Property Manager", "Property Management", ["prl"], "+63 917 810 2202"),
  m(3, "Jasmine Ocampo", "Property Manager", "Property Management", ["grb"], "+63 917 810 2203"),
  m(4, "Paolo Bautista", "Property Manager", "Property Management", ["8rw"], "+63 917 810 2204"),
  m(5, "Engr. Rodel Santiago", "Building Engineer", "Engineering", ["eds"], "+63 917 810 2205"),
  m(6, "Engr. Liza Fernandez", "Building Engineer", "Engineering", ["prl"], "+63 917 810 2206"),
  m(7, "Engr. Miguel Tolentino", "Building Engineer", "Engineering", ["grb"], "+63 917 810 2207"),
  m(8, "Engr. Cristina Manalo", "Building Engineer", "Engineering", ["8rw"], "+63 917 810 2208"),
  m(9, "Jomar Ramos", "FM Technician", "Engineering", ALL, "+63 917 810 2209"),
  m(10, "Ellen Cabrera", "FM Technician", "Engineering", ALL, "+63 917 810 2210"),
  m(11, "Angelica Reyes", "Design & Technical Lead", "Design & Technical", ALL, "+63 917 810 2211"),
];
