import { Search } from "lucide-react";

// ⌘ on Apple platforms, Ctrl elsewhere. Only the hint text depends on it; the palette listens for both keys.
const isApple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function SearchTrigger({ onClick, iconOnly = false }: { onClick: () => void; iconOnly?: boolean }) {
  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={onClick}
        className="focus-ring grid size-10 shrink-0 place-items-center rounded-ctl text-nav-text transition-colors duration-150 hover:bg-navy-hover"
      >
        <Search className="size-5" strokeWidth={2} />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={onClick}
      className="focus-ring flex h-10 w-full items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-nav-muted transition-colors duration-150 hover:bg-navy-hover hover:text-nav-text"
    >
      <Search className="size-[18px] shrink-0" strokeWidth={2} />
      <span>Search</span>
      <kbd className="ml-auto hidden font-sans text-[10px] font-bold opacity-70 lg:inline">{isApple ? "⌘ K" : "Ctrl K"}</kbd>
    </button>
  );
}
