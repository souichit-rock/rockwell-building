import { NavLink } from "react-router";
import { cn } from "./cn";

export type TabItem = { label: string; count?: number } & ({ to: string; end?: boolean } | { key: string });

const TAB =
  "focus-ring -mb-px flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-extrabold uppercase tracking-[.08em] transition-colors";
const tabTone = (active: boolean) => (active ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink-soft");

function Count({ n }: { n?: number }) {
  return n == null ? null : <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums text-ink-soft">{n}</span>;
}

/**
 * design-system §4.9. Route mode: items carry `to` (NavLink). Key mode: items carry `key` plus `value` / `onChange`.
 * Never mix the two in one `items` array. Both modes render role="tab" inside role="tablist".
 */
export function Tabs({ items, value, onChange, className }: {
  items: TabItem[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}>
      {items.map((item) =>
        "to" in item ? (
          <NavLink key={item.to} to={item.to} end={item.end} role="tab" className={({ isActive }) => cn(TAB, tabTone(isActive))}>
            {item.label}
            <Count n={item.count} />
          </NavLink>
        ) : (
          <button key={item.key} type="button" role="tab" aria-selected={item.key === value} onClick={() => onChange?.(item.key)} className={cn(TAB, tabTone(item.key === value))}>
            {item.label}
            <Count n={item.count} />
          </button>
        ),
      )}
    </div>
  );
}
