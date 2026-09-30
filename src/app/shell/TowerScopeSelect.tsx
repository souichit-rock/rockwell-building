import { ChevronDown } from "lucide-react";
import { useTowerScope } from "@/app/useTowerScope";
import { useDb } from "@/data/store";

// Design-system §4.7 select recipe, recoloured for the navy rail.
export function TowerScopeSelect() {
  const { towerId, setTowerId } = useTowerScope();
  const towers = useDb((db) => Object.values(db.towers));
  return (
    <label className="relative block">
      <span className="sr-only">Tower scope</span>
      <select
        value={towerId ?? ""}
        onChange={(e) => setTowerId(e.target.value || null)}
        className="focus-ring h-9 w-full appearance-none rounded-ctl border border-navy-line bg-navy-hover pl-3 pr-9 text-[12px] font-bold text-nav-text outline-none transition-colors duration-150 hover:border-nav-muted"
      >
        <option value="" className="bg-surface text-ink">All towers</option>
        {towers.map((t) => (
          <option key={t.id} value={t.id} className="bg-surface text-ink">{t.name}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-nav-muted" strokeWidth={2} />
    </label>
  );
}
