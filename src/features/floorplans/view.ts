import type { Point, Rect } from "@/data/types";

// Pure viewBox maths for the zoom / pan canvas. FloorPlanSvg holds no zoom state: the feature narrows the `viewBox` prop,
// and the rect always keeps the 100 x 62.5 (16:10) ratio so the SVG never letterboxes. Only `import type` above, so
// `node src/features/floorplans/view.check.mjs` can run this file without a bundler.

export const FULL: Rect = { x: 0, y: 0, w: 100, h: 62.5 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 1 = whole plan, 4 = a quarter of the width. */
export const zoomOf = (v: Rect): number => FULL.w / v.w;

export const isFit = (v: Rect): boolean => v.w >= FULL.w - 0.01;

/** Keeps the window inside the plan. */
export function clampView(v: Rect): Rect {
  return { w: v.w, h: v.h, x: clamp(v.x, 0, FULL.w - v.w), y: clamp(v.y, 0, FULL.h - v.h) };
}

/** Multiplies the zoom by `factor` (clamped 1..4) keeping the point at fraction (fx, fy) of the window fixed under the cursor. */
export function zoomAt(v: Rect, factor: number, fx = 0.5, fy = 0.5): Rect {
  const z = clamp(zoomOf(v) * factor, MIN_ZOOM, MAX_ZOOM);
  const w = FULL.w / z;
  const h = FULL.h / z;
  return clampView({ x: v.x + fx * (v.w - w), y: v.y + fy * (v.h - h), w, h });
}

/** Same zoom, window centred on `p`. */
export const centerOn = (v: Rect, p: Point): Rect => clampView({ ...v, x: p.x - v.w / 2, y: p.y - v.h / 2 });

/** True when `p` sits inside the window, `margin` units in from the edge. */
export const inView = (v: Rect, p: Point, margin = 2): boolean =>
  p.x >= v.x + margin && p.x <= v.x + v.w - margin && p.y >= v.y + margin && p.y <= v.y + v.h - margin;

/** The tightest 16:10 window around `rects` (zero-size rects are points), padded, never narrower than `minW` (floor 25 = 4x). */
export function fitRects(rects: Rect[], minW = 30, pad = 6): Rect {
  if (rects.length === 0) return FULL;
  const x0 = Math.min(...rects.map((r) => r.x));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y0 = Math.min(...rects.map((r) => r.y));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  const ratio = FULL.w / FULL.h;
  const w = clamp(Math.max(x1 - x0 + 2 * pad, (y1 - y0 + 2 * pad) * ratio, minW), FULL.w / MAX_ZOOM, FULL.w);
  const h = w / ratio;
  return clampView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h });
}
