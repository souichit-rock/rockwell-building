import { cn } from "./cn";

/** design-system §4.8. Wrap a row of these in `flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]`. */
export function Chip({ label, active, count, onClick, className }: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      // relative + ::after grows the 32px chip to a 40px hit area
      className={cn(
        "focus-ring relative inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-xs font-bold transition-colors duration-150 after:absolute after:-inset-[5px] after:content-['']",
        active ? "border-gold bg-gold text-on-gold" : "border-line bg-surface-2 text-ink-soft hover:border-line-strong",
        className,
      )}
    >
      {label}
      {count != null && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  );
}
