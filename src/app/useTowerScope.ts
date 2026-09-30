import type { Id } from "@/data/types";
import { setUi, useDb, useUi } from "@/data/store";

const setTowerId = (id: Id | null) => setUi({ towerScope: id });

/** Tower scope shared by the rail select and every list route: `towerId` is null for "All towers" (or when the stored id no longer exists). */
export function useTowerScope(): { towerId: Id | null; setTowerId: (id: Id | null) => void } {
  const { towerScope } = useUi();
  const known = useDb((db) => towerScope !== null && Object.hasOwn(db.towers, towerScope));
  return { towerId: known ? towerScope : null, setTowerId };
}
