import { Ruler } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Badge, DataTable, EmptyState, SearchInput, StatTile, type Column } from "@/components/ui";
import { complianceMatrix } from "@/data/selectors";
import { useDb } from "@/data/store";
import type { Standard } from "@/data/types";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { tierTone } from "@/lib/status";
import { AdoptionBar, BrandChip } from "../components/parts";
import { StandardsHeader } from "../components/StandardsHeader";
import { TowerSelect } from "../components/TowerSelect";
import { TIERS, sharePct, sumCells, useQueryText, useTowerFilter, words } from "../lib";

export default function StandardsList() {
  const navigate = useNavigate();
  const { towerId } = useTowerFilter();
  const [q, setQ] = useQueryText("q");
  const { standards, disciplines, brands, cells } = useDb((db) => ({
    standards: Object.values(db.standards),
    disciplines: Object.values(db.disciplines).sort((a, b) => a.order - b.order),
    brands: db.brands,
    cells: complianceMatrix(db),
  }));

  const needle = q.trim().toLowerCase();
  const visible = standards.filter(
    (s) =>
      (!towerId || s.appliesToTowerIds.length === 0 || s.appliesToTowerIds.includes(towerId)) &&
      (!needle || `${s.code} ${s.title}`.toLowerCase().includes(needle)),
  );
  const ids = new Set(visible.map((s) => s.id));
  const inScope = (standardId: string, tower: string) => (!towerId || tower === towerId) && ids.has(standardId);
  const totalsOf = (s: Standard) => sumCells(cells.filter((c) => c.standardId === s.id && (!towerId || c.towerId === towerId)));
  const all = sumCells(cells.filter((c) => inScope(c.standardId, c.towerId)));
  const pct = sharePct(all);

  const groups = disciplines
    .map((d) => ({ discipline: d, rows: visible.filter((s) => s.disciplineId === d.id).sort((a, b) => a.code.localeCompare(b.code)) }))
    .filter((g) => g.rows.length > 0);

  const columns: Column<Standard>[] = [
    {
      key: "code", label: "Code", mono: true, sort: (s) => s.code,
      render: (s) => (
        <Link to={paths.standard(s.id)} className="focus-ring rounded font-bold text-ink hover:underline">{s.code}</Link>
      ),
    },
    { key: "title", label: "Standard", sort: (s) => s.title, render: (s) => <span className="block min-w-48">{s.title}</span> },
    { key: "revision", label: "Rev", sort: (s) => s.revision },
    { key: "effective", label: "Effective", sort: (s) => s.effectiveDate, render: (s) => <span className="whitespace-nowrap">{fmtDate(s.effectiveDate)}</span> },
    { key: "owner", label: "Owner team", render: (s) => s.ownerTeam },
    {
      key: "brands", label: "Approved brands",
      render: (s) => (
        <div className="flex max-w-[22rem] flex-wrap gap-1.5">
          {s.approvals.map((a) => (
            <BrandChip key={a.brandId} brandId={a.brandId} brand={brands[a.brandId]} tier={a.tier} />
          ))}
        </div>
      ),
    },
    { key: "adoption", label: "Adoption", render: (s) => <AdoptionBar totals={totalsOf(s)} /> },
  ];

  return (
    <>
      <StandardsHeader lede="The rulebook of the design repository: what each system must be, which brands are approved at which tier, and how much of the installed base follows it." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Standards" value={fmtNumber(visible.length)} delta={plural(groups.length, "discipline")} />
        <StatTile label="Governed assets" value={fmtNumber(all.total)} delta="Installed and under a standard" />
        <StatTile label="Compliance" value={pct === null ? "n/a" : `${pct}%`} tone="gold" delta={`${fmtNumber(all.compliant + all.waived)} compliant or waived`} />
        <StatTile
          label="Deviations"
          value={fmtNumber(all.deviations)}
          tone={all.deviations > 0 ? "hot" : "default"}
          delta={`${plural(all.phaseOut, "asset")} on phase-out brands`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search code or title" className="w-full max-w-sm" />
        <TowerSelect />
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span>Brand tiers</span>
        {TIERS.map((t) => (
          <Badge key={t} tone={tierTone(t)}>{words(t)}</Badge>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No standards"
          body={needle || towerId ? "Nothing matches these filters." : "No design standards are recorded yet."}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.discipline.id} aria-label={g.discipline.name}>
              <h2 className="type-heading mb-3 text-ink">
                {g.discipline.name} <span className="ml-1 tabular-nums text-muted">{g.rows.length}</span>
              </h2>
              <DataTable columns={columns} rows={g.rows} rowKey={(s) => s.id} onRowClick={(s) => navigate(paths.standard(s.id))} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
