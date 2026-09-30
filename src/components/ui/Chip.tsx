import { useEffect, useRef } from "react";
import { cn } from "./cn";
import { revealInRow } from "./revealInRow";

/** design-system §4.8. Wrap a row of these in `flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]`; an active chip scrolls itself into view in that row. */
export function Chip({ label, active, count, onClick, className }: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // A deep link can select a chip that starts off-screen at 390 px; bring it into view.
  useEffect(() => {
    if (active) revealInRow(ref.current);
  }, [active]);
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      // relative + ::after grows the 32px chip to a 40px hit area. Inset focus ring (not focus-ring): the row scrolls sideways and clips an outer shadow.
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-xs font-bold outline-none transition-colors duration-150 after:absolute after:-inset-[5px] after:content-[''] focus-visible:[box-shadow:inset_0_0_0_2px_rgb(var(--c-text))]",
        active ? "border-gold bg-gold text-on-gold" : "border-line bg-surface-2 text-ink-soft hover:border-line-strong",
        className,
      )}
    >
      {label}
      {count != null && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
