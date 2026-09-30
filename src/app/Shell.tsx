import {
  Boxes, Building2, CalendarClock, ClipboardList, Files, LayoutDashboard, Menu, Ruler, ShieldCheck, Tags, Truck, X,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { CommandPalette } from "@/app/CommandPalette";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Brand } from "@/app/shell/Brand";
import { NavGroup, type NavGroupProps } from "@/app/shell/NavGroup";
import { ResetDemo } from "@/app/shell/ResetDemo";
import { SearchTrigger } from "@/app/shell/SearchTrigger";
import { ThemeToggle } from "@/app/shell/ThemeToggle";
import { TowerScopeSelect } from "@/app/shell/TowerScopeSelect";
import { useTowerScope } from "@/app/useTowerScope";
import { Loading } from "@/components/ui";
import { useDb } from "@/data/store";
import { dueStatus, openWorkOrders } from "@/data/selectors";
import { todayISO } from "@/lib/dates";
import { paths } from "@/lib/paths";

const FOOTER = "Sample data for demonstration · Rockwell Building · Souichi Takahama, Innovation Engineer";

/** Rail markup shared by the desktop aside and the phone drawer. Pills exist only on Work orders and Maintenance, and only when non-zero. */
function RailBody({ onSearch, woCount, pmCount }: { onSearch: () => void; woCount: number; pmCount: number }) {
  const groups: NavGroupProps[] = [
    {
      label: "OVERVIEW",
      items: [
        { to: paths.home(), label: "Dashboard", icon: LayoutDashboard },
        { to: paths.towers(), label: "Towers", icon: Building2, also: ["/spaces"] },
      ],
    },
    {
      label: "REGISTRY",
      items: [
        { to: paths.assets(), label: "Assets", icon: Boxes, also: ["/a"] },
        { to: paths.standards(), label: "Design standards", icon: Ruler, also: ["/finishes", "/compliance"] },
        { to: paths.catalogue(), label: "Brands & models", icon: Tags },
        { to: paths.documents(), label: "Documents", icon: Files, also: ["/permits"] },
      ],
    },
    {
      label: "FACILITIES",
      items: [
        { to: paths.workOrders(), label: "Work orders", icon: ClipboardList, count: woCount || undefined },
        { to: paths.maintenance(), label: "Maintenance", icon: CalendarClock, count: pmCount || undefined, also: ["/inspections"] },
        { to: paths.warranties(), label: "Warranties", icon: ShieldCheck },
        { to: paths.vendors(), label: "Vendors", icon: Truck },
      ],
    },
  ];
  return (
    <>
      <div className="space-y-2 border-b border-navy-line p-3">
        <TowerScopeSelect />
        <SearchTrigger onClick={onSearch} />
      </div>
      <nav
        aria-label="Primary"
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-color:var(--color-navy-line)_transparent] [scrollbar-width:thin]"
      >
        {groups.map((g) => (
          <NavGroup key={g.label} {...g} />
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-navy-line p-3">
        <ThemeToggle />
        <ResetDemo />
      </div>
    </>
  );
}

export function Shell() {
  const { pathname } = useLocation();
  const { towerId } = useTowerScope();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  // Rail pills follow the tower scope so they match what the scoped lists show.
  const woCount = useDb((db) => openWorkOrders(db, { towerId: towerId ?? undefined }).filter((w) => w.status !== "on-hold").length);
  const pmCount = useDb((db) => {
    const today = todayISO();
    return Object.values(db.pmPlans).filter(
      (p) => dueStatus(p.nextDue, today) === "overdue" && (!towerId || db.assets[p.assetId]?.towerId === towerId),
    ).length;
  });

  // One overlay at a time: opening the palette closes the drawer.
  const changePalette = useCallback((open: boolean) => {
    if (open) setDrawerOpen(false);
    setPaletteOpen(open);
  }, []);
  const openPalette = useCallback(() => changePalette(true), [changePalette]);

  useLayoutEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);

  // Route change: close the drawer and start the new page at the top (BrowserRouter does not restore scroll on its own).
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // A drawer left open across the lg breakpoint (rotate, resize) would keep the page inert behind an invisible dialog.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const rail = <RailBody onSearch={openPalette} woCount={woCount} pmCount={pmCount} />;

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-gold focus:px-4 focus:py-2 focus:text-on-gold"
      >
        Skip to content
      </a>

      {/* rail: desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-navy-line bg-navy text-nav-text lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-navy-line px-4">
          <Brand />
        </div>
        {rail}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar: phone */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-navy px-4 pt-[env(safe-area-inset-top)] lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="focus-ring grid size-10 shrink-0 place-items-center rounded-ctl text-nav-text transition-colors duration-150 hover:bg-navy-hover"
          >
            <Menu className="size-5" strokeWidth={2} />
          </button>
          <Brand />
          <span className="flex-1" />
          <SearchTrigger iconOnly onClick={openPalette} />
          <ThemeToggle iconOnly />
        </header>

        {/* phone drawer: the same rail markup in a native dialog */}
        <dialog
          ref={drawerRef}
          aria-label="Menu"
          // Escape: let state close the dialog (the layout effect above) so React and the DOM cannot disagree; onClose covers any other native close.
          onCancel={(e) => {
            e.preventDefault();
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
          onClick={(e) => {
            // scrim, or any link in the drawer: tapping the page you are already on changes no pathname, so the route effect would not close it
            if (e.target === e.currentTarget || (e.target as Element).closest("a")) setDrawerOpen(false);
          }}
          className="m-0 mr-auto h-dvh max-h-dvh w-[280px] max-w-[85vw] flex-col border-r border-navy-line bg-navy p-0 text-nav-text shadow-pop transition-transform duration-200 backdrop:bg-navy-deep/60 open:flex starting:open:-translate-x-full"
        >
          {drawerOpen && (
            <>
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-navy-line px-4">
                <Brand />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                  className="focus-ring grid size-10 shrink-0 place-items-center rounded-ctl text-nav-text transition-colors duration-150 hover:bg-navy-hover"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
              </div>
              {rail}
            </>
          )}
        </dialog>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 p-4 outline-none lg:p-6">
          {/* the boundary sits inside the layout, so a crashing page leaves the rail, Reset demo and the theme toggle usable */}
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="border-t border-line px-4 py-5 text-center text-xs text-muted">{FOOTER}</footer>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={changePalette} />
    </div>
  );
}

export default Shell;
