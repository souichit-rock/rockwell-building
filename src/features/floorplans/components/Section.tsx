import type { ReactNode } from "react";

/** A titled block for content that brings its own card (DataTable, document cards), so it is not wrapped in a second border. */
export function Section({ title, note, actions, children }: { title: string; note?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="type-heading text-ink">{title}</h2>
        {(note || actions) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {note && <span className="type-small text-muted">{note}</span>}
            {actions}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
