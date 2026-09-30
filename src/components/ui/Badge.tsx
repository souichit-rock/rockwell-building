import type { ReactNode } from "react";
import type { BadgeTone } from "@/data/types";
import { cn } from "./cn";

// solid-ok uses text-surface (white on light, navy on dark) so it stays readable on the light dark-mode green
const TONES: Record<BadgeTone, string> = {
  ok: "bg-ok-soft text-ok-deep",
  warn: "bg-warn-soft text-warn-deep",
  danger: "bg-danger-soft text-danger-deep",
  info: "bg-info-soft text-info-deep",
  neutral: "bg-surface-2 text-ink-soft",
  gold: "bg-gold-soft text-warn-deep",
  "solid-ok": "bg-ok text-surface",
};

/** design-system §4.6. Children are the enum value with hyphens replaced by spaces; the CSS upper-cases them. */
export function Badge({ tone = "neutral", dot, className, children }: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.09em]", TONES[tone], className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
