import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { fmtNumber } from "@/lib/format";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { cn } from "./cn";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;       // default: String(row[key])
  sort?: (row: T) => string | number;   // present = the header is a sort button
  align?: "left" | "right";
  mono?: boolean;
};

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const compare = (a: string | number, b: string | number) =>
  typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));

/**
 * design-system §4.5. Owns sorting (click a sortable header: ascending, then descending) and pagination (`pageSize`
 * rows per page, footer only when there is more than one page). Features never re-implement either.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, pageSize = 50, maxHeight = "70vh", empty }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  maxHeight?: string;
  empty?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [seenRows, setSeenRows] = useState(rows.length);
  const scroller = useRef<HTMLDivElement>(null);

  // a different result count means the filters changed, so go back to the first page
  if (seenRows !== rows.length) {
    setSeenRows(rows.length);
    setPage(0);
  }

  if (rows.length === 0) return <>{empty ?? <EmptyState icon={Inbox} title="No results" body="Nothing matches these filters." />}</>;

  const sortCol = sort ? columns.find((c) => c.key === sort.key) : undefined;
  const by = sortCol?.sort;
  const ordered = sort && by ? [...rows].sort((a, b) => sort.dir * compare(by(a), by(b))) : rows;

  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const start = current * pageSize;
  const visible = ordered.slice(start, start + pageSize);
  const emphasis = columns.findIndex((c) => !c.mono); // first non-mono column reads as the row's name

  const toggle = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(0);
  };
  const goTo = (p: number) => {
    setPage(p);
    scroller.current?.scrollTo({ top: 0 });
  };

  // a click on a link or control inside the row belongs to that control, not to the row
  const rowClick = (e: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!(e.target as Element).closest("a, button, input, select, textarea, label")) onRowClick?.(row);
  };
  const rowKeys = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onRowClick?.(row);
    }
  };
  const display = (row: T, key: string) => {
    // ponytail: the default renderer reads row[key] by name; T is unconstrained, hence the double assertion
    const v = (row as unknown as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div ref={scroller} className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const SortIcon = active ? (sort.dir === 1 ? ChevronUp : ChevronDown) : ChevronsUpDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : col.sort ? "none" : undefined}
                    className={cn(
                      "sticky top-0 z-10 whitespace-nowrap border-b-[1.5px] border-line bg-surface px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted",
                      col.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {col.sort ? (
                      <button type="button" onClick={() => toggle(col.key)} className={cn("focus-ring relative inline-flex items-center gap-1 rounded uppercase after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']", active && "text-ink")}>
                        {col.label}
                        <SortIcon aria-hidden="true" className={cn("size-3", !active && "opacity-50")} strokeWidth={2} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? (e) => rowClick(e, row) : undefined}
                onKeyDown={onRowClick ? (e) => rowKeys(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "group transition-colors duration-150 hover:bg-surface-2",
                  onRowClick && "cursor-pointer outline-none focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
                )}
              >
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      "border-b border-line px-3 py-2.75 align-top group-last:border-b-0",
                      col.mono ? "font-mono text-[12px] text-ink-soft" : i === emphasis && "font-semibold text-ink",
                      col.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {col.render ? col.render(row) : display(row, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ordered.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
          <span aria-live="polite">
            Showing {fmtNumber(start + 1)}–{fmtNumber(start + visible.length)} of {fmtNumber(ordered.length)}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={current === 0} onClick={() => goTo(current - 1)}>Prev</Button>
            <Button variant="ghost" size="sm" disabled={current >= pages - 1} onClick={() => goTo(current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
