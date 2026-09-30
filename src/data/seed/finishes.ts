import type { Finish, FinishCategory } from "@/data/types";

const CATEGORY: Record<string, FinishCategory> = {
  FL: "floor", WL: "wall", CL: "ceiling", DR: "door", HW: "hardware", PT: "paint", SN: "sanitary", LT: "lighting",
};
const TERRA = "terra-interiors-supply";
// id = code lower-cased. `swatch` is a hex string used only for the swatch tile (the one permitted inline colour, data-driven).
const f = (code: string, name: string, product: string, swatch: string, brandId?: string, supplierVendorId?: string): Finish => ({
  id: code.toLowerCase(), code, name, category: CATEGORY[code.slice(0, 2)], product, swatch,
  ...(brandId ? { brandId } : {}), ...(supplierVendorId ? { supplierVendorId } : {}),
});

export const FINISHES: Finish[] = [
  f("FL-01", "Lobby stone", "Terra Stone Crema, 20 mm honed", "#d8c8a9", "terra-stone", TERRA),
  f("FL-02", "Corridor carpet tile", "Modular carpet tile 500 x 500, solution-dyed nylon", "#8a8f98", undefined, TERRA),
  f("FL-03", "Unit porcelain tile", "Porcelain tile 600 x 600, matt, oak grain", "#c9b99b", "terra-stone", TERRA),
  f("FL-04", "Plant-room epoxy", "Two-pack epoxy floor coating, 2 mm, grey", "#8d9299", "solis-paints"),
  f("FL-05", "Parking floor hardener", "Dry-shake floor hardener, power-floated", "#a8a7a3", "solis-paints"),
  f("FL-06", "Lobby stone alternate", "Terra Stone Grigio, 20 mm honed", "#a6a9ab", "terra-stone", TERRA),
  f("WL-01", "Lobby wall stone", "Terra Stone Crema wall cladding, 15 mm", "#e0d3b8", "terra-stone", TERRA),
  f("WL-02", "Corridor vinyl wallcovering", "Type II vinyl wallcovering, linen texture", "#d5d0c5", undefined, TERRA),
  f("WL-03", "Unit paint", "Solis Interior Matt, off-white", "#f2efe8", "solis-paints"),
  f("WL-04", "Plant-room block paint", "Solis Masonry Coat, light grey", "#c9ccd0", "solis-paints"),
  f("CL-01", "Lobby gypsum ceiling", "Painted gypsum board, flush, with LED cove", "#f5f3ee"),
  f("CL-02", "Corridor acoustic tile", "Mineral fibre acoustic tile 600 x 600, NRC 0.7", "#eeeae0", undefined, TERRA),
  f("CL-03", "Office open ceiling", "Exposed slab with painted services", "#5b6470"),
  f("DR-01", "Unit entrance door", "Solid-core timber door, 45 mm, veneer finish", "#8b6a4a", "cedar-co-doors", TERRA),
  f("DR-02", "Fire door", "2-hour fire-rated steel door", "#7d838c", "cedar-co-doors", TERRA),
  f("HW-01", "Lever set", "Stainless lever handle set, grade 1 mortice lock", "#b8bcc2", "harbor-hardware", TERRA),
  f("HW-02", "Door closer", "Overhead door closer, fire-door rated", "#9aa0a8", "harbor-hardware", TERRA),
  f("PT-01", "Corridor paint", "Solis Washable Satin, warm grey", "#cfc9be", "solis-paints"),
  f("PT-02", "Plant-room paint", "Solis Industrial Enamel, light grey", "#d3d6da", "solis-paints"),
  f("SN-01", "Lavatory", "Wall-hung lavatory, vitreous china", "#f7f7f5", "aquila-sanitary"),
  f("SN-02", "Water closet", "Wall-hung dual-flush water closet", "#f4f4f1", "aquila-sanitary"),
  f("LT-01", "Corridor downlight", "LED downlight 12 W, 3000 K", "#f2e6b8", "lumen-lighting"),
  f("LT-02", "Lobby pendant", "Decorative LED pendant, 3000 K", "#e8d59a", "lumen-lighting"),
  f("LT-03", "Plant-room batten", "LED batten 36 W, 4000 K, IP65", "#e6eef2", "lumen-lighting"),
];
