import type { ReactNode } from "react";

/** design-system §4.2. `children` is where the page's Tabs go. */
export function PageHeader({ eyebrow, title, lede, actions, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow && <p className="type-eyebrow mb-2">{eyebrow}</p>}
          <h1 className="type-display text-ink">{title}</h1>
          {lede && <p className="type-body mt-2 max-w-[58ch] text-ink-soft">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}
