import { ArrowRight, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, EmptyState } from "@/components/ui";
import { HEALTH_GOOD_MIN, HEALTH_WATCH_MIN } from "@/data/selectors";
import type { BadgeTone } from "@/data/types";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { dueTone, healthTone, permitTone } from "@/lib/status";
import type { TowerCard } from "../lib";

// bar fill follows the band's tone from healthTone; literal class names so Tailwind sees them
const FILL: Partial<Record<BadgeTone, string>> = { "solid-ok": "bg-ok", warn: "bg-warn", danger: "bg-danger" };

const USE = { residential: "Residential", office: "Office" } as const;

// label left, figure right: the rows keep their rhythm at any card width, unlike a 2 x 2 grid of wrapping labels
function StatRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div title={hint} className="flex min-h-9 items-center justify-between gap-3 py-1.5">
      <dt className="type-small text-ink-soft">{label}</dt>
      <dd className="text-[14px] font-bold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function HealthCard({ card: { tower, health, openWos, permitsDue, docs } }: { card: TowerCard }) {
  const tone = healthTone(health.band);
  return (
    <Link
      to={paths.tower(tower.id)}
      className="focus-ring group flex min-w-0 flex-col rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong"
    >
      <p className="type-eyebrow truncate">{tower.estate}</p>
      <h3 className="mt-1 text-[15px] font-bold text-ink">{tower.name}</h3>
      <p className="type-small text-muted">{USE[tower.use]} · {plural(tower.floorsAbove, "floor")}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-black leading-[1.1] tracking-[-.03em] tabular-nums text-ink">{health.score}</span>
          <span className="text-xs font-semibold text-muted">/ 100</span>
        </p>
        <Badge tone={tone}>{health.band}</Badge>
      </div>
      <div
        role="meter"
        aria-label={`${tower.name} health score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={health.score}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={`h-full rounded-full ${FILL[tone] ?? "bg-muted"}`} style={{ width: `${health.score}%` }} />
      </div>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        <StatRow label="Open WOs" hint={`${health.openP1} P1 · ${health.openP2} P2 open`}>{fmtNumber(openWos)}</StatRow>
        <StatRow label="Overdue PM">
          {health.overduePm > 0 ? <Badge tone={dueTone("overdue")}>{fmtNumber(health.overduePm)}</Badge> : fmtNumber(0)}
        </StatRow>
        <StatRow label="Permits due" hint={`${health.expiredPermits} expired, the rest expire soon`}>
          {permitsDue > 0 ? <Badge tone={permitTone(health.expiredPermits > 0 ? "expired" : "due")}>{fmtNumber(permitsDue)}</Badge> : fmtNumber(0)}
        </StatRow>
        <StatRow label="Docs" hint="Current documents">{fmtNumber(docs)}</StatRow>
      </dl>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-ink-soft transition-colors duration-150 group-hover:text-ink">
        Open tower
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </span>
    </Link>
  );
}

/** One health card per tower: score, band, four counts, link to the tower overview. Scores come from towerHealth. */
export function TowerCards({ cards }: { cards: TowerCard[] }) {
  return (
    <section aria-labelledby="health-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="health-h" className="type-title text-ink">Tower health</h2>
        <p className="text-xs font-medium text-muted">
          Score out of 100 · Good from {HEALTH_GOOD_MIN} · Watch from {HEALTH_WATCH_MIN} · Action below
        </p>
      </div>
      {cards.length === 0 ? (
        <EmptyState icon={Building2} title="No towers yet" body="Towers appear here with their health score once they are added to the register." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <HealthCard key={card.tower.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}
