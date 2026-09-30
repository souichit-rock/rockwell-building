// Feature-only derived values for standards, finishes and compliance. Every compliance number still comes from
// complianceFor / complianceMatrix / finishDeviations; this file only sums, sorts and labels what they return.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import { complianceFor, standardFor } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { ApprovalTier, Asset, Compliance, ComplianceCell, ComplianceStatus, Db, Id, ISODate, Surface, Waiver } from "@/data/types";

export const TIERS = ["preferred", "acceptable", "phase-out", "prohibited"] as const satisfies readonly ApprovalTier[];
export const SURFACES = ["floor", "wall", "ceiling", "door", "hardware", "paint", "sanitary", "lighting"] as const satisfies readonly Surface[];

/** "lift-lobby" -> "lift lobby". Badge children use this; the Badge upper-cases it. */
export const words = (s: string): string => s.replace(/-/g, " ");
/** "lift-lobby" -> "Lift lobby". For user-facing names that stay normal-case. */
export const sentence = (s: string): string => {
  const t = words(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// --- Tower filter -----------------------------------------------------------------------------------------------------------------

/**
 * The tower a list route filters by: its own `?tower=` when it names a real tower (query wins), else the shell's tower scope.
 * `scoped` is true when the tower comes from the shell scope, so the page can offer the "Scoped to" chip.
 * `setTower(null)` clears both the query and the scope (the query cannot express "all towers" while a scope is set).
 */
export function useTowerFilter() {
  const [sp, setSp] = useSearchParams();
  const scope = useTowerScope();
  const towers = useDb((db) => db.towers);
  const asked = sp.get("tower");
  const fromQuery = asked !== null && Object.hasOwn(towers, asked) ? asked : null;
  const towerId: Id | null = fromQuery ?? scope.towerId;
  const setTower = (id: Id | null) => {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("tower", id);
        else next.delete("tower");
        return next;
      },
      { replace: true },
    );
    if (id === null) scope.setTowerId(null);
  };
  return { towerId, scoped: fromQuery === null && scope.towerId !== null, setTower };
}

/**
 * A text filter that lives in the route query. Router updates are React transitions, so an input bound straight to the URL drops
 * keystrokes; the input reads a local draft that is written to the query (replace, no history spam) once typing pauses. A change
 * the box did not make (Clear scope, the back button) is adopted back into the draft.
 */
export function useQueryText(key: string, delay = 200): [string, (value: string) => void] {
  const [sp, setSp] = useSearchParams();
  const url = sp.get(key) ?? "";
  const [draft, setDraft] = useState(url);
  const pushed = useRef(url);

  useEffect(() => {
    if (url !== pushed.current) {
      pushed.current = url;
      setDraft(url);
    }
  }, [url]);

  useEffect(() => {
    if (draft === pushed.current) return;
    const timer = setTimeout(() => {
      pushed.current = draft;
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (draft) next.set(key, draft);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, key, delay, setSp]);

  return [draft, setDraft];
}

// --- Compliance sums and heat -----------------------------------------------------------------------------------------------------

export interface Totals { total: number; compliant: number; waived: number; phaseOut: number; deviations: number }

export function sumCells(cells: ComplianceCell[]): Totals {
  const t: Totals = { total: 0, compliant: 0, waived: 0, phaseOut: 0, deviations: 0 };
  for (const c of cells) {
    t.total += c.total;
    t.compliant += c.compliant;
    t.waived += c.waived;
    t.phaseOut += c.phaseOut;
    t.deviations += c.deviations;
  }
  return t;
}

/** (compliant + waived) / assets with a governing standard, whole percent. `null` when no asset is governed (n/a). */
export const sharePct = (t: Pick<Totals, "total" | "compliant" | "waived">): number | null =>
  t.total === 0 ? null : Math.round(((t.compliant + t.waived) / t.total) * 100);

export type Heat = "ok" | "warn" | "danger" | "neutral";
/** Spec 6.5: ok at 95 and above, warn at 80 and above, danger below 80, neutral for n/a. Uses the displayed whole percent. */
export const heatTone = (pct: number | null): Heat => (pct === null ? "neutral" : pct >= 95 ? "ok" : pct >= 80 ? "warn" : "danger");
// The same soft / deep token pairs the Badge uses for these tones, applied to a whole heatmap cell.
export const HEAT: Record<Heat, string> = {
  ok: "bg-ok-soft text-ok-deep",
  warn: "bg-warn-soft text-warn-deep",
  danger: "bg-danger-soft text-danger-deep",
  neutral: "bg-surface-2 text-ink-soft",
};

// --- Assets under a standard ------------------------------------------------------------------------------------------------------

export interface Governed { asset: Asset; c: Compliance }

const SEVERITY: Record<ComplianceStatus, number> = { deviation: 0, "phase-out": 1, waived: 2, "no-standard": 3, compliant: 4 };
export const severity = (s: ComplianceStatus): number => SEVERITY[s];

/** Assets whose governing standard (standardFor) is `standardId`, worst first, then by tag. Optionally one tower. */
export function governedAssets(db: Db, standardId: Id, towerId?: Id | null): Governed[] {
  const out: Governed[] = [];
  for (const asset of Object.values(db.assets)) {
    if ((towerId && asset.towerId !== towerId) || standardFor(db, asset)?.id !== standardId) continue;
    out.push({ asset, c: complianceFor(db, asset) });
  }
  return out.sort((a, b) => SEVERITY[a.c.status] - SEVERITY[b.c.status] || a.asset.tag.localeCompare(b.asset.tag));
}

/** Direct lookups (no throw): tower, floor and room of an asset. */
export const placeOf = (db: Db, a: Asset) => ({ tower: db.towers[a.towerId], floor: db.floors[a.floorId], space: db.spaces[a.spaceId] });

export const waiverActive = (w: Waiver, today: ISODate): boolean => !w.expiresAt || w.expiresAt >= today;
