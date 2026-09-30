import { History } from "lucide-react";
import { Button, Card, EmptyState, Timeline } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { sparkPoints, timelineOf, type Passport } from "../lib";

const W = 240;
const H = 48;
type Reading = Passport["readings"][string][number];

/** Inline SVG polyline over the last 12 readings of one label: ink line (navy in light mode), last point gold. */
function Sparkline({ label, series }: { label: string; series: Reading[] }) {
  const pts = series.slice(-12);
  const xy = sparkPoints(pts.map((r) => r.value), W, H, 5);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const tip = xy[xy.length - 1];
  if (!first || !last || !tip) return null;
  const values = pts.map((r) => r.value);
  return (
    <figure className="m-0 min-w-0 rounded-card border border-line bg-surface-2 p-4">
      <figcaption className="type-eyebrow">{label}</figcaption>
      <p className="mt-1 text-[20px] font-black leading-tight tracking-[-.02em] tabular-nums text-ink">
        {fmtNumber(last.value)} <span className="text-[12px] font-bold tracking-normal text-muted">{last.unit}</span>
      </p>
      <svg
        width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" className="mt-2 block h-auto max-w-full overflow-visible"
        aria-label={`${label}: ${pts.length} readings from ${fmtNumber(first.value)} to ${fmtNumber(last.value)} ${last.unit}`}
      >
        <title>{`${label}: ${fmtNumber(last.value)} ${last.unit} on ${fmtDate(last.date)}`}</title>
        {xy.length > 1 && (
          <polyline
            points={xy.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            className="stroke-ink"
          />
        )}
        <circle cx={tip.x} cy={tip.y} r={4} className="fill-gold stroke-surface-2" strokeWidth={1.5} />
      </svg>
      <p className="mt-2 text-xs text-muted">
        {fmtDate(first.date)} to {fmtDate(last.date)} · range {fmtNumber(Math.min(...values))} to {fmtNumber(Math.max(...values))}
      </p>
    </figure>
  );
}

export function HistoryTab({ p }: { p: Passport }) {
  const labels = Object.entries(p.readings);
  return (
    <div className="space-y-4">
      {labels.length > 0 && (
        <Card title="Readings">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {labels.map(([label, series]) => <Sparkline key={label} label={label} series={series} />)}
          </div>
        </Card>
      )}
      <Card
        title="Service history"
        actions={<Button to={paths.inspections({ assetId: p.asset.id })} variant="ghost" size="sm">All inspections</Button>}
      >
        {p.history.length > 0 ? (
          <Timeline items={timelineOf(p.history)} />
        ) : (
          <EmptyState
            icon={History} title="No service history" body="No work order or inspection has been recorded against this asset." className="py-8"
            action={<Button to={paths.newInspection({ assetId: p.asset.id })} variant="ghost" size="sm">Log visit</Button>}
          />
        )}
      </Card>
    </div>
  );
}
