import { Link } from "react-router";
import { cn } from "./cn";

const DOT = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", info: "bg-info" } as const;

export type TimelineItem = {
  when: string; // already formatted (fmtDate / fmtDateTime)
  what: string;
  note?: string;
  tone?: keyof typeof DOT;
  href?: string;
};

/** design-system §4.14. The dot is gold unless `tone` is set; `href` turns `what` into a Link. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("ml-1 border-l-2 border-line pl-4", className)}>
      {items.map((item, i) => (
        <li key={`${i}-${item.when}`} className="relative pb-4 last:pb-0">
          <span aria-hidden="true" className={cn("absolute -left-[21px] top-1.5 size-[9px] rounded-full border-2 border-surface", item.tone ? DOT[item.tone] : "bg-gold")} />
          <p className="type-eyebrow tracking-[.08em]">{item.when}</p>
          <p className="font-bold text-ink">
            {item.href ? <Link to={item.href} className="focus-ring rounded hover:underline">{item.what}</Link> : item.what}
          </p>
          {item.note && <p className="text-[13.5px] text-ink-soft">{item.note}</p>}
        </li>
      ))}
    </ol>
  );
}
