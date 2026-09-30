import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/components/ui";

export interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  /** Sibling path prefixes that keep this item lit (Design standards also owns /finishes and /compliance). */
  also?: string[];
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

// A plain Link with its own active test (instead of NavLink) so `aria-current` is also set when the item is lit through `also`.
export function NavItem({ to, label, icon: Icon, count, also }: NavItemProps) {
  const { pathname } = useLocation();
  const active = (to === "/" ? pathname === "/" : under(pathname, to)) || !!also?.some((p) => under(pathname, p));
  const ref = useRef<HTMLAnchorElement>(null);
  // On a short screen the rail scrolls; keep the lit item in view after a deep link or a palette jump.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex h-10 items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] transition-colors duration-150",
        active ? "bg-gold text-on-gold" : "text-nav-muted hover:bg-navy-hover hover:text-nav-text",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
      {count != null && (
        <span className={cn("ml-auto rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-on-gold/15" : "bg-nav-text/10")}>{count}</span>
      )}
    </Link>
  );
}
