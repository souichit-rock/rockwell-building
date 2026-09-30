import { initials } from "@/lib/format";
import { cn } from "./cn";

/** design-system §4.15. Stand-in for a brand or vendor logo; never a real third-party mark. */
export function Monogram({ name, size = "md", className }: { name: string; size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-ctl bg-surface-2 font-black tracking-[.04em] text-ink",
        size === "lg" ? "size-14 text-[18px]" : "size-10 text-[13px]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
