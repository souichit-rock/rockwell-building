import type { ReactNode } from "react";
import { cn } from "./cn";

const TONES = {
  ok: "bg-ok-soft text-ok-deep",
  warn: "bg-warn-soft text-warn-deep",
  danger: "bg-danger-soft text-danger-deep",
  info: "bg-info-soft text-info-deep",
} as const;

/** design-system §4.15. Inline confirmation or warning; there is no toast system this phase. */
export function Notice({ tone, className, children }: { tone: keyof typeof TONES; className?: string; children: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-ctl px-4 py-3 text-sm font-semibold", TONES[tone], className)}>
      {children}
    </div>
  );
}
