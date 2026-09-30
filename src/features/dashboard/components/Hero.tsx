import type { Tower } from "@/data/types";
import { Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

const W = 44;
const GAP = 12;
const GROUND = 104;
const TALLEST = 96;

/** Decorative skyline: one bar per tower, height proportional to its floors above ground. Hidden from assistive tech. */
function Skyline({ towers }: { towers: Tower[] }) {
  const tallest = Math.max(1, ...towers.map((t) => t.floorsAbove));
  const width = towers.length * W + Math.max(0, towers.length - 1) * GAP;
  return (
    <svg viewBox={`0 0 ${width + 4} 122`} aria-hidden="true" className="hidden h-auto w-[280px] shrink-0 md:block">
      <line x1="0" x2={width + 4} y1={GROUND} y2={GROUND} className="stroke-navy-line" strokeWidth="1" />
      {towers.map((t, i) => {
        const x = 2 + i * (W + GAP);
        const h = (TALLEST * t.floorsAbove) / tallest;
        const y = GROUND - h;
        const floors = Array.from({ length: t.floorsAbove - 1 }, (_, f) => `M${x} ${(y + ((f + 1) * h) / t.floorsAbove).toFixed(1)}H${x + W}`).join("");
        return (
          <g key={t.id}>
            <rect x={x} y={y} width={W} height={h} rx="2" className="fill-navy-hover stroke-navy-line" strokeWidth="1" />
            <path d={floors} className="stroke-navy-line" strokeWidth="0.4" opacity="0.7" />
            <rect x={x} y={y} width={W} height="2" rx="1" className="fill-gold" />
            <text x={x + W / 2} y="118" textAnchor="middle" className="fill-nav-muted font-mono text-[11px]">{t.code}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Navy hero (design-system §3.2). Eyebrow, H1 and pill text are fixed by spec 6.1. */
export function Hero({ towers, assets, today }: { towers: Tower[]; assets: number; today: string }) {
  return (
    <header className="flex flex-col gap-6 rounded-lg bg-hero p-6 text-nav-text md:flex-row md:items-end md:justify-between lg:p-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-extrabold uppercase leading-[1.2] tracking-[.18em] text-gold">Rockwell Building · Portfolio</p>
          <Badge tone="gold">Sample data</Badge>
        </div>
        <h1 className="type-display mt-3">Building Information System</h1>
        <p className="type-body mt-3 max-w-[58ch] text-nav-muted">
          One record of what was built, what is installed and what the house standard is, across {fmtNumber(towers.length)} towers. Start with what needs
          attention, or walk the ten-minute tour.
        </p>
        <p className="type-small mt-3 text-nav-muted">
          {fmtNumber(towers.length)} towers · {fmtNumber(assets)} assets · as of {fmtDate(today)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {/* the tour list is on this page (TourCard, id="tour"): scroll to it instead of skipping to stop 2 */}
          <Button variant="primary" onClick={() => document.getElementById("tour")?.scrollIntoView({ block: "start" })}>Start the tour</Button>
          <Button to={paths.towers()} variant="ghost">Browse towers</Button>
        </div>
      </div>
      <Skyline towers={towers} />
    </header>
  );
}
