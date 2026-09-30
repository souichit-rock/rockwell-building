import { Grid3x3 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, Card, EmptyState, StatTile, cn } from "@/components/ui";
import { complianceMatrix, finishDeviations } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Finish, Id } from "@/data/types";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { complianceTone } from "@/lib/status";
import { ComplianceDrawer, type OpenCell } from "../components/ComplianceDrawer";
import { HeatCell } from "../components/HeatCell";
import { Swatch } from "../components/parts";
import { StandardsHeader } from "../components/StandardsHeader";
import { TowerSelect } from "../components/TowerSelect";
import { HEAT, sentence, sharePct, sumCells, useTowerFilter, type Heat } from "../lib";

const TH = "border-b-[1.5px] border-line bg-surface px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[.11em] text-muted";
const LEGEND: { tone: Heat; label: string }[] = [
  { tone: "ok", label: "95% or more" },
  { tone: "warn", label: "80 to 94%" },
  { tone: "danger", label: "Below 80%" },
  { tone: "neutral", label: "n/a, no governed assets" },
];

/** A finish as its swatch tile plus code; falls back to the bare id if the finish row is gone. */
const FinishChip = ({ finish, fallback }: { finish: Finish | undefined; fallback: Id }) =>
  finish ? (
    <span className="inline-flex items-center gap-1.5">
      <Swatch finish={finish} className="size-5" />
      <span className="font-mono text-[12px] font-bold text-ink">{finish.code}</span>
    </span>
  ) : (
    <span className="font-mono text-[12px] text-muted">{fallback}</span>
  );

