import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

/** design-system §4.12. The last item is always the current page; earlier items without `to` render as plain text. */
export function Breadcrumb({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={`${i}-${item.label}`}>
            {i > 0 && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />}
            {last ? (
              <span aria-current="page" className="text-ink-soft">{item.label}</span>
            ) : item.to ? (
              <Link to={item.to} className="focus-ring relative rounded hover:text-ink after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
