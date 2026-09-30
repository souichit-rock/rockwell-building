import { useId } from "react";
import { Chip, selectClass } from "@/components/ui";
import { useDb } from "@/data/store";
import { useTowerFilter } from "../lib";

/** Tower `<select>` bound to the route's ?tower= query, plus the "Scoped to" chip when the tower comes from the shell scope. */
export function TowerSelect({ allLabel = "All towers" }: { allLabel?: string }) {
  const id = useId();
  const { towerId, scoped, setTower } = useTowerFilter();
  const towers = useDb((db) => Object.values(db.towers));
  const name = towers.find((t) => t.id === towerId)?.name;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="sr-only">Tower</label>
      <select id={id} value={towerId ?? ""} onChange={(e) => setTower(e.target.value || null)} className={`${selectClass} w-auto min-w-48`}>
        <option value="">{allLabel}</option>
        {towers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      {scoped && name && <Chip label={`Scoped to ${name} ×`} active onClick={() => setTower(null)} />}
    </div>
  );
}
