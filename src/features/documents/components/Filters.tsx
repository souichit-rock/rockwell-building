import { Chip, cn, selectClass } from "@/components/ui";

/** Compact toolbar select: the label is for screen readers, `allLabel` is the empty option. */
export function FilterSelect({ label, allLabel, value, onChange, options, className }: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} lg:w-48`}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/** "All" plus one chip per item; clicking the active chip clears it. Scrolls sideways inside its row on a phone. */
export function ChipRow({ label, allCount, value, items, onPick }: {
  label: string;
  allCount: number;
  value: string;
  items: { value: string; label: string; count: number }[];
  onPick: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <Chip label="All" count={allCount} active={value === ""} onClick={() => onPick("")} />
      {items.map((i) => (
        <Chip key={i.value} label={i.label} count={i.count} active={value === i.value} onClick={() => onPick(value === i.value ? "" : i.value)} />
      ))}
    </div>
  );
}

/** Shown while the shared tower scope is what filters the list; clicking it clears the scope. */
export function ScopeChip({ name, onClear }: { name: string; onClear: () => void }) {
  return <Chip label={`Scoped to ${name} · clear`} active onClick={onClear} />;
}
