import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { useDb } from "@/data/store";
import type { Id } from "@/data/types";

/**
 * Route-query filter state shared by the vendor and warranty lists. Every filter lives in the query string.
 * Tower: `?tower=` (when it names a known tower) wins over the rail's tower scope; the scope applies only when the query is silent.
 */
export function useQueryFilters() {
  const [params, setParams] = useSearchParams();
  const { towerId: scope, setTowerId } = useTowerScope();
  const towers = useDb((db) => db.towers);
  const raw = params.get("tower") ?? "";
  const fromQuery: Id | null = Object.hasOwn(towers, raw) ? raw : null;

  /** null or "" removes a key. Filter changes replace the history entry; `push` is for real navigation such as opening a claim sheet. */
  const update = (patch: Record<string, string | null>, push = false) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: !push },
    );

  return {
    params,
    get: (key: string): string => params.get(key) ?? "",
    update,
    towerId: fromQuery ?? scope,
    /** True when the tower filter comes from the rail scope alone, which is when the "Scoped to" chip shows. */
    scopeOnly: fromQuery === null && scope !== null,
    /** "" means all towers: drop the query key and, when the rail scope is set, clear it too so the list really shows every tower. */
    setTower: (id: string) => {
      update({ tower: id || null });
      if (!id && scope !== null) setTowerId(null);
    },
    clearScope: () => setTowerId(null),
  };
}

export type Filters = ReturnType<typeof useQueryFilters>;
