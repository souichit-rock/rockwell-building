import { Building2 } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { Button, Chip, EmptyState, PageHeader } from "@/components/ui";
import { assetsIn, openWorkOrders, towerHealth } from "@/data/selectors";
import { useDb } from "@/data/store";
import { plural } from "@/lib/format";
import { TowerCard } from "../components/TowerCard";

export default function TowersPage() {
  const db = useDb((d) => d);
  const { towerId: scoped, setTowerId } = useTowerScope();
  const [params, setParams] = useSearchParams();
  const fromQuery = params.get("tower");
  // hasOwn: an unknown or prototype-key id ("constructor") must not win over the rail scope or title the chip
  const known = (id: string | null) => (id !== null && Object.hasOwn(db.towers, id) ? id : null);
  const queryTower = known(fromQuery);
  const active = queryTower ?? known(scoped); // the route query beats the rail scope

  const cards = useMemo(
    () =>
      Object.values(db.towers)
        .filter((t) => !active || t.id === active)
        .map((tower) => ({
          tower,
          health: towerHealth(db, tower.id),
          assets: assetsIn(db, { towerId: tower.id }).length,
          openWos: openWorkOrders(db, { towerId: tower.id }).length,
        })),
    [db, active],
  );
  const totalAssets = cards.reduce((n, c) => n + c.assets, 0);
  const activeName = active ? db.towers[active].name : null;

  // Clearing drops the scope too, otherwise removing ?tower= would silently fall back to the rail's tower.
  const clear = () => {
    setTowerId(null);
    if (fromQuery !== null) {
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("tower");
        return next;
      }, { replace: true });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Towers"
        lede={`${plural(cards.length, "tower")} and ${plural(totalAssets, "tracked asset")} in view. Health is scored 0 to 100 from overdue PM, open P1 and P2 work orders, failed inspections, expired permits and expired warranties on critical assets.`}
        actions={activeName && <Chip label={`${queryTower ? "Filtered to" : "Scoped to"} ${activeName} ×`} active onClick={clear} />}
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No towers"
          body="No tower matches this filter."
          action={<Button variant="ghost" size="sm" onClick={clear}>Show all towers</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((c) => <TowerCard key={c.tower.id} {...c} />)}
        </div>
      )}
    </>
  );
}
