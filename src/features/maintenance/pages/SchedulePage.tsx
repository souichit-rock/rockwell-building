import { CalendarX, Download } from "lucide-react";
import { useMemo } from "react";
import { Button, Chip, EmptyState, StatTile } from "@/components/ui";
import { useDb } from "@/data/store";
import { downloadCsv } from "@/lib/csv";
import { monthGrid, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { CalendarView } from "../components/CalendarView";
import { FilterSelect, useQueryParams, useTowerFilter } from "../components/filters";
import { MaintenanceHeader } from "../components/MaintenanceHeader";
import { PlanTable } from "../components/PlanTable";
import { dueNote, filterPlans, isMonth, monthLabel, pick, PLAN_CSV, planRows, scheduleKpis } from "../lib";

/** PM schedule (spec 6.8): KPI row, List / Calendar toggle, filters in the route query, CSV of what is on screen. */
export default function SchedulePage() {
  const db = useDb((d) => d);
  const { get, set } = useQueryParams();
  const { towerId, queryTower, scopedTower, setTower, clearScope } = useTowerFilter();
  const today = todayISO();

  const view = get("view") === "calendar" ? "calendar" : "list";
  const rawMonth = get("month");
  const month = isMonth(rawMonth) ? rawMonth : undefined;
  const discipline = pick(db.disciplines, get("discipline"))?.id;
  const regulatory = get("regulatory") === "1";

  const all = useMemo(() => planRows(db, today), [db, today]);
  const teams = useMemo(() => [...new Set(all.map((r) => r.plan.assigneeTeam))].sort(), [all]);
  const team = teams.find((t) => t === get("team"));

  // every filter but the month; the KPI row, the list and the calendar all read these same rows
  const rows = filterPlans(all, { tower: towerId, discipline, team, regulatory });
  const listRows = month ? filterPlans(rows, { month }) : rows;
  const visibleMonth = monthGrid(month ?? "").month;
  const exportRows = view === "calendar" ? filterPlans(rows, { month: visibleMonth }) : listRows;
  const kpis = scheduleKpis(rows, today);
  const oldest = rows.find((r) => r.status === "overdue");

  const towers = Object.values(db.towers).sort((a, b) => a.name.localeCompare(b.name));
  const disciplines = Object.values(db.disciplines).sort((a, b) => a.order - b.order);
  const anyFilter = Boolean(queryTower || discipline || team || regulatory || month);
  const clearFilters = () => {
    set({ tower: null, discipline: null, team: null, regulatory: null, month: null });
    clearScope();
  };

  return (
    <div>
      <MaintenanceHeader
        tower={queryTower}
        actions={
          <Button variant="ghost" disabled={exportRows.length === 0} onClick={() => downloadCsv("pm-schedule", PLAN_CSV, exportRows)}>
            <Download aria-hidden="true" className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Overdue" tone={kpis.overdue > 0 ? "hot" : "default"} value={fmtNumber(kpis.overdue)}
            delta={oldest ? `Oldest ${dueNote(oldest.plan.nextDue, today)}` : "Nothing overdue"}
          />
          <StatTile label="Due in 14 days" value={fmtNumber(kpis.due)} delta="Not yet overdue" />
          <StatTile label="Due this month" tone="gold" value={fmtNumber(kpis.thisMonth)} delta={monthLabel(today.slice(0, 7))} />
          <StatTile
            label="Regulatory due" value={fmtNumber(kpis.regulatoryDue)}
            delta={`of ${plural(kpis.regulatoryTotal, "regulatory plan")}`}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="View" className="flex gap-2">
              <Chip label="List" active={view === "list"} onClick={() => set({ view: null })} />
              <Chip label="Calendar" active={view === "calendar"} onClick={() => set({ view: "calendar" })} />
            </div>
            <FilterSelect
              label="Tower" value={towerId ?? ""} onChange={setTower} allLabel="All towers"
              options={towers.map((t) => ({ value: t.id, label: t.name }))} className="sm:w-44"
            />
            <FilterSelect
              label="Discipline" value={discipline ?? ""} onChange={(v) => set({ discipline: v })} allLabel="All disciplines"
              options={disciplines.map((d) => ({ value: d.id, label: d.name }))} className="sm:w-44"
            />
            <FilterSelect
              label="Team" value={team ?? ""} onChange={(v) => set({ team: v })} allLabel="All teams"
              options={teams.map((t) => ({ value: t, label: t }))} className="sm:w-44"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Regulatory only" active={regulatory} onClick={() => set({ regulatory: regulatory ? null : "1" })} />
            {scopedTower && <Chip label={`Scoped to ${scopedTower.name} ×`} active onClick={clearScope} />}
            {month && view === "list" && <Chip label={`Due in ${monthLabel(month)} ×`} active onClick={() => set({ month: null })} />}
            {anyFilter && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            {view === "list" && (
              <p className="type-small ml-auto text-muted" aria-live="polite">{plural(listRows.length, "plan")}</p>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No PM plans match"
            body="Try removing a filter or widening the tower scope."
            action={anyFilter || scopedTower ? <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
          />
        ) : view === "calendar" ? (
          <CalendarView rows={rows} month={month} onMonth={(m) => set({ month: m })} />
        ) : (
          <PlanTable rows={listRows} />
        )}
      </div>
    </div>
  );
}
