import { useId } from "react";
import { cn } from "@/components/ui/cn";
import type { Id, PlanPin, PlanRoom, PlanTemplate, Rect, Space, SpaceKind, Tone } from "@/data/types";

// Spec §5.3. A pure function of its props: no state, no internal zoom or pan. A caller that wants zoom narrows `viewBox`.
// Every fill and stroke is a token class, so dark mode is automatic.

const FULL: Rect = { x: 0, y: 0, w: 100, h: 62.5 };

// literal class names so Tailwind can see them
const PIN_FILL: Record<Tone, string> = {
  navy: "fill-navy", gold: "fill-gold", info: "fill-info", ok: "fill-ok",
  warn: "fill-warn", danger: "fill-danger", muted: "fill-muted", "ink-soft": "fill-ink-soft",
};

const HATCHED: ReadonlySet<SpaceKind> = new Set(["lift-lobby", "stair"]);
const OPEN: ReadonlySet<SpaceKind> = new Set(["corridor", "parking", "roof-deck"]);
const OCCUPIED: ReadonlySet<SpaceKind> = new Set(["unit", "office", "retail", "amenity", "pool", "lobby", "toilet"]);
// everything else is plant and sits on the plain surface
const roomFill = (kind: SpaceKind) => (OPEN.has(kind) ? "fill-surface-2" : OCCUPIED.has(kind) ? "fill-paper" : "fill-surface");

// --- room labels -----------------------------------------------------------------------------------------------------
// Glyph width is estimated (Montserrat is wide); a name that does not fit wraps to two lines, then falls back to the
// room code, then to nothing. `compact` (mini-plans) skips small rooms and the code line.

type Line = { text: string; size: number };
const NAME = 2.2;
const CODE = 1.8;
const fits = (text: string, size: number, width: number) => text.length * size * 0.62 <= width;
const clip = (s: string) => (s.length > 18 ? `${s.slice(0, 17).trimEnd()}…` : s);
const pitch = (l: Line) => l.size * 1.15;
const heightOf = (lines: Line[]) => lines.reduce((h, l) => h + pitch(l), 0);

