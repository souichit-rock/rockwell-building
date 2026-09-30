import { Search } from "lucide-react";
import { inputBox } from "./Field";
import { cn } from "./cn";

/** design-system §4.7. Controlled; `onChange` receives the string, not the event. */
export function SearchInput({ value, onChange, placeholder = "Search", className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{placeholder}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={2} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBox} h-10 pl-9 pr-3`}
      />
    </label>
  );
}
