import { Download, FilePlus2, SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, Chip, DataTable, EmptyState, Notice, SearchInput, StatTile, type Column } from "@/components/ui";
import { useDb } from "@/data/store";
import type { DocRevision, Document } from "@/data/types";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { fmtDate } from "@/lib/dates";
import { fmtNumber, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { docStatusTone } from "@/lib/status";
import { DocsHeader } from "../components/DocsHeader";
import { AddDocumentModal } from "../components/DocumentModals";
import { ChipRow, FilterSelect, ScopeChip } from "../components/Filters";
import {
  DISCIPLINE_CODES, DOC_STATUSES, DOC_STATUS_LABEL, DOC_TYPES, DOC_TYPE_LABEL, cmp, docKpis, docPlace, latestRev, linkClass, matchesDoc, pick, useQuery, useSearchText,
  useTowerFilter, words, type DocFilters,
} from "../lib";

interface Row {
  doc: Document;
  rev: DocRevision | undefined;
  place: string;
  towerName: string;
  floorLabel: string;
  discipline: string;
}

const FILTER_KEYS = ["q", "tower", "discipline", "type", "status", "current"];

const CSV_COLUMNS: CsvColumn<Row>[] = [
  { label: "Document no", value: (r) => r.doc.docNo },
  { label: "Title", value: (r) => r.doc.title },
  { label: "Type", value: (r) => DOC_TYPE_LABEL[r.doc.type] },
  { label: "Discipline", value: (r) => r.discipline },
  { label: "Tower", value: (r) => r.towerName },
  { label: "Floor", value: (r) => r.floorLabel },
  { label: "Revision", value: (r) => r.rev?.rev },
  { label: "Revision date", value: (r) => r.rev?.date },
  { label: "Status", value: (r) => DOC_STATUS_LABEL[r.doc.status] },
  { label: "Links", value: (r) => r.doc.links.length },
];

const COLUMNS: Column<Row>[] = [
  { key: "docNo", label: "Doc no", mono: true, sort: (r) => r.doc.docNo, render: (r) => r.doc.docNo },
  {
    key: "title", label: "Title", sort: (r) => r.doc.title,
    render: (r) => (
      <Link to={paths.document(r.doc.id)} className="focus-ring block min-w-56 max-w-md rounded hover:underline">{r.doc.title}</Link>
    ),
  },
  { key: "type", label: "Type", sort: (r) => DOC_TYPE_LABEL[r.doc.type], render: (r) => <Badge tone="neutral">{words(r.doc.type)}</Badge> },
  { key: "discipline", label: "Discipline", sort: (r) => r.discipline, render: (r) => <span className="whitespace-nowrap">{r.discipline}</span> },
  { key: "place", label: "Tower · floor", sort: (r) => r.place, render: (r) => <span className="whitespace-nowrap">{r.place}</span> },
  { key: "rev", label: "Rev", sort: (r) => r.rev?.rev ?? "", render: (r) => r.rev?.rev ?? "—" },
  { key: "revDate", label: "Rev date", sort: (r) => r.rev?.date ?? "", render: (r) => <span className="whitespace-nowrap">{r.rev ? fmtDate(r.rev.date) : "—"}</span> },
  { key: "status", label: "Status", sort: (r) => r.doc.status, render: (r) => <Badge tone={docStatusTone(r.doc.status)}>{words(r.doc.status)}</Badge> },
  { key: "links", label: "Links", align: "right", sort: (r) => r.doc.links.length, render: (r) => fmtNumber(r.doc.links.length) },
];

export default function Register() {
  const db = useDb((d) => d);
  const navigate = useNavigate();
  const { params, set } = useQuery();
  const { tower, towerName, scoped, choose, clearScope } = useTowerFilter();
  const search = useSearchText();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Document | null>(null);

  const status = pick(params.get("status"), DOC_STATUSES);
  // an explicit status filter wins over "Current only", so a link such as ?status=superseded does not come back empty
  const filters: DocFilters = {
    tower, status, q: search.applied.trim(),
    discipline: pick(params.get("discipline"), DISCIPLINE_CODES),
    type: pick(params.get("type"), DOC_TYPES),
    currentOnly: params.get("current") !== "0" && status === "",
  };

  const docs = Object.values(db.documents);
  const toRow = (doc: Document): Row => ({
    doc, rev: latestRev(doc), place: docPlace(db, doc),
    towerName: doc.towerId ? (db.towers[doc.towerId]?.name ?? doc.towerId) : "Portfolio",
    floorLabel: doc.floorId ? (db.floors[doc.floorId]?.label ?? doc.floorId) : "",
    discipline: db.disciplines[doc.disciplineId]?.name ?? doc.disciplineId,
  });
  const rows = docs.filter((d) => matchesDoc(d, filters)).map(toRow).sort((a, b) => cmp(a.doc.docNo, b.doc.docNo));
  const facet = docs.filter((d) => matchesDoc(d, filters, "type"));
  const kpi = docKpis(db, tower);

  const towers = Object.values(db.towers).sort((a, b) => cmp(a.name, b.name));
  const disciplines = Object.values(db.disciplines).sort((a, b) => a.order - b.order);
  const typeItems = DOC_TYPES.map((t) => ({ value: t, label: DOC_TYPE_LABEL[t], count: facet.filter((d) => d.type === t).length })).filter(
    (i) => i.count > 0 || i.value === filters.type,
  );

  const anyFilter = FILTER_KEYS.some((k) => params.has(k));
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
  const toggleCurrent = () => (filters.currentOnly ? set({ current: "0" }) : set({ current: null, status: null }));

  return (
    <div>
      <DocsHeader
        actions={
          <>
            <Button variant="ghost" disabled={rows.length === 0} onClick={() => downloadCsv("documents", CSV_COLUMNS, rows)}>
              <Download aria-hidden="true" className="size-4" strokeWidth={2} />
              Export CSV
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <FilePlus2 aria-hidden="true" className="size-4" strokeWidth={2} />
              Add document
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Current" tone="gold" value={fmtNumber(kpi.current)} delta={`of ${plural(kpi.total, "document")} on record`} />
          <StatTile
            label="Superseded, still linked" value={fmtNumber(kpi.supersededLinked)}
            delta={kpi.supersededLinked > 0 ? "Old sheets that records still point at" : "No old sheet is still in use"}
          />
          <StatTile label="For review" value={fmtNumber(kpi.forReview)} delta="Issued, awaiting sign-off" />
          <StatTile
            label="Permits due" value={fmtNumber(kpi.permitsDue)} tone={kpi.permitsExpired > 0 ? "hot" : "default"}
            delta={
              <Link to={paths.permits({ tower: tower || undefined })} className={linkClass}>
                {kpi.permitsExpired > 0 ? `${fmtNumber(kpi.permitsExpired)} expired · ` : ""}Open permits
              </Link>
            }
          />
        </div>

        {added && (
          <Notice tone="ok">
            Added {added.docNo} to the register.{" "}
            <Link to={paths.document(added.id)} className="focus-ring rounded font-extrabold underline">Open it</Link>
          </Notice>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              className="w-full sm:max-w-sm sm:flex-1" placeholder="Search title or document no"
              value={search.draft} onChange={search.onChange}
            />
            <FilterSelect
              className="w-full sm:w-auto" label="Tower" allLabel="All towers" value={tower} onChange={choose}
              options={towers.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FilterSelect
              className="w-full sm:w-auto" label="Discipline" allLabel="All disciplines" value={filters.discipline}
              onChange={(v) => set({ discipline: v })} options={disciplines.map((d) => ({ value: d.id, label: d.name }))}
            />
            <FilterSelect
              className="w-full sm:w-auto" label="Status" allLabel="All statuses" value={filters.status}
              onChange={(v) => set({ status: v })} options={DOC_STATUSES.map((s) => ({ value: s, label: DOC_STATUS_LABEL[s] }))}
            />
          </div>

          <ChipRow label="Document type" allCount={facet.length} value={filters.type} items={typeItems} onPick={(v) => set({ type: v })} />

          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Current only" active={filters.currentOnly} onClick={toggleCurrent} />
            {scoped && <ScopeChip name={towerName} onClear={clearScope} />}
            {anyFilter && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            <p className="type-small ml-auto text-muted" aria-live="polite">{plural(rows.length, "document")}</p>
          </div>
        </div>

        <DataTable
          columns={COLUMNS}
          rows={rows}
          rowKey={(r) => r.doc.id}
          onRowClick={(r) => navigate(paths.document(r.doc.id))}
          empty={
            <EmptyState
              icon={SearchX}
              title="No documents match"
              body={filters.currentOnly ? "Only current documents are shown. Turn off Current only, or widen the other filters." : "Try removing a filter or widening the tower scope."}
              action={
                anyFilter || scoped ? (
                  <Button variant="ghost" size="sm" onClick={() => { clearFilters(); if (scoped) clearScope(); }}>Clear filters</Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      <AddDocumentModal
        open={adding}
        defaultTowerId={tower}
        onClose={() => setAdding(false)}
        onSaved={(doc) => {
          setAdding(false);
          setAdded(doc);
        }}
      />
    </div>
  );
}
