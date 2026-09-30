// Run: node src/features/floorplans/view.check.mjs   (Node 22.6+ strips the types from view.ts itself)
import { FULL, centerOn, clampView, fitRects, inView, isFit, zoomAt, zoomOf } from "./view.ts";

const near = (a, b, msg) => {
  if (Math.abs(a - b) > 1e-9) throw new Error(`${msg}: ${a} != ${b}`);
};
const inside = (v, msg) => {
  if (v.x < -1e-9 || v.y < -1e-9 || v.x + v.w > FULL.w + 1e-9 || v.y + v.h > FULL.h + 1e-9) throw new Error(`${msg}: outside the plan ${JSON.stringify(v)}`);
  near(v.w / v.h, FULL.w / FULL.h, `${msg}: ratio`);
};

// zoom in at a corner keeps the point under the cursor fixed
const corner = zoomAt(FULL, 2, 0.25, 0.25);
near(zoomOf(corner), 2, "zoom 2x");
near(corner.x + 0.25 * corner.w, 0.25 * FULL.w, "focal x");
near(corner.y + 0.25 * corner.h, 0.25 * FULL.h, "focal y");
inside(corner, "corner");

// zoom is clamped to 1..4 and stays inside the plan
let v = FULL;
for (let i = 0; i < 12; i++) v = zoomAt(v, 1.5, 1, 1);
near(zoomOf(v), 4, "max zoom");
inside(v, "max zoom window");
for (let i = 0; i < 12; i++) v = zoomAt(v, 1 / 1.5, 0, 0);
if (!isFit(v)) throw new Error("zooming all the way out must land on the fit window");

// clamp and centre
inside(clampView({ x: -50, y: 90, w: 50, h: 31.25 }), "clamp");
const c = centerOn(zoomAt(FULL, 2), { x: 50, y: 31.25 });
near(c.x + c.w / 2, 50, "centre x");
if (!inView(c, { x: 50, y: 31.25 })) throw new Error("centred point must be in view");
if (inView(zoomAt(FULL, 4, 0, 0), { x: 90, y: 50 })) throw new Error("far point must be out of view");

// fitRects: one room, one point, nothing, everything
inside(fitRects([{ x: 52, y: 2, w: 16, h: 16 }]), "room");
const pin = fitRects([{ x: 60, y: 10, w: 0, h: 0 }], 40);
near(pin.w, 40, "pin width");
near(pin.x + pin.w / 2, 60, "pin centre");
if (fitRects([]) !== FULL) throw new Error("no rects means fit");
near(fitRects([{ x: 2, y: 2, w: 96, h: 58 }]).w, 100, "whole floor fits");
inside(fitRects([{ x: 90, y: 55, w: 8, h: 5 }]), "corner room");

console.log("view.ts checks passed");
