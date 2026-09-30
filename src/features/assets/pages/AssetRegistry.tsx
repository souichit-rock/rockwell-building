import { Download, SearchX } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTowerScope } from "@/app/useTowerScope";
import {
  Badge, Button, Chip, DataTable, EmptyState, EquipmentIcon, PageHeader, StatTile, cn, selectClass, type Column,
} from "@/components/ui";
import { useDb } from "@/data/store";
import type { WarrantyBand } from "@/data/types";
import { downloadCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { assetStatusTone, complianceTone, conditionTone, dueTone, warrantyTone } from "@/lib/status";
import { QuerySearch } from "../components/QuerySearch";
import { BAND_OPTIONS, FILTER_KEYS, LINK, STATUSES, buildRows, cap, matches, readFilters, words, type AssetRow } from "../lib";

// One spec per visible column: the table and the CSV are built from the same list, so the headers cannot drift apart.
type Spec = Column<AssetRow> & { csv: (r: AssetRow) => string };

const SPECS: Spec[] = [
  {
    key: "tag", label: "Tag", mono: true, sort: (r) => r.asset.tag, csv: (r) => r.asset.tag,
    render: (r) => <Link to={paths.asset(r.asset.id)} className={cn(LINK, "font-semibold")}>{r.asset.tag}</Link>,
  },
  {
    key: "type", label: "Type", sort: (r) => r.type.name, csv: (r) => r.type.name,
    render: (r) => (
      <span className="inline-flex items-center gap-2">
        <EquipmentIcon name={r.type.icon} className="size-4 shrink-0 text-muted" />
        {r.type.name}
      </span>
    ),
  },
  {
    key: "brand", label: "Brand · Model", sort: (r) => `${r.brand?.name ?? ""} ${r.model?.modelNo ?? ""}`,
    csv: (r) => [r.brand?.name, r.model?.modelNo].filter(Boolean).join(" · "),
    render: (r) => (
      <>
        <span className="block text-ink">{r.brand?.name ?? "—"}</span>
        {r.model && <span className="block font-mono text-[12px] text-ink-soft">{r.model.modelNo}</span>}
      </>
    ),
  },
  {
    key: "location", label: "Location", sort: (r) => `${r.tower.code}-${String(r.floor.level + 50).padStart(3, "0")}-${r.space.code}`,
    csv: (r) => `${r.tower.name} / ${r.floor.label} / ${r.space.name}`,
    render: (r) => (
      <>
        <span className="block whitespace-nowrap text-ink">{r.tower.name}</span>
        <span className="block whitespace-nowrap text-xs text-muted">{r.floor.label} · {r.space.name}</span>
      </>
    ),
  },
  {
    key: "status", label: "Status", sort: (r) => r.asset.status, csv: (r) => cap(words(r.asset.status)),
    render: (r) => <Badge tone={assetStatusTone(r.asset.status)}>{words(r.asset.status)}</Badge>,
  },
  {
    key: "condition", label: "Condition", sort: (r) => r.asset.condition, csv: (r) => cap(r.asset.condition),
    render: (r) => <Badge tone={conditionTone(r.asset.condition)}>{r.asset.condition}</Badge>,
  },
  {
    key: "warranty", label: "Warranty", sort: (r) => r.warranty?.end ?? "", csv: (r) => `${cap(words(r.band))}${r.warranty ? `, ends ${fmtDate(r.warranty.end)}` : ""}`,
    render: (r) => (
      <>
        <Badge tone={warrantyTone(r.band)}>{words(r.band)}</Badge>
        {r.warranty && <span className="mt-1 block whitespace-nowrap text-xs text-muted">Ends {fmtDate(r.warranty.end)}</span>}
      </>
    ),
  },
  {
    key: "pm", label: "Next PM", sort: (r) => r.nextPm?.nextDue ?? "9999", csv: (r) => (r.nextPm ? fmtDate(r.nextPm.nextDue) : ""),
    render: (r) =>
      r.nextPm && r.pmStatus ? (
        <>
          <span className="block whitespace-nowrap">{fmtDate(r.nextPm.nextDue)}</span>
          {r.pmStatus !== "on-track" && <Badge tone={dueTone(r.pmStatus)} className="mt-1">{r.pmStatus}</Badge>}
        </>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "sheet", label: "Governing sheet", sort: (r) => r.sheet?.doc.docNo ?? "",
    csv: (r) => (r.sheet ? `${r.sheet.doc.docNo}${r.sheet.stale ? " (superseded)" : ""}` : "None"),
    render: (r) =>
      r.sheet ? (
        <>
          <Link to={paths.document(r.sheet.doc.id)} className={cn(LINK, "font-mono text-[12px]")}>{r.sheet.doc.docNo}</Link>
          {r.sheet.stale && <Badge tone="warn" className="mt-1">superseded</Badge>}
        </>
      ) : (
        <Badge tone="warn">none</Badge>
      ),
  },
  {
    key: "compliance", label: "Compliance", sort: (r) => r.compliance.status, csv: (r) => cap(words(r.compliance.status)),
    render: (r) => <Badge tone={complianceTone(r.compliance.status)}>{words(r.compliance.status)}</Badge>,
  },
];

const CSV_COLUMNS = SPECS.map((s) => ({ label: s.label, value: s.csv }));

const sameBands = (a: WarrantyBand[], b: WarrantyBand[]) => a.length === b.length && a.every((x) => b.includes(x));

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="block w-full min-w-0 sm:w-auto">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectClass, "sm:w-44")}>
        {children}
      </select>
    </label>
  );
}

