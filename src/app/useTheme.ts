import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// The <html data-theme> attribute (set by the boot script in index.html before first paint) is the single source of truth.
// Every useTheme() caller reads it through this tiny store, so the rail toggle, the phone top-bar toggle and the drawer toggle
// can never disagree about the current theme.
const listeners = new Set<() => void>();
const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function toggle() {
  const next: Theme = read() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("rb-theme", next);
  } catch {
    // private window or blocked storage: the theme still switches for this visit
  }
  listeners.forEach((l) => l());
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  return { theme, toggle };
}
// ponytail: system-preference changes apply on next load; add a matchMedia listener if anyone asks.
