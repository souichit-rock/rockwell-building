import { ClipboardX, Download, Plus } from "lucide-react";
import { useMemo } from "react";
import { Button, Chip, EmptyState, StatTile } from "@/components/ui";
import { useDb } from "@/data/store";
import type { InspectionResult } from "@/data/types";
import { downloadCsv } from "@/lib/csv";
import { daysUntil, todayISO } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { FilterSelect, useQueryParams, useTowerFilter } from "../components/filters";
import { InspectionTable } from "../components/InspectionTable";
import { MaintenanceHeader } from "../components/MaintenanceHeader";
import {
  filterInspections, INSPECTION_CSV, INSPECTION_TYPE_LABEL, INSPECTION_TYPES, inspectionRows, pick, RESULT_LABEL, RESULTS,
} from "../lib";

/** Inspection log (spec 6.8): every visit, test and survey, newest first. Filters live in the route query. */
export default function InspectionsPage() {
  const db = useDb((d) => d);
  const { get, set } = useQueryParams();
  const { towerId: filterTower, queryTower, scopedTower: scoped, setTower, clearScope } = useTowerFilter();
  const today = todayISO();

  const type = INSPECTION_TYPES.find((t) => t === get("type"));
  const result = RESULTS.find((r) => r === get("result"));
  const assetId = get("assetId");
  const asset = pick(db.assets, assetId);
  // ?assetId= is link-only and can name an asset outside the rail scope, so it wins over the ambient scope (an explicit ?tower= still applies)
  const towerId = assetId && scoped ? undefined : filterTower;
  const scopedTower = assetId ? undefined : scoped;

  const all = useMemo(() => inspectionRows(db), [db]);
  const towers = Object.values(db.towers).sort((a, b) => a.name.localeCompare(b.name));
  // the result chips count against every other filter, so they stay honest while one is selected
  const base = filterInspections(all, { tower: towerId, type, assetId });
  const rows = result ? filterInspections(base, { result }) : base;
  const count = (r: InspectionResult) => base.filter((x) => x.log.result === r).length;
  const recent = base.filter((r) => daysUntil(r.log.date, today) >= -30).length;
  const anyFilter = Boolean(queryTower || type || result || assetId);
  const clearFilters = () => {
    set({ tower: null, type: null, result: null, assetId: null });
    clearScope();
  };

  return (
    <div>
      <MaintenanceHeader
        tower={queryTower}
        actions={
          <>
            <Button variant="ghost" disabled={rows.length === 0} onClick={() => downloadCsv("inspections", INSPECTION_CSV, rows)}>
              <Download aria-hidden="true" className="size-4" strokeWidth={2} />
              Export CSV
            </Button>
            <Button to={paths.newInspection(assetId && asset ? { assetId } : undefined)} variant="primary">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
              Log inspection
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Visits logged" tone="gold" value={fmtNumber(base.length)} delta={towerId ? db.towers[towerId]?.name : "All towers"} />
          <StatTile label="Last 30 days" value={fmtNumber(recent)} delta="Visits, tests and surveys" />
          <StatTile label="Failed" tone={count("fail") > 0 ? "hot" : "default"} value={fmtNumber(count("fail"))} delta="Result: fail" />
          <StatTile label="With findings" value={fmtNumber(count("pass-with-findings"))} delta="Passed, follow-up noted" />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Tower" value={towerId ?? ""} onChange={setTower} allLabel="All towers"
              options={towers.map((t) => ({ value: t.id, label: t.name }))} className="sm:w-44"
            />
            <FilterSelect
              label="Type" value={type ?? ""} onChange={(v) => set({ type: v })} allLabel="All types"
              options={INSPECTION_TYPES.map((t) => ({ value: t, label: INSPECTION_TYPE_LABEL[t] }))} className="sm:w-44"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Result" className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {RESULTS.map((r) => (
                <Chip key={r} label={RESULT_LABEL[r]} count={count(r)} active={result === r} onClick={() => set({ result: result === r ? null : r })} />
              ))}
            </div>
            {assetId && <Chip label={`Asset: ${asset?.tag ?? assetId} ×`} active onClick={() => set({ assetId: null })} />}
            {scopedTower && <Chip label={`Scoped to ${scopedTower.name} ×`} active onClick={clearScope} />}
            {anyFilter && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            <p className="type-small ml-auto text-muted" aria-live="polite">{plural(rows.length, "inspection")}</p>
          </div>
        </div>

        {all.length === 0 ? (
          <EmptyState
            icon={ClipboardX}
            title="No inspections logged"
            body="Visits, tests and surveys appear here once they are recorded."
            action={<Button to={paths.newInspection()} variant="ghost" size="sm">Log inspection</Button>}
          />
        ) : (
          <InspectionTable rows={rows} />
        )}
      </div>
    </div>
  );
}
