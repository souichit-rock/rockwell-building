import type { ReactNode } from "react";
import { cn } from "./cn";

/** design-system §4.15. Detail specs. `mono` is for serials, model numbers and tags. */
export function KV({ items, className }: { items: { k: string; v: ReactNode; mono?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5", className)}>
      {items.map((item) => (
        <div key={item.k} className="contents">
          <dt className="pt-0.5 text-[10.5px] font-extrabold uppercase tracking-[.11em] text-muted">{item.k}</dt>
          <dd className={cn("m-0 min-w-0 break-words font-semibold text-ink", item.mono && "font-mono text-[12px]")}>{item.v}</dd>
        </div>
      ))}
    </dl>
  );
}
