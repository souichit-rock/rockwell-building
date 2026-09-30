import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui";
import type { HealthScore, Tower } from "@/data/types";
import { fmtNumber, fmtSqm } from "@/lib/format";
import { paths } from "@/lib/paths";
import { healthTone } from "@/lib/status";
import { healthDrivers, USE_LABEL } from "../lib";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted">{label}</dt>
      <dd className="m-0 mt-0.5 font-semibold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

const inlineLink = "focus-ring relative z-10 rounded hover:underline";

/** One tower on /towers. The title link is stretched over the whole card; the two count links sit above it. */
export function TowerCard({ tower, health, assets, openWos }: { tower: Tower; health: HealthScore; assets: number; openWos: number }) {
  const drivers = healthDrivers(health);
  return (
    <article className="group relative flex min-w-0 flex-col rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-eyebrow mb-1.5">{tower.estate}</p>
          <h2 className="type-title text-ink">
            <Link to={paths.tower(tower.id)} className="focus-ring rounded after:absolute after:inset-0 after:rounded-card after:content-['']">
              {tower.name}
            </Link>
          </h2>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{USE_LABEL[tower.use]}</Badge>
            <span className="font-mono text-[12px] font-bold text-muted">{tower.code}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted">Health</p>
          <p className="mt-1 text-[28px] font-black leading-[1.1] tracking-[-.03em] tabular-nums text-ink">{health.score}</p>
          <Badge tone={healthTone(health.band)} className="mt-1.5">{health.band}</Badge>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
        <Stat label="Floors above">{fmtNumber(tower.floorsAbove)}</Stat>
        <Stat label="Floors below">{fmtNumber(tower.floorsBelow)}</Stat>
        <Stat label="GFA">{fmtSqm(tower.gfaSqm)}</Stat>
        <Stat label="Turnover">{tower.turnoverYear}</Stat>
        <Stat label="Assets">
          <Link to={paths.assets({ tower: tower.id })} className={inlineLink}>{fmtNumber(assets)}</Link>
        </Stat>
        <Stat label="Open WOs">
          <Link to={paths.workOrders({ tower: tower.id })} className={inlineLink}>{fmtNumber(openWos)}</Link>
        </Stat>
      </dl>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
        <p className="type-small min-w-0 text-ink-soft">
          {drivers.length > 0 ? <><span className="font-bold text-ink">Health drivers</span> {drivers.join(" · ")}</> : "No open risk drivers"}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-ink-soft transition-colors duration-150 group-hover:text-ink">
          Open tower
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
        </span>
      </div>
    </article>
  );
}
