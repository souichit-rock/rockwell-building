import type { ReactNode } from "react";

/** A titled block with no card of its own, for DataTables (which draw their own border). */
export function Section({ title, count, actions, children }: {
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="type-heading text-ink">
          {title}
          {count != null && <span className="ml-2 tabular-nums text-muted">{count}</span>}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
