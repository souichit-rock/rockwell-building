import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { Chip } from "@/components/ui";
import { useDb } from "@/data/store";
import { todayISO } from "@/lib/dates";
import { paths } from "@/lib/paths";
import { AttentionCard } from "../components/AttentionCard";
import { GapsCard } from "../components/GapsCard";
import { Hero } from "../components/Hero";
import { KpiRow } from "../components/KpiRow";
import { PmStripCard } from "../components/PmStripCard";
import { TourCard } from "../components/TourCard";
import { TowerCards } from "../components/TowerCards";
import { dashboardData } from "../lib";

/** Portfolio dashboard (spec 6.1). KPIs, tower health and the PM strip are portfolio-wide; the tower scope (rail select or ?tower=, query wins) narrows the two lists. */
export default function Dashboard() {
  const db = useDb((d) => d);
  const { towerId: stored, setTowerId } = useTowerScope();
  const [params, setParams] = useSearchParams();
  const queried = params.get("tower");
  const towerId = queried && Object.hasOwn(db.towers, queried) ? queried : stored;
  const today = todayISO();
  const data = useMemo(() => dashboardData(db, today, towerId ?? undefined), [db, today, towerId]);
  const scopeName = towerId ? db.towers[towerId]?.name : undefined;

  const clearScope = () => {
    setTowerId(null);
    if (params.has("tower")) {
      const next = new URLSearchParams(params);
      next.delete("tower");
      setParams(next, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <Hero
        towers={data.cards.map((c) => c.tower)}
        assets={data.kpis.assetsTotal}
        today={today}
        tourHref={data.tour[1]?.to ?? paths.towers()}
      />
      <KpiRow kpis={data.kpis} warranties30={data.warranties30} />
      <TowerCards cards={data.cards} />
      {scopeName && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
          <Chip label={`Scoped to ${scopeName} · Clear`} active onClick={clearScope} />
          <p className="type-small text-ink-soft">Needs attention and Record gaps show this tower only. Figures, health and the PM strip stay portfolio-wide.</p>
        </div>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <AttentionCard groups={data.groups} count={data.attentionCount} />
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-1">
          <GapsCard sections={data.gaps} />
          <PmStripCard strip={data.strip} kpis={data.kpis} />
        </div>
      </div>
      <TourCard steps={data.tour} />
    </div>
  );
}
