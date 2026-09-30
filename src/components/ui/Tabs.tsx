import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import { cn } from "./cn";
import { revealInRow } from "./revealInRow";

export type TabItem = { label: string; count?: number } & ({ to: string; end?: boolean } | { key: string });

// Inset focus ring, not the shared outer one: the row scrolls sideways, and an outer shadow is clipped on the first and last tab.
const TAB =
  "-mb-px flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-extrabold uppercase tracking-[.08em] outline-none transition-colors focus-visible:[box-shadow:inset_0_0_0_2px_rgb(var(--c-text))]";
const tabTone = (active: boolean) => (active ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink-soft");

function Count({ n }: { n?: number }) {
  return n == null ? null : <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums text-ink-soft">{n}</span>;
}

/**
 * design-system §4.9. Route mode: items carry `to` (NavLink); rendered as a navigation landmark of links, the active one carries
 * aria-current="page". Key mode: items carry `key` plus `value` / `onChange`; rendered as role="tablist" of role="tab" buttons.
 * Never mix the two in one `items` array. Either way the active item is scrolled into view when it changes or on mount.
 */
export function Tabs({ items, value, onChange, className, label = "Sections" }: {
  items: TabItem[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
  /** Accessible name of the navigation landmark (route mode only). */
  label?: string;
}) {
  const { pathname, search } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const route = items.some((item) => "to" in item);

  // A deep link can select a tab that starts off-screen at 390 px; bring it into view.
  useEffect(() => {
    revealInRow(ref.current?.querySelector('[aria-selected="true"], [aria-current="page"]'));
  }, [value, pathname, search]);

  return (
    <div
      ref={ref}
      role={route ? "navigation" : "tablist"}
      aria-label={route ? label : undefined}
      className={cn("flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}
    >
      {items.map((item) =>
        "to" in item ? (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn(TAB, tabTone(isActive))}>
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
