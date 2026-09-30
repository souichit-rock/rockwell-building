import type { ReactNode } from "react";
import { cn } from "./cn";

/** design-system §4.15. White card, 1px line border, no shadow. */
export function Card({ title, actions, tight, className, children }: {
  title?: ReactNode;
  actions?: ReactNode;
  tight?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-card border border-line bg-surface", tight ? "p-4" : "p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="type-heading min-w-0 text-ink">{title}</h2> : <span />}
          {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
