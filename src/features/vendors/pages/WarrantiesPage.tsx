import { ArrowLeft, Download, FileCheck, FileText, Printer, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import NotFound from "@/app/NotFound";
import {
  Badge, Breadcrumb, Button, DataTable, EmptyState, PageHeader, SearchInput, Tabs,
  type Column, type TabItem,
} from "@/components/ui";
import { useDb } from "@/data/store";
import type { WarrantyBand } from "@/data/types";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { fmtDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { warrantyTone } from "@/lib/status";
import { ClaimSheet } from "../components/ClaimSheet";
import { HeaderActions, TowerFilter, linkClass } from "../components/bits";
import { useQueryFilters } from "../filters";
import { BAND_LABEL, claimData, claimHref, signedDays, warrantyHaystack, warrantyRows, type WarrantyRow } from "../lib";

// Bands are exactly the ones warrantyBand returns; "all" is the absent ?band=.
const BANDS = ["expired", "30d", "90d", "365d", "active"] as const;
type BandKey = (typeof BANDS)[number];
const isBand = (v: string): v is BandKey => (BANDS as readonly string[]).includes(v);

const CSV_COLUMNS: CsvColumn<WarrantyRow>[] = [
  { label: "Asset tag", value: (r) => r.asset.tag },
  { label: "Type", value: (r) => r.typeName },
  { label: "Tower", value: (r) => r.tower?.name },
  { label: "Brand", value: (r) => r.brand?.name },
  { label: "Model", value: (r) => r.model?.modelNo },
  { label: "Serial", value: (r) => r.asset.serial },
  { label: "Vendor", value: (r) => r.vendor?.name },
  { label: "Start", value: (r) => r.warranty.start },
  { label: "End", value: (r) => r.warranty.end },
  { label: "Days left", value: (r) => r.days },
  { label: "Band", value: (r) => BAND_LABEL[r.band] },
  { label: "Coverage", value: (r) => r.warranty.coverage },
  { label: "Certificate", value: (r) => r.doc?.docNo },
  { label: "Open work orders during coverage", value: (r) => r.openWos },
];

export default function WarrantiesPage() {
  const f = useQueryFilters();
  const navigate = useNavigate();
  const claimId = f.get("claim");
  const rows = useDb((db) => warrantyRows(db));
  const claim = useDb((db) => (claimId ? claimData(db, claimId) : undefined));

  // The search text is typed into local state and written to ?q=; the query stays the source of truth (re-synced on Back, clear).
  const q = f.get("q");
  const [draft, setDraft] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (seenQ !== q) {
    setSeenQ(q);
    setDraft(q);
  }

  if (claimId) {
    const back = claimHref(f.params, null);
    if (!claim) {
      return (
        <div>
          <Breadcrumb items={[{ to: back, label: "Warranties" }, { label: "Claim sheet" }]} />
          <NotFound what="warranty" id={claimId} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="print:hidden">
          <Breadcrumb items={[{ to: back, label: "Warranties" }, { label: "Claim sheet" }]} />
          <PageHeader
            eyebrow={claim.row.asset.tag}
            title="Claim sheet"
            lede="Check the terms, then print. The sheet fits one A4 page and leaves room to describe the fault."
            actions={
              <HeaderActions>
                <Button to={back}>
                  <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                  Warranty register
                </Button>
                <Button variant="primary" onClick={() => window.print()}>
                  <Printer aria-hidden="true" className="size-4" strokeWidth={2} />
                  Print
                </Button>
              </HeaderActions>
            }
          />
        </div>
        <ClaimSheet data={claim} />
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const scoped = rows.filter((r) => (!f.towerId || r.asset.towerId === f.towerId) && (!needle || warrantyHaystack(r).includes(needle)));
  const countOf = (band: WarrantyBand) => scoped.filter((r) => r.band === band).length;
  const bandParam = f.get("band");
  const band: BandKey | "all" = isBand(bandParam) ? bandParam : "all";
  const shown = band === "all" ? scoped : scoped.filter((r) => r.band === band);

  const tabs: TabItem[] = [
    { key: "all", label: "All", count: scoped.length },
    { key: "expired", label: "Expired", count: countOf("expired") },
    { key: "30d", label: BAND_LABEL["30d"], count: countOf("30d") },
    { key: "90d", label: BAND_LABEL["90d"], count: countOf("90d") },
    { key: "365d", label: BAND_LABEL["365d"], count: countOf("365d") },
    { key: "active", label: "Active", count: countOf("active") },
  ];

  const columns: Column<WarrantyRow>[] = [
    {
      key: "tag", label: "Asset", mono: true, sort: (r) => r.asset.tag,
      render: (r) => <Link to={paths.asset(r.asset.id)} className={`${linkClass} whitespace-nowrap`}>{r.asset.tag}</Link>,
    },
    { key: "type", label: "Type", sort: (r) => r.typeName, render: (r) => r.typeName },
    { key: "tower", label: "Tower", sort: (r) => r.tower?.code ?? "", render: (r) => r.tower?.code ?? "—" },
    {
      key: "brand", label: "Brand · model", sort: (r) => `${r.brand?.name ?? ""} ${r.model?.modelNo ?? ""}`,
      render: (r) => (
        <span className="flex flex-col items-start gap-0.5">
          {r.brand ? <Link to={paths.brand(r.brand.id)} className={linkClass}>{r.brand.name}</Link> : "—"}
          {r.model && <Link to={paths.model(r.model.id)} className={`${linkClass} whitespace-nowrap font-mono text-[12px] text-ink-soft`}>{r.model.modelNo}</Link>}
        </span>
      ),
    },
    {
      key: "vendor", label: "Vendor", sort: (r) => r.vendor?.name ?? "",
      render: (r) => (r.vendor ? <Link to={paths.vendor(r.vendor.id)} className={linkClass}>{r.vendor.name}</Link> : "—"),
    },
    { key: "start", label: "Start", sort: (r) => r.warranty.start, render: (r) => <span className="whitespace-nowrap">{fmtDate(r.warranty.start)}</span> },
    { key: "end", label: "End", sort: (r) => r.warranty.end, render: (r) => <span className="whitespace-nowrap">{fmtDate(r.warranty.end)}</span> },
    {
      key: "days", label: "Days left", align: "right", sort: (r) => r.days,
      render: (r) => <Badge tone={warrantyTone(r.band)}>{signedDays(r.days)}</Badge>,
    },
    { key: "coverage", label: "Coverage", sort: (r) => r.warranty.coverage, render: (r) => r.warranty.coverage },
    {
      key: "cert", label: "Certificate",
      render: (r) =>
        r.doc ? (
          <Link to={paths.document(r.doc.id)} className={`${linkClass} inline-flex items-center gap-1.5 whitespace-nowrap`}>
            <FileCheck aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            <span className="font-mono text-[12px]">{r.doc.docNo}</span>
          </Link>
        ) : (
          <span className="text-muted">None on file</span>
        ),
    },
    {
      key: "wos", label: "Open WOs", align: "right", sort: (r) => r.openWos,
      render: (r) =>
        r.openWos > 0 ? (
          <Link to={paths.workOrders({ assetId: r.asset.id, view: "list" })} className={`${linkClass} font-bold`}>{fmtNumber(r.openWos)}</Link>
        ) : (
          <span className="text-muted">0</span>
        ),
    },
    {
      // icon-only keeps the twelfth column narrow enough to stay in view on a laptop; the title and aria-label carry the name
      key: "claim", label: "Claim",
      render: (r) => (
        <Button to={claimHref(f.params, r.warranty.id)} size="sm" icon title="Claim sheet" aria-label={`Claim sheet for ${r.asset.tag}`}>
          <FileText aria-hidden="true" className="size-4" strokeWidth={2} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facilities"
        title="Warranty register"
        lede="Is it still covered, who stands behind it, and what is about to lapse."
        actions={
          <Button variant="ghost" disabled={shown.length === 0} onClick={() => downloadCsv("warranties", CSV_COLUMNS, shown)}>
            <Download aria-hidden="true" className="size-4" strokeWidth={2} />
            CSV
          </Button>
        }
      >
        <Tabs items={tabs} value={band} onChange={(key) => f.update({ band: key === "all" ? null : key })} />
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          value={draft}
          onChange={(v) => {
            setDraft(v);
            f.update({ q: v.trim() ? v : null });
          }}
          placeholder="Search tag, serial, brand, vendor"
          className="w-full sm:w-80"
        />
        <TowerFilter filters={f} className="w-full sm:w-64" />
      </div>

      <div role="tabpanel" className="space-y-3">
        <p className="type-small text-muted">
          Bands do not overlap: {BAND_LABEL["30d"]} is 0 to 30 days left, {BAND_LABEL["90d"]} is 31 to 90, {BAND_LABEL["365d"]} is 91 to 365, Active is more than a year. Open WOs counts orders still open that were reported while the warranty ran.
        </p>
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(r) => r.warranty.id}
          onRowClick={(r) => navigate(paths.asset(r.asset.id))}
          empty={
            <EmptyState
              icon={ShieldCheck}
              title={scoped.length === 0 ? "No warranties in this view" : "No warranties in this band"}
              body={scoped.length === 0 ? "Nothing matches the tower or search filters." : "Pick another band to see more."}
              action={
                <Button variant="ghost" size="sm" onClick={() => f.update({ band: null, q: null, tower: null })}>
                  Clear filters
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}

