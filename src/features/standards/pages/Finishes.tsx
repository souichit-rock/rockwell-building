import { Palette } from "lucide-react";
import { Link } from "react-router";
import { Card, DataTable, EmptyState, Notice, cn, type Column } from "@/components/ui";
import { finishDeviations, finishesFor } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Finish, FinishRow } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { Swatch } from "../components/parts";
import { StandardsHeader } from "../components/StandardsHeader";
import { TowerSelect } from "../components/TowerSelect";
import { SURFACES, sentence, useTowerFilter } from "../lib";

const TH = "border-b-[1.5px] border-line bg-surface px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[.11em] text-muted";

/** One matrix cell: swatch tile plus code. An override gets a gold ring; an override that differs from the portfolio row also gets a danger dot. */
function FinishCell({ row }: { row: FinishRow | undefined }) {
  const finish = row?.override ?? row?.portfolio;
  if (!row || !finish) {
    return (
      <span className="px-2 text-muted">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No finish specified</span>
      </span>
    );
  }
  const title = row.override
    ? `${finish.code} · ${finish.name}. Tower override${row.portfolio ? `; portfolio standard is ${row.portfolio.code} · ${row.portfolio.name}` : ""}.`
    : `${finish.code} · ${finish.name}`;
  return (
    <div title={title} className={cn("relative inline-flex items-center gap-2 rounded-ctl px-2 py-1.5", row.override && "ring-2 ring-gold")}>
      <Swatch finish={finish} />
      <span className="font-mono text-[12px] font-bold text-ink">{finish.code}</span>
      <span className="sr-only">{finish.name}{row.override ? ", tower override" : ""}</span>
      {row.deviates && (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-surface bg-danger">
          <span className="sr-only">Deviates from the portfolio finish</span>
        </span>
      )}
    </div>
  );
}

export default function Finishes() {
  const { towerId } = useTowerFilter();
  const view = useDb((db) => {
    const kinds = [...new Set(Object.values(db.finishSchedule).map((e) => e.spaceKind))];
    // "" matches no tower override, so finishesFor returns the portfolio rows only when no tower is chosen
    const rows = kinds.map((kind) => ({ kind, bySurface: new Map(finishesFor(db, kind, towerId ?? "").map((r) => [r.surface, r])) }));
    return {
      rows,
      finishes: Object.values(db.finishes),
      brands: db.brands,
      vendors: db.vendors,
      tower: towerId ? db.towers[towerId] : undefined,
      deviations: finishDeviations(db, towerId ?? undefined).length,
    };
  });

  const columns = SURFACES.filter((s) => view.rows.some((r) => r.bySurface.has(s)));
  const overrides = view.rows.reduce((n, r) => n + [...r.bySurface.values()].filter((c) => c.override).length, 0);

  const libraryColumns: Column<Finish>[] = [
    { key: "swatch", label: "Swatch", render: (f) => <Swatch finish={f} /> },
    { key: "code", label: "Code", mono: true, sort: (f) => f.code, render: (f) => <span className="font-bold text-ink">{f.code}</span> },
    {
      key: "name", label: "Finish", sort: (f) => f.name,
      render: (f) => (
        <div className="min-w-52">
          <p className="font-semibold text-ink">{f.name}</p>
          <p className="text-xs font-normal text-muted">{f.product}</p>
        </div>
      ),
    },
    { key: "category", label: "Category", sort: (f) => f.category, render: (f) => sentence(f.category) },
    {
      key: "brand", label: "Brand", sort: (f) => (f.brandId ? (view.brands[f.brandId]?.name ?? f.brandId) : ""),
      render: (f) =>
        f.brandId ? <Link to={paths.brand(f.brandId)} className="focus-ring rounded hover:underline">{view.brands[f.brandId]?.name ?? f.brandId}</Link> : <span className="text-muted">—</span>,
    },
    {
      key: "supplier", label: "Supplier", sort: (f) => (f.supplierVendorId ? (view.vendors[f.supplierVendorId]?.name ?? f.supplierVendorId) : ""),
      render: (f) =>
        f.supplierVendorId ? (
          <Link to={paths.vendor(f.supplierVendorId)} className="focus-ring rounded hover:underline">{view.vendors[f.supplierVendorId]?.name ?? f.supplierVendorId}</Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <>
      <StandardsHeader lede="The finish schedule: which finish goes on which surface of every space type. Pick a tower to overlay its overrides on the portfolio standard." />

      <div className="mb-4">
        <TowerSelect allLabel="Portfolio standard" />
      </div>

      <div className="space-y-6">
        {view.tower && (
          <Notice tone="info">
            {view.tower.name}: {plural(overrides, "override")}, {view.deviations} deviating from the portfolio finish.
          </Notice>
        )}

        {view.rows.length === 0 ? (
          <EmptyState icon={Palette} title="No finish schedule" body="No finishes are scheduled against space types yet." />
        ) : (
          <Card title="Finish matrix">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, "sticky left-0 z-10")}>Space type</th>
                    {columns.map((s) => (
                      <th key={s} scope="col" className={TH}>{sentence(s)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((r) => (
                    <tr key={r.kind} className="group">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap border-b border-line bg-surface px-3 py-2 text-left font-semibold text-ink transition-colors duration-150 group-last:border-b-0 group-hover:bg-surface-2"
                      >
                        {sentence(r.kind)}
                      </th>
                      {columns.map((s) => (
                        <td key={s} className="border-b border-line px-3 py-2 transition-colors duration-150 group-last:border-b-0 group-hover:bg-surface-2">
                          <FinishCell row={r.bySurface.get(s)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-xs font-semibold text-ink-soft" aria-label="Legend">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block size-6 rounded border border-line-strong bg-surface-2" />
                Swatch and finish code; hover for the name
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-6 w-10 rounded-ctl ring-2 ring-gold" />
                Tower override
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-danger" />
                Differs from the portfolio finish
              </li>
            </ul>
          </Card>
        )}

        <section className="space-y-3">
          <div>
            <h2 className="type-heading text-ink">Finish library</h2>
            <p className="type-small mt-1 text-muted">{plural(view.finishes.length, "finish", "finishes")} on file. Read-only in this phase.</p>
          </div>
          <DataTable columns={libraryColumns} rows={view.finishes} rowKey={(f) => f.id} />
        </section>
      </div>
    </>
  );
}
