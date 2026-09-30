import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { StatTile, cn } from "@/components/ui";
import type { PortfolioKpis } from "@/data/types";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

type Tile = { label: string; value: string; delta: string; to: string; tone?: "hot" | "gold" };

/** Six portfolio figures, all from portfolioKpis (the warranty split comes from attentionItems). One gold tile, PM overdue is hot when non-zero. */
export function KpiRow({ kpis, warranties30 }: { kpis: PortfolioKpis; warranties30: number }) {
  const tiles: Tile[] = [
    { label: "Assets in service", value: fmtNumber(kpis.assetsInService), delta: `of ${fmtNumber(kpis.assetsTotal)} assets`, to: paths.assets({ status: "in-service" }), tone: "gold" },
    { label: "Open work orders", value: fmtNumber(kpis.openWos), delta: `${kpis.openP1} P1 · ${kpis.openP2} P2`, to: paths.workOrders() },
    {
      label: "PM overdue", value: fmtNumber(kpis.pmOverdue), delta: `${fmtNumber(kpis.pmDue14d)} more due in 14 days`, to: paths.maintenance(),
      tone: kpis.pmOverdue > 0 ? "hot" : undefined,
    },
    { label: "Warranties ≤ 90 d", value: fmtNumber(kpis.warranties90d), delta: `${fmtNumber(warranties30)} end within 30 days`, to: paths.warranties() },
    {
      label: "Permits due or expired", value: fmtNumber(kpis.permitsDue + kpis.permitsExpired), delta: `${kpis.permitsExpired} expired · ${kpis.permitsDue} due`,
      to: paths.permits(),
    },
    { label: "As-built coverage", value: `${kpis.asBuiltCoveragePct}%`, delta: "current sheets, floors × disciplines", to: paths.documents({ type: "as-built", current: 1 }) },
  ];
  return (
    <section aria-labelledby="kpi-h">
      <h2 id="kpi-h" className="sr-only">Portfolio key figures</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="focus-ring group relative block rounded-card">
            <StatTile label={t.label} value={t.value} delta={t.delta} tone={t.tone} className="h-full" />
            <ArrowUpRight
              aria-hidden="true"
              className={cn("absolute right-3 top-3 hidden size-4 transition-colors duration-150 sm:block", t.tone === "gold" ? "text-on-gold" : "text-muted group-hover:text-ink")}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