export default function Compliance() {
  const { towerId } = useTowerFilter();
  const [open, setOpen] = useState<OpenCell | null>(null);
  const view = useDb((db) => ({
    towers: Object.values(db.towers).filter((t) => !towerId || t.id === towerId),
    standards: Object.values(db.standards).sort(
      (a, b) => (db.disciplines[a.disciplineId]?.order ?? 99) - (db.disciplines[b.disciplineId]?.order ?? 99) || a.code.localeCompare(b.code),
    ),
    cells: complianceMatrix(db),
    finishes: db.finishes,
    finishDeviations: finishDeviations(db, towerId ?? undefined),
  }));

  const ids = new Set(view.towers.map((t) => t.id));
  const cells = view.cells.filter((c) => ids.has(c.towerId));
  const all = sumCells(cells);
  const pct = sharePct(all);
  const towerCells = (towerId: Id) => sumCells(cells.filter((c) => c.towerId === towerId));
  const standardCells = (standardId: Id) => sumCells(cells.filter((c) => c.standardId === standardId));
  const cellOf = (towerId: Id, standardId: Id) => sumCells(cells.filter((c) => c.towerId === towerId && c.standardId === standardId));
  const showTotals = view.towers.length > 1;

  return (
    <>
      <StandardsHeader lede="Where the installed base follows the design standards, tower by tower. Each cell counts compliant and waived assets against every asset a standard governs." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Compliance" value={pct === null ? "n/a" : `${pct}%`} tone="gold" delta={`${fmtNumber(all.compliant + all.waived)} compliant or waived`} />
        <StatTile label="Governed assets" value={fmtNumber(all.total)} delta={`${plural(view.standards.length, "standard")} in force`} />
        <StatTile
          label="Deviations"
          value={fmtNumber(all.deviations)}
          tone={all.deviations > 0 ? "hot" : "default"}
          delta={`${plural(all.phaseOut, "asset")} on phase-out brands`}
        />
        <StatTile label="Finish deviations" value={fmtNumber(view.finishDeviations.length)} delta="Tower overrides that differ from the portfolio" />
      </div>

      <div className="mb-4">
        <TowerSelect />
      </div>

      <div className="space-y-6">
        {view.standards.length === 0 || view.towers.length === 0 ? (
          <EmptyState icon={Grid3x3} title="No compliance data" body="No standards or towers are recorded yet." />
        ) : (
          <Card title="Compliance heatmap">
            <p className="type-small text-muted">Select a cell to list the assets that keep it below 100%, and to raise a waiver or a work order.</p>
            <ul className="mb-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft" aria-label="Legend">
              {LEGEND.map((l) => (
                <li key={l.tone} className="flex items-center gap-2">
                  <span aria-hidden="true" className={cn("inline-block h-4 w-6 rounded", HEAT[l.tone])} />
                  {l.label}
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13px]">
                <caption className="sr-only">Compliance by standard and tower</caption>
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, "sticky left-0 z-10 text-left")}>Standard</th>
                    {view.towers.map((t) => (
                      <th key={t.id} scope="col" className={TH}>
                        <Link to={paths.tower(t.id)} className="focus-ring relative rounded after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-[''] hover:underline">{t.code}</Link>
                        <span className="block text-[10px] font-semibold normal-case tracking-normal">{t.name}</span>
                      </th>
                    ))}
                    {showTotals && <th scope="col" className={TH}>All towers</th>}
                  </tr>
                </thead>
                <tbody>
                  {view.standards.map((s) => (
                    <tr key={s.id}>
                      <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface px-3 py-2 text-left align-middle font-normal md:min-w-56">
                        <Link to={paths.standard(s.id)} className="focus-ring whitespace-nowrap rounded font-mono text-[12px] font-bold text-ink hover:underline">{s.code}</Link>
                        {/* phone: the code alone keeps the sticky column narrow; the title stays available to screen readers */}
                        <span className="sr-only text-xs text-ink-soft md:not-sr-only md:block">{s.title}</span>
                      </th>
                      {view.towers.map((t) => (
                        <td key={t.id} className="border-b border-line p-1.5">
                          <HeatCell
                            totals={cellOf(t.id, s.id)}
                            label={`${s.code}, ${t.name}`}
                            selected={open?.towerId === t.id && open.standardId === s.id}
                            onOpen={() => setOpen({ towerId: t.id, standardId: s.id })}
                          />
                        </td>
                      ))}
                      {showTotals && (
                        <td className="border-b border-line p-1.5">
                          <HeatCell totals={standardCells(s.id)} label={`${s.code}, all towers`} />
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left align-middle text-[11px] font-extrabold uppercase tracking-[.11em] text-ink">
                      All standards
                    </th>
                    {view.towers.map((t) => (
                      <td key={t.id} className="p-1.5">
                        <HeatCell totals={towerCells(t.id)} label={`All standards, ${t.name}`} />
                      </td>
                    ))}
                    {showTotals && (
                      <td className="p-1.5">
                        <HeatCell totals={all} label="All standards, all towers" />
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card title="Finish deviations">
          <p className="type-small mb-4 text-muted">
            Tower finish overrides that differ from the portfolio finish for the same space type and surface. Overrides that match it are not deviations.
          </p>
          {view.towers.length === 0 ? (
            <EmptyState icon={Grid3x3} title="No towers" body="No towers are recorded yet." />
          ) : (
            <ul className="divide-y divide-line">
              {view.towers.map((t) => {
                const rows = view.finishDeviations.filter((d) => d.towerId === t.id);
                return (
                  <li key={t.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start">
                    <div className="flex items-center justify-between gap-3 md:w-64 md:shrink-0 md:flex-col md:items-start">
                      <Link to={paths.tower(t.id)} className="focus-ring rounded text-[14px] font-bold text-ink hover:underline">{t.name}</Link>
                      <Badge tone={complianceTone(rows.length > 0 ? "deviation" : "compliant")}>{rows.length > 0 ? plural(rows.length, "deviation") : "No deviations"}</Badge>
                    </div>
                    <div className="min-w-0 flex-1">
                      {rows.length === 0 ? (
                        <p className="type-small text-muted">Every override in this tower matches the portfolio finish.</p>
                      ) : (
                        <ul className="space-y-2">
                          {rows.map((d) => (
                            <li key={`${d.spaceKind}-${d.surface}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                              <span className="min-w-40 font-semibold text-ink">
                                {sentence(d.spaceKind)} <span className="font-normal text-ink-soft">· {d.surface}</span>
                              </span>
                              <span className="flex flex-wrap items-center gap-2 text-ink-soft">
                                <FinishChip finish={view.finishes[d.portfolioFinishId]} fallback={d.portfolioFinishId} />
                                <span aria-label="replaced by">→</span>
                                <FinishChip finish={view.finishes[d.overrideFinishId]} fallback={d.overrideFinishId} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button to={paths.finishes({ tower: t.id })} variant="ghost" size="sm" className="self-start">Open finishes</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ComplianceDrawer cell={open} onClose={() => setOpen(null)} />
    </>
  );
}
