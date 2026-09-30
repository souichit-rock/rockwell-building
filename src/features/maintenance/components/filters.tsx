import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { cn, selectClass } from "@/components/ui";
import { useTowerScope } from "@/app/useTowerScope";
import { useDb } from "@/data/store";
import type { Id, Tower } from "@/data/types";
import { pick } from "../lib";

export type SetParams = (patch: Record<string, string | null | undefined>) => void;

/** Filter state lives in the route query. Empty values drop the key; edits replace the history entry so Back leaves the page. */
export function useQueryParams(): { get: (key: string) => string | undefined; set: SetParams } {
  const [params, setParams] = useSearchParams();
  const set = useCallback<SetParams>(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { get: (key) => params.get(key) || undefined, set };
}

/**
 * The tower filter: the page's own ?tower= wins over the rail's tower scope. "?tower=all" is the explicit "All towers" choice made
 * on this page while a scope is set (an empty value would just drop the key and fall back to the scope).
 */
export function useTowerFilter(): {
  towerId: Id | undefined;
  /** the raw ?tower= value, for links that should keep it */
  queryTower: string | undefined;
  /** the scoped tower when it is the scope (not the query) that filters this page */
  scopedTower: Tower | undefined;
  setTower: (id: string) => void;
  clearScope: () => void;
} {
  const { get, set } = useQueryParams();
  const { towerId: scope, setTowerId } = useTowerScope();
  const towers = useDb((db) => db.towers);
  const raw = get("tower");
  const queried = raw === "all" ? null : pick(towers, raw)?.id;
  const towerId = queried === undefined ? (scope ?? undefined) : (queried ?? undefined);
  return {
    towerId,
    queryTower: raw,
    scopedTower: queried === undefined && scope ? pick(towers, scope) : undefined,
    setTower: (id) => set({ tower: id || (scope ? "all" : null) }),
    clearScope: () => setTowerId(null),
  };
}

/** A native select in the shared input recipe with an "all" first option; `label` is its accessible name. */
export function FilterSelect({ label, value, onChange, allLabel, options, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectClass, "min-w-0 sm:w-auto", className)}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
