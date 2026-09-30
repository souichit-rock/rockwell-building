import { Minus, Plus } from "lucide-react";
import {
  useEffect, useRef, type ComponentProps, type Dispatch, type FocusEvent, type PointerEvent, type SetStateAction,
} from "react";
import { FloorPlanSvg } from "@/components/plan/FloorPlanSvg";
import { Button, cn } from "@/components/ui";
import type { Rect } from "@/data/types";
import { fmtNumber } from "@/lib/format";
import { FULL, centerOn, clampView, inView, isFit, zoomAt, zoomOf } from "../view";

type SvgProps = Omit<ComponentProps<typeof FloorPlanSvg>, "viewBox" | "className" | "compact">;
export type ViewSetter = Dispatch<SetStateAction<Rect>>;

const DRAG_THRESHOLD_PX = 4;
const STEP = 1.5;

/**
 * FloorPlanSvg with wheel zoom (1x to 4x, about the cursor), drag pan and double-click to fit. The renderer is stateless, so
 * every gesture just narrows or moves the `viewBox` the parent owns. A drag only captures the pointer once it moves, so a plain
 * click still reaches the pin or room underneath. At "Fit" a downward wheel scrolls the page instead of being swallowed.
 */
export function PlanCanvas({ view, onView, ...svg }: SvgProps & { view: Rect; onView: ViewSetter }) {
  const box = useRef<HTMLDivElement>(null);
  const current = useRef(view);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const zoomed = !isFit(view);

  useEffect(() => {
    current.current = view;
  }, [view]);

  // a native listener: React's onWheel is passive and cannot preventDefault
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      if (dy === 0 || (dy > 0 && isFit(current.current))) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      onView((v) => zoomAt(v, Math.exp(-dy * 0.0015), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onView]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!zoomed || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    d.x = e.clientX;
    d.y = e.clientY;
    const r = el.getBoundingClientRect();
    onView((v) => clampView({ ...v, x: v.x - (dx * v.w) / r.width, y: v.y - (dy * v.h) / r.height }));
  };
  const up = () => {
    drag.current = null;
  };

  // Tab into a pin that the zoom has pushed off screen: bring it back into the window
  const focus = (e: FocusEvent<HTMLDivElement>) => {
    const label = (e.target as Element).getAttribute("aria-label");
    const pin = svg.pins.find((p) => p.title === label);
    if (pin && !inView(current.current, pin, 3)) onView((v) => centerOn(v, pin));
  };

  return (
    <div
      ref={box}
      id="plan-canvas"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => onView(FULL)}
      onFocus={focus}
      className={cn("select-none", zoomed ? "cursor-grab touch-none active:cursor-grabbing" : "touch-pan-y")}
    >
      <FloorPlanSvg {...svg} viewBox={view} />
    </div>
  );
}

/** Zoom out, readout, zoom in, Fit. Buttons are the keyboard and touch route to the same zoom the wheel gives a mouse. */
export function ZoomControls({ view, onView }: { view: Rect; onView: ViewSetter }) {
  const z = zoomOf(view);
  return (
    <div role="group" aria-label="Plan zoom" className="flex shrink-0 items-center gap-1.5">
      <Button variant="ghost" size="sm" icon aria-label="Zoom out" disabled={isFit(view)} onClick={() => onView((v) => zoomAt(v, 1 / STEP))}>
        <Minus className="size-4" strokeWidth={2} />
      </Button>
      <span aria-live="polite" className="w-10 text-center text-xs font-bold tabular-nums text-ink-soft">{fmtNumber(z, 1)}×</span>
      <Button variant="ghost" size="sm" icon aria-label="Zoom in" disabled={z >= 4} onClick={() => onView((v) => zoomAt(v, STEP))}>
        <Plus className="size-4" strokeWidth={2} />
      </Button>
      <Button variant="ghost" size="sm" disabled={isFit(view)} onClick={() => onView(FULL)}>Fit</Button>
    </div>
  );
}
