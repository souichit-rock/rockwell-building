import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/useTheme";

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;
  const label = dark ? "Light mode" : "Dark mode";
  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={dark}
        onClick={toggle}
        className="focus-ring grid size-10 shrink-0 place-items-center rounded-ctl text-nav-text transition-colors duration-150 hover:bg-navy-hover"
      >
        <Icon className="size-5" strokeWidth={2} />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={toggle}
      className="focus-ring flex h-10 w-full items-center gap-3 rounded-ctl px-3 text-[12px] font-extrabold uppercase tracking-[.08em] text-nav-muted transition-colors duration-150 hover:bg-navy-hover hover:text-nav-text"
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} />
      {label}
    </button>
  );
}
