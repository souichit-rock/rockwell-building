import { Download, Tags } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Badge, Button, Chip, DataTable, EmptyState, EquipmentIcon, PageHeader, SearchInput, StatTile, selectClass, type Column,
} from "@/components/ui";
import { useTowerScope } from "@/app/useTowerScope";
import { useDb } from "@/data/store";
import type { DisciplineCode } from "@/data/types";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { BrandCard } from "../components/BrandCard";
import { Section } from "../components/Section";
import { catalogue, catalogueProblems, isRestricted, keySpec, lookup, specLine, type ModelRow } from "../lib";
import { useQueryText } from "../useQueryText";

const inlineLink = "focus-ring rounded font-bold text-ink hover:underline";

export default function CataloguePage() {
  const db = useDb((d) => d);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { towerId: scope, setTowerId } = useTowerScope();
  const [draft, setDraft] = useQueryText("q");

  // The page's own ?tower= wins over the rail's tower scope; an unknown id in the query is ignored.
  const queryTower = lookup(db.towers, params.get("tower"));
  const tower = queryTower ?? (scope ? db.towers[scope] : undefined);
  const towerId = tower?.id ?? null;
  const discipline = lookup(db.disciplines, params.get("discipline"))?.id ?? null;
  const type = lookup(db.equipmentTypes, params.get("type"))?.id ?? null;
  const q = params.get("q") ?? "";

  const setParam = (key: string, value: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  const pickDiscipline = (next: DisciplineCode | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (next) n.set("discipline", next);
      else n.delete("discipline");
      // a type from another discipline would leave the page empty
      if (next && type && db.equipmentTypes[type]?.disciplineId !== next) n.delete("type");
      return n;
    }, { replace: true });
  const clearScope = () => {
    setParam("tower", null);
    setTowerId(null);
  };
  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  const view = useMemo(() => catalogue(db, { discipline, type, q, towerId }), [db, discipline, type, q, towerId]);

  // Dev-time guard: where-used must add up, or the registry links on these pages would disagree with them.
  useEffect(() => {
    if (import.meta.env.DEV) for (const p of catalogueProblems(db)) console.error(`catalogue: ${p}`);
  }, [db]);

  // Chips and the type list only offer what the catalogue holds.
  const modelTypes = useMemo(() => {
    const ids = new Set(Object.values(db.models).map((m) => m.equipmentTypeId));
    return Object.values(db.equipmentTypes).filter((t) => ids.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [db]);
  const disciplines = useMemo(() => {
    const ids = new Set(modelTypes.map((t) => t.disciplineId));
    return Object.values(db.disciplines).filter((d) => ids.has(d.id)).sort((a, b) => a.order - b.order);
  }, [db, modelTypes]);
  const byDiscipline = discipline ? modelTypes.filter((t) => t.disciplineId === discipline) : modelTypes;
  // a type set through the query but outside the list above stays selectable, so the select never reads "All" while filtering
  const activeType = type ? db.equipmentTypes[type] : undefined;
  const typeOptions = activeType && !byDiscipline.includes(activeType) ? [...byDiscipline, activeType] : byDiscipline;

  // Sum of the listed models, so the tile matches the Models table under every filter (a brand's own total would ignore type / search).
  const installedTotal = view.models.reduce((n, r) => n + r.installed, 0);
  const restrictedBrands = view.brands.filter((b) => b.approvals.some((a) => isRestricted(a.tier))).length;
  const filtered = Boolean(discipline || type || q || queryTower);
  const suffix = tower ? ` (${tower.code})` : "";

  const columns: Column<ModelRow>[] = [
    {
      key: "model", label: "Model", mono: true, sort: (r) => r.model.modelNo,
      render: (r) => <Link to={paths.model(r.model.id)} className={inlineLink}>{r.model.modelNo}</Link>,
    },
    {
      key: "brand", label: "Brand", sort: (r) => r.brand?.name ?? "",
      render: (r) => (r.brand ? <Link to={paths.brand(r.brand.id)} className="focus-ring rounded hover:underline">{r.brand.name}</Link> : "—"),
    },
    {
      key: "type", label: "Type", sort: (r) => r.type?.name ?? "",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.type && <EquipmentIcon name={r.type.icon} className="size-4 shrink-0 text-muted" />}
          {r.type?.name ?? "—"}
        </span>
      ),
    },
    { key: "spec", label: "Key spec", render: (r) => <span className="text-ink-soft">{keySpec(r.model)}</span> },
    {
      key: "installed", label: `Installed${suffix}`, align: "right", sort: (r) => r.installed,
      render: (r) =>
        r.installed > 0 ? (
          <Link to={paths.assets({ model: r.model.id, tower: towerId ?? undefined })} className={inlineLink}>{fmtNumber(r.installed)}</Link>
        ) : (
          <span className="text-muted">0</span>
        ),
    },
    {
      key: "status", label: "Status", sort: (r) => Number(r.model.discontinued),
      render: (r) => (r.model.discontinued ? <Badge tone="neutral">Discontinued</Badge> : <span className="text-muted">Current</span>),
    },
  ];

  const csvColumns: CsvColumn<ModelRow>[] = [
    { label: "Model", value: (r) => r.model.modelNo },
    { label: "Brand", value: (r) => r.brand?.name },
    { label: "Country", value: (r) => r.brand?.country },
    { label: "Discipline", value: (r) => r.discipline?.name },
    { label: "Equipment type", value: (r) => r.type?.name },
    { label: "Specifications", value: (r) => specLine(r.model) },
    { label: "Default warranty (months)", value: (r) => r.model.defaultWarrantyMonths },
    { label: `Installed${suffix}`, value: (r) => r.installed },
    { label: "Status", value: (r) => (r.model.discontinued ? "Discontinued" : "Current") },
    { label: "Successor", value: (r) => r.successor?.modelNo },
  ];

  const nothing = view.brands.length === 0 && view.models.length === 0;
  const clearAction = filtered ? <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Registry"
        title="Brands & models"
        lede="The brands behind every installed asset: where each is approved, which models exist and how many are in service."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Brands" value={fmtNumber(view.brands.length)} />
        <StatTile label="Models" value={fmtNumber(view.models.length)} />
        <StatTile label={`Installed assets${suffix}`} value={fmtNumber(installedTotal)} />
        <StatTile label="Restricted brands" value={fmtNumber(restrictedBrands)} delta="Phase-out or prohibited" tone={restrictedBrands > 0 ? "hot" : "default"} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={draft} onChange={setDraft} placeholder="Search brands, models or specs" className="w-full sm:max-w-sm" />
          <label className="block w-full sm:w-64">
            <span className="sr-only">Equipment type</span>
            <select className={selectClass} value={type ?? ""} onChange={(e) => setParam("type", e.target.value || null)}>
              <option value="">All equipment types</option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          {tower && <Chip label={`Scoped to ${tower.name} · Clear`} active onClick={clearScope} />}
          {clearAction}
        </div>
        <div role="group" aria-label="Discipline" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Chip label="All disciplines" active={!discipline} onClick={() => pickDiscipline(null)} />
          {disciplines.map((d) => (
            <Chip key={d.id} label={d.name} active={discipline === d.id} onClick={() => pickDiscipline(discipline === d.id ? null : d.id)} />
          ))}
        </div>
      </div>

      {nothing ? (
        <EmptyState
          icon={Tags}
          title="No brands or models match"
          body={tower ? `Nothing installed at ${tower.name} matches these filters.` : "Nothing in the catalogue matches these filters."}
          action={clearAction}
        />
      ) : (
        <>
          <Section title="Brands" count={view.brands.length}>
            {view.brands.length === 0 ? (
              <EmptyState icon={Tags} title="No brands match" body="Try a different discipline or search term." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {view.brands.map((row) => (
                  <BrandCard key={row.brand.id} row={row} towerId={towerId} />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Models"
            count={view.models.length}
            actions={
              <Button variant="ghost" size="sm" disabled={view.models.length === 0} onClick={() => downloadCsv("models", csvColumns, view.models)}>
                <Download aria-hidden="true" className="size-4" strokeWidth={2} />
                Export CSV
              </Button>
            }
          >
            <DataTable
              columns={columns}
              rows={view.models}
              rowKey={(r) => r.model.id}
              onRowClick={(r) => navigate(paths.model(r.model.id))}
              empty={<EmptyState icon={Tags} title="No models match" body="Try a different equipment type or search term." />}
            />
          </Section>
        </>
      )}
    </div>
  );
}
