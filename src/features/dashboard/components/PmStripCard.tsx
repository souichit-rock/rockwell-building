import { CalendarCheck } from "lucide-react";
import { Link } from "react-router";
import { Button, Card, EmptyState } from "@/components/ui";
import type { PortfolioKpis } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { StripDay } from "../lib";

// viewBox units: one column per day, bars grow up from BASE
const STEP = 20;
const BAR = 14;
const PAD = 3;
const TOP = 16;
const PLOT = 64;
const BASE = TOP + PLOT;

/** PM due per day for today plus the next 14 days: inline SVG, single series, today in gold. Total and overdue come from portfolioKpis. */
export function PmStripCard({ strip, kpis }: { strip: StripDay[]; kpis: PortfolioKpis }) {
  const max = Math.max(1, ...strip.map((d) => d.count));
  const width = strip.length * STEP + PAD * 2 - (STEP - BAR);
  const lines = Array.from({ length: Math.min(max, 5) }, (_, i) => Math.round(((i + 1) / Math.min(max, 5)) * max));
  const nothingDue = strip.every((d) => d.count === 0);
  const todayDue = (strip[0]?.count ?? 0) > 0;
  const laterDue = strip.slice(1).some((d) => d.count > 0);
  return (
    <Card title="PM due, next 14 days" actions={<Button to={paths.maintenance({ view: "calendar" })} size="sm">Schedule</Button>}>
      {nothingDue ? (
        <EmptyState icon={CalendarCheck} title="Nothing due" body="No PM plan falls due today or in the next 14 days." />
      ) : (
        <svg
          viewBox={`0 0 ${width} ${BASE + 24}`}
          role="img"
          aria-label={`Preventive maintenance due per day from today: ${plural(kpis.pmDue14d, "plan")} in total`}
          className="h-auto w-full"
        >
          {lines.map((v) => (
            <line key={v} x1="0" x2={width} y1={BASE - (v / max) * PLOT} y2={BASE - (v / max) * PLOT} className="stroke-line" strokeWidth="1" />
          ))}
          <line x1="0" x2={width} y1={BASE} y2={BASE} className="stroke-line-strong" strokeWidth="1" />
          {strip.map((d, i) => {
            const x = PAD + i * STEP;
            const h = (d.count / max) * PLOT;
            return (
              <g key={d.date}>
                <title>{`${d.label}: ${plural(d.count, "plan")} due`}</title>
                <rect x={x - (STEP - BAR) / 2} y={TOP - 12} width={STEP} height={PLOT + 36} fill="transparent" />
                {d.count > 0 && <rect x={x} y={BASE - h} width={BAR} height={h} rx="3" className={i === 0 ? "fill-gold" : "fill-ink"} />}
                {d.count > 0 && (
                  <text x={x + BAR / 2} y={BASE - h - 4} textAnchor="middle" className="fill-ink-soft text-[11px] font-bold">{d.count}</text>
                )}
                <text x={x + BAR / 2} y={BASE + 15} textAnchor="middle" className={i === 0 ? "fill-ink text-[11px] font-extrabold" : "fill-muted text-[11px]"}>
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-medium text-muted">
        {nothingDue ? (
          <span />
        ) : (
          // a swatch only for a colour that is actually drawn
          <span className="inline-flex items-center gap-4">
            {todayDue && (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-gold" />
                Today
              </span>
            )}
            {laterDue && (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-ink" />
                Later
              </span>
            )}
          </span>
        )}
        <span>
          <strong className="font-extrabold tabular-nums text-ink">{kpis.pmDue14d}</strong> due ·{" "}
          <Link to={paths.maintenance()} className="focus-ring relative rounded font-bold text-ink underline-offset-2 after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] hover:underline">
            <span className="tabular-nums">{kpis.pmOverdue}</span> overdue
          </Link>
        </span>
      </div>
    </Card>
  );
}