export default function AssetRegistry() {
  const db = useDb((d) => d);
  const { towerId: scopeTower, setTowerId } = useTowerScope();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();

  const rows = useMemo(() => buildRows(db), [db]);
  const f = readFilters(sp, db, scopeTower);
  const filtered = rows.filter((r) => matches(r, f));

  // every control writes the route query and nothing else
  const patch = (changes: Record<string, string | null>) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    }, { replace: true });
  const toggle = (key: string, value: string, on: boolean) => patch({ [key]: on ? null : value });

  const anyFilter = FILTER_KEYS.some((k) => sp.has(k));
  const clearFilters = () => patch(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
  const scopeName = scopeTower && !sp.get("tower") ? db.towers[scopeTower]?.name : undefined;

  const inScope = rows.filter((r) => !f.tower || r.asset.towerId === f.tower).length;
  const inService = filtered.filter((r) => r.asset.status === "in-service").length;
  const underRepair = filtered.filter((r) => r.asset.status === "under-repair").length;
  const expiring = filtered.filter((r) => r.band === "30d" || r.band === "90d");
  const urgent = expiring.filter((r) => r.band === "30d").length;

  const disciplines = Object.values(db.disciplines).sort((a, b) => a.order - b.order);
  const facet = rows.filter((r) => matches(r, f, "discipline"));
  // the active type stays in the list even when another filter would leave it with no rows, or the select would show the wrong option
  const typeOptions = [...new Map([
    ...rows.filter((r) => matches(r, f, "type")).map((r): [string, string] => [r.type.id, r.type.name]),
    ...(f.type ? [[f.type, db.equipmentTypes[f.type]?.name ?? f.type] as [string, string]] : []),
  ]).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const towers = Object.values(db.towers).sort((a, b) => a.name.localeCompare(b.name));

  const bandValue = f.bands.join(",");
  const bandKnown = BAND_OPTIONS.some((o) => o.value === bandValue);
  const linkChips = [
    f.brand && { key: "brand", label: `Brand: ${db.brands[f.brand]?.name ?? f.brand}` },
    f.model && { key: "model", label: `Model: ${db.models[f.model]?.modelNo ?? f.model}` },
    f.vendor && { key: "vendor", label: `Vendor: ${db.vendors[f.vendor]?.name ?? f.vendor}` },
  ].filter((c): c is { key: string; label: string } => !!c);

  return (
    <div>
      <PageHeader
        eyebrow="Registry"
        title="Asset registry"
        lede="Every installed asset with its brand, model, room, warranty and the as-built sheet that governs it. Open a row for the full passport."
        actions={
          <Button variant="ghost" disabled={filtered.length === 0} onClick={() => downloadCsv("assets", CSV_COLUMNS, filtered)}>
            <Download aria-hidden="true" className="size-4" strokeWidth={2} />
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Assets" tone="gold" value={fmtNumber(filtered.length)}
            delta={filtered.length === inScope ? (f.tower ? db.towers[f.tower]?.name : "All towers") : `of ${fmtNumber(inScope)} in scope`}
          />
          <StatTile label="In service" value={fmtNumber(inService)} delta={filtered.length ? `${fmtNumber(Math.round((inService / filtered.length) * 100))}% of the list` : undefined} />
          <StatTile label="Under repair" value={fmtNumber(underRepair)} tone={underRepair > 0 ? "hot" : "default"} />
          <StatTile label="Warranty ≤ 90 d" value={fmtNumber(expiring.length)} delta={urgent > 0 ? `${fmtNumber(urgent)} within 30 d` : undefined} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <QuerySearch
              className="w-full sm:max-w-sm sm:flex-1" placeholder="Search tag, serial, model, room"
              value={f.q} onCommit={(v) => patch({ q: v.trim() ? v : null })}
            />
            <FilterSelect
              label="Tower" value={f.tower ?? ""}
              onChange={(v) => {
                if (!v && scopeTower) setTowerId(null); // "All towers" also drops the rail scope, or it would filter again
                patch({ tower: v || null });
              }}
            >
              <option value="">All towers</option>
              {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </FilterSelect>
            <FilterSelect label="Equipment type" value={f.type ?? ""} onChange={(v) => patch({ type: v || null })}>
              <option value="">All types</option>
              {typeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </FilterSelect>
            <FilterSelect label="Status" value={f.status ?? ""} onChange={(v) => patch({ status: v || null })}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{cap(words(s))}</option>)}
            </FilterSelect>
            <FilterSelect label="Warranty band" value={bandValue} onChange={(v) => patch({ band: v || null })}>
              <option value="">Any warranty</option>
              {BAND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              {!bandKnown && bandValue && <option value={bandValue}>{bandValue}</option>}
            </FilterSelect>
          </div>

          <div role="group" aria-label="Discipline" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Chip label="All disciplines" active={!f.discipline} count={facet.length} onClick={() => patch({ discipline: null })} />
            {disciplines.map((d) => (
              <Chip
                key={d.id} label={d.name} active={f.discipline === d.id} count={facet.filter((r) => r.disciplineId === d.id).length}
                onClick={() => toggle("discipline", d.id, f.discipline === d.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Overdue PM" active={f.pm} onClick={() => toggle("pm", "overdue", f.pm)} />
            <Chip label="Warranty ≤ 90 d" active={sameBands(f.bands, ["30d", "90d"])} onClick={() => toggle("band", "30d,90d", sameBands(f.bands, ["30d", "90d"]))} />
            <Chip label="Criticality A" active={f.crit === "A"} onClick={() => toggle("crit", "A", f.crit === "A")} />
            <Chip label="Non-compliant" active={f.compliance === "deviation"} onClick={() => toggle("compliance", "deviation", f.compliance === "deviation")} />
            {linkChips.map((c) => <Chip key={c.key} label={`${c.label} ×`} active onClick={() => patch({ [c.key]: null })} />)}
            {scopeName && <Chip label={`Scoped to ${scopeName} ×`} active onClick={() => setTowerId(null)} />}
            {anyFilter && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            <p className="type-small ml-auto text-muted" aria-live="polite">{plural(filtered.length, "asset")}</p>
          </div>
        </div>

        <DataTable
          columns={SPECS}
          rows={filtered}
          rowKey={(r) => r.asset.id}
          onRowClick={(r) => navigate(paths.asset(r.asset.id))}
          empty={
            <EmptyState
              icon={SearchX}
              title="No assets match"
              body="Try removing a filter or widening the tower scope."
              action={anyFilter || scopeName ? <Button variant="ghost" size="sm" onClick={() => { clearFilters(); if (scopeTower) setTowerId(null); }}>Clear filters</Button> : undefined}
            />
          }
        />
      </div>
    </div>
  );
}
