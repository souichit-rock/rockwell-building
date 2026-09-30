import { Link } from "react-router";
import { fmtNumber } from "@/lib/format";
import type { TowerCount } from "../lib";

/**
 * Installed count per tower as inline SVG bars, scaled to the busiest tower. The label and the count are real links (to the registry
 * filtered by `hrefFor`), so the bars are pointer-and-keyboard friendly; the bar itself is decoration with a text alternative.
 */
export function WhereUsedBars({ rows, hrefFor }: { rows: TowerCount[]; hrefFor: (towerId: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1">
      {rows.map(({ tower, count }) => (
        <li key={tower.id} className="grid min-h-10 grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
          <span className="min-w-0 break-words text-[13px] font-semibold leading-snug text-ink">
            <span className="mr-1.5 font-mono text-[12px] font-normal text-muted">{tower.code}</span>
            {tower.name}
          </span>
          <svg role="img" aria-label={`${tower.name}: ${count} installed`} className="h-2.5 w-full">
            <rect width="100%" height="100%" rx="5" className="fill-surface-2" />
            {count > 0 && <rect width={`${(count / max) * 100}%`} height="100%" rx="5" className="fill-ink-soft" />}
          </svg>
          {count > 0 ? (
            <Link
              to={hrefFor(tower.id)}
              aria-label={`${count} at ${tower.name}, open in registry`}
              className="focus-ring rounded py-2 text-right text-[15px] font-black tabular-nums text-ink hover:underline"
            >
              {fmtNumber(count)}
            </Link>
          ) : (
            <span className="text-right text-[15px] font-black tabular-nums text-muted">0</span>
          )}
        </li>
      ))}
    </ul>
  );
}