function wrapName(name: string, width: number): string[] | null {
  const lines: string[] = [];
  let cur = "";
  for (const word of name.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (!cur || fits(next, NAME, width)) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  lines.push(cur);
  return lines.length <= 2 && lines.every((l) => fits(l, NAME, width)) ? lines : null;
}

function labelFor(room: PlanRoom, compact: boolean, highlighted: boolean): Line[] {
  if (compact && !highlighted && room.w * room.h < 220) return [];
  const width = room.w - 1.2;
  const maxH = room.h - 1;
  const code: Line = { text: room.code, size: CODE };
  const codeFits = fits(room.code, CODE, width);
  const name = wrapName(clip(room.name), width)?.map((text) => ({ text, size: NAME }));
  if (name) {
    const withCode = codeFits && !compact ? [...name, code] : name;
    if (heightOf(withCode) <= maxH) return withCode;
    if (heightOf(name) <= maxH) return name;
  }
  return codeFits && pitch(code) <= maxH ? [code] : [];
}

// --- component -------------------------------------------------------------------------------------------------------

export function FloorPlanSvg({
  template, spaces, pins, viewBox = FULL, selectedAssetId, highlightSpaceIds, highlightAssetIds,
  onPinClick, onSpaceClick, compact = false, className,
}: {
  template: PlanTemplate;
  spaces: Space[];
  pins: PlanPin[];
  viewBox?: Rect;
  selectedAssetId?: Id;
  highlightSpaceIds?: Id[];
  highlightAssetIds?: Id[];
  onPinClick?: (assetId: Id) => void;
  onSpaceClick?: (spaceId: Id) => void;
  compact?: boolean;
  className?: string;
}) {
  // a unique pattern id per instance: a page can hold a mini-plan and a full plan, and a hidden SVG cannot serve url(#…) refs
  const hatch = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spaceByCode = new Map(spaces.map((s) => [s.code, s]));
  const litSpaces = new Set(highlightSpaceIds);
  const litAssets = new Set(highlightAssetIds);
  const anyLit = litAssets.size > 0;
  const rank = (p: PlanPin) => (p.assetId === selectedAssetId ? 2 : litAssets.has(p.assetId) ? 1 : 0);
  const ordered = [...pins].sort((a, b) => rank(a) - rank(b)); // selected on top

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      role="group"
      aria-label="Floor plan, schematic, not to scale"
      className={cn("block aspect-[16/10] w-full rounded-card border border-line bg-surface-2", className)}
    >
      <defs>
        <pattern id={hatch} width={1.6} height={1.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={1.6} height={1.6} className="fill-surface-2" />
          <line x1={0} y1={0} x2={0} y2={1.6} className="stroke-line-strong" strokeWidth={0.4} />
        </pattern>
      </defs>

      <rect x={1} y={1} width={98} height={60.5} rx={1} className="fill-surface stroke-line-strong" strokeWidth={0.6} />

      {template.rooms.map((room) => {
        const space = spaceByCode.get(room.code);
        const lit = !!space && litSpaces.has(space.id);
        const click = space && onSpaceClick ? () => onSpaceClick(space.id) : undefined;
        const hatched = HATCHED.has(room.kind);
        const lines = labelFor(room, compact, lit);
        let y = room.y + room.h / 2 - heightOf(lines) / 2;
        return (
          <g key={room.code} className={cn("group/room", click && "cursor-pointer")} onClick={click}>
            <title>{`${room.name} (${room.code})`}</title>
            <rect
              x={room.x} y={room.y} width={room.w} height={room.h}
              fill={hatched ? `url(#${hatch})` : undefined}
              className={cn("stroke-line-strong", !hatched && roomFill(room.kind))}
              strokeWidth={0.35}
            />
            {(lit || click) && (
              <rect
                x={room.x} y={room.y} width={room.w} height={room.h} pointerEvents="none"
                strokeWidth={lit ? 0.7 : 0.35}
                className={lit ? "fill-gold/25 stroke-gold" : "fill-gold/0 stroke-none group-hover/room:fill-gold/15"}
              />
            )}
            {lines.map((line, i) => {
              const cy = y + pitch(line) / 2;
              y += pitch(line);
              return (
                <text
                  key={i} x={room.x + room.w / 2} y={cy} fontSize={line.size} fontWeight={line.size === NAME ? 600 : 700}
                  textAnchor="middle" dominantBaseline="central" className="pointer-events-none select-none fill-muted"
                >
                  {line.text}
                </text>
              );
            })}
          </g>
        );
      })}

      {/* north arrow, tucked into the top-right corner so it stays clear of the centred room labels */}
      <g className="pointer-events-none fill-muted" opacity={0.8}>
        <path d="M96.4 2.8 L97.6 5.6 L96.4 5 L95.2 5.6 Z" />
        <text x={96.4} y={7.3} fontSize={1.6} fontWeight={700} textAnchor="middle" dominantBaseline="central">N</text>
      </g>

      {!compact && (
        <g className="pointer-events-none">
          <rect x={1.5} y={57.6} width={27} height={3.6} rx={0.8} className="fill-surface" opacity={0.85} />
          <text x={2.7} y={59.4} fontSize={1.6} fontWeight={600} dominantBaseline="central" className="fill-muted">
            Schematic — not to scale
          </text>
        </g>
      )}

      {ordered.map((pin) => {
        const selected = pin.assetId === selectedAssetId;
        const lit = litAssets.has(pin.assetId);
        const live = !!onPinClick;
        const flip = pin.x > 78;
        return (
          <g
            key={pin.assetId}
            transform={`translate(${pin.x} ${pin.y})`}
            role={live ? "button" : "img"}
            aria-label={pin.title}
            aria-pressed={live ? selected : undefined}
            tabIndex={live ? 0 : undefined}
            onClick={live ? () => onPinClick(pin.assetId) : undefined}
            onKeyDown={
              live
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPinClick(pin.assetId);
                    }
                  }
                : undefined
            }
            className={cn("group outline-none", live && "cursor-pointer", anyLit && !lit && !selected && "opacity-40")}
          >
            <title>{pin.title}</title>
            {/* invisible larger target so a thumb can hit a 1.6-unit pin on a phone */}
            <circle r={3.4} fill="none" pointerEvents="all" />
            {live && <circle r={3} strokeWidth={0.7} className="fill-none stroke-gold opacity-0 group-focus-visible:opacity-100" />}
            {selected && <circle r={2.6} strokeWidth={1} opacity={0.4} className="fill-none stroke-gold" />}
            {lit && !selected && <circle r={2.5} strokeWidth={0.5} className="fill-none stroke-gold" />}
            <circle r={1.6} strokeWidth={0.35} className={cn("stroke-white", PIN_FILL[pin.tone])} />
            <text
              x={flip ? -2.4 : 2.4} y={pin.y < 6 ? 3 : -2.2} fontSize={1.9} fontWeight={700}
              textAnchor={flip ? "end" : "start"} paintOrder="stroke" strokeWidth={0.7} strokeLinejoin="round"
              className={cn(
                "pointer-events-none select-none fill-ink stroke-surface transition-opacity duration-150",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              )}
            >
              {pin.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
