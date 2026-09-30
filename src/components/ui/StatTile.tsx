import type { ReactNode } from "react";
import { cn } from "./cn";

/** design-system §4.4. Max one gold tile per row. */
export function StatTile({ label, value, delta, tone = "default", className }: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  tone?: "default" | "hot" | "gold";
  className?: string;
}) {
  const gold = tone === "gold";
  return (
    <div className={cn("rounded-card border px-4 py-3.5", gold ? "border-gold bg-gold" : "border-line bg-surface", className)}>
      <p className={cn("text-[10.5px] font-extrabold uppercase tracking-[.11em]", gold ? "text-on-gold" : "text-muted")}>{label}</p>
      <p className={cn("mt-1 text-[28px] font-black leading-[1.1] tracking-[-.03em] tabular-nums", tone === "hot" ? "text-danger" : gold ? "text-on-gold" : "text-ink")}>
        {value}
      </p>
      {delta && <p className={cn("mt-1 text-xs font-medium", gold ? "text-on-gold/80" : "text-muted")}>{delta}</p>}
    </div>
  );
}
